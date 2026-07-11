import json
from typing import Any, Literal

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

try:
    from backend.app.config import get_settings
    from backend.app.memory import session_store
    from backend.app.middleware import validate_user_message
    from backend.app.schemas import (
        AgentStructuredResult,
        ChatRequest,
        ChatResponse,
        GapItem,
        ProjectPlan,
        RoadmapWeek,
        get_result_parser,
    )
    from backend.app.tools import JOBFIT_TOOLS
except ModuleNotFoundError:
    from app.config import get_settings
    from app.memory import session_store
    from app.middleware import validate_user_message
    from app.schemas import (
        AgentStructuredResult,
        ChatRequest,
        ChatResponse,
        GapItem,
        ProjectPlan,
        RoadmapWeek,
        get_result_parser,
    )
    from app.tools import JOBFIT_TOOLS


Intent = Literal["full", "project", "roadmap", "blocked"]


class AgentState(TypedDict, total=False):
    session_id: str
    user_message: str
    profile: dict[str, Any]
    safe_message: str
    history: list[dict[str, str]]
    intent: Intent
    selected_tools: list[str]
    tool_results: dict[str, str]
    rag_sources: list[str]
    errors: list[str]
    result: AgentStructuredResult
    answer: str


TOOLS_BY_NAME = {tool_item.name: tool_item for tool_item in JOBFIT_TOOLS}


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def load_memory_node(state: AgentState) -> AgentState:
    return {"history": session_store.get(state["session_id"])}


def guardrail_node(state: AgentState) -> AgentState:
    try:
        return {"safe_message": validate_user_message(state["user_message"])}
    except ValueError as exc:
        return {"errors": [str(exc)], "intent": "blocked"}


def route_after_guardrail(state: AgentState) -> str:
    return "blocked" if state.get("errors") else "continue"


def select_tools_node(state: AgentState) -> AgentState:
    message = state["safe_message"].lower()

    if any(word in message for word in ["로드맵", "학습", "계획", "몇 주"]):
        intent: Intent = "roadmap"
    elif any(word in message for word in ["프로젝트", "포트폴리오", "추천"]):
        intent = "project"
    else:
        intent = "full"

    selected = ["search_jobfit_knowledge", "analyze_gap", "recommend_project"]
    if intent in {"full", "roadmap"}:
        selected.append("generate_roadmap")

    return {"intent": intent, "selected_tools": selected}


def execute_tools_node(state: AgentState) -> AgentState:
    results: dict[str, str] = {}
    rag_sources: list[str] = []

    for tool_name in state["selected_tools"]:
        tool_item = TOOLS_BY_NAME[tool_name]

        if tool_name == "search_jobfit_knowledge":
            output = tool_item.invoke({"query": state["safe_message"]})
            try:
                rag_sources = [
                    f"{item['source']}:{item['title']}"
                    for item in json.loads(output)
                    if isinstance(item, dict)
                ]
            except json.JSONDecodeError:
                rag_sources = ["jobfit_knowledge.md"]
        elif tool_name == "analyze_gap":
            output = tool_item.invoke(
                {
                    "input_text": _json(
                        {
                            "message": state["safe_message"],
                            "context": results.get("search_jobfit_knowledge", ""),
                            "profile": state.get("profile", {}),
                        },
                    ),
                },
            )
        elif tool_name == "recommend_project":
            output = tool_item.invoke(
                {
                    "input_text": _json(
                        {
                            "message": state["safe_message"],
                            "gaps": results.get("analyze_gap", ""),
                            "level": state.get("profile", {}).get("current_level", "중급"),
                            "period": state.get("profile", {}).get("period", "4주"),
                        },
                    ),
                },
            )
        else:
            project_title = "추천 프로젝트"
            try:
                projects = json.loads(results.get("recommend_project", "[]"))
                if projects:
                    project_title = projects[0].get("title", project_title)
            except json.JSONDecodeError:
                pass

            output = tool_item.invoke(
                {
                    "input_text": _json(
                        {
                            "project_title": project_title,
                            "period": state.get("profile", {}).get("period", "4주"),
                        },
                    ),
                },
            )

        results[tool_name] = output

    return {"tool_results": results, "rag_sources": rag_sources}


def _deterministic_result(state: AgentState) -> AgentStructuredResult:
    tool_results = state.get("tool_results", {})

    gaps = [
        GapItem(**item)
        for item in json.loads(tool_results.get("analyze_gap", "[]"))
    ]
    projects = [
        ProjectPlan(**item)
        for item in json.loads(tool_results.get("recommend_project", "[]"))
    ]
    roadmap = [
        RoadmapWeek(**item)
        for item in json.loads(tool_results.get("generate_roadmap", "[]"))
    ]

    return AgentStructuredResult(
        summary="입력 요청, 세션 이력, 로컬 RAG 문서, Tool 실행 결과를 종합한 JobFit 분석입니다.",
        gap_items=gaps,
        projects=projects,
        roadmap=roadmap,
        cautions=[
            "AI 분석은 참고 자료이며 합격이나 취업 성공을 보장하지 않습니다.",
            "입력하지 않은 경험을 실제 수행한 것처럼 표현하지 마세요.",
        ],
    )


def _llm_result_or_none(state: AgentState) -> AgentStructuredResult | None:
    settings = get_settings()
    if settings.backend_mock or not settings.openai_api_key:
        return None

    parser = get_result_parser()
    prompt = PromptTemplate.from_template(
        """너는 취업 준비생을 돕는 JobFit Agent다.
아래 Tool 실행 결과와 대화 이력을 바탕으로 한국어 구조화 결과를 생성해라.
취업 성공을 보장하지 말고, 입력 근거가 약한 내용은 주의사항으로 분리해라.

대화 이력:
{history}

사용자 요청:
{message}

Tool 실행 결과:
{tool_results}

출력 형식:
{format_instructions}
""",
    )
    model = ChatOpenAI(
        model=settings.openai_model,
        temperature=0,
        api_key=settings.openai_api_key,
    )
    chain = prompt | model.with_structured_output(AgentStructuredResult)

    try:
        result = chain.invoke(
            {
                "history": _json(state.get("history", [])),
                "message": state["safe_message"],
                "tool_results": _json(state.get("tool_results", {})),
                "format_instructions": parser.get_format_instructions(),
            },
        )
        return result if isinstance(result, AgentStructuredResult) else None
    except Exception:
        return None


def compose_error_node(state: AgentState) -> AgentState:
    result = AgentStructuredResult(
        summary="입력 검증을 통과하지 못했습니다.",
        gap_items=[],
        projects=[],
        roadmap=[],
        cautions=state.get("errors", ["요청을 다시 확인해 주세요."]),
    )
    return {"result": result, "answer": result.summary}


def compose_answer_node(state: AgentState) -> AgentState:
    result = _llm_result_or_none(state) or _deterministic_result(state)
    answer = (
        f"{result.summary}\n"
        f"- 부족 역량: {len(result.gap_items)}개\n"
        f"- 추천 프로젝트: {len(result.projects)}개\n"
        f"- 로드맵: {len(result.roadmap)}주"
    )
    return {"result": result, "answer": answer}


def save_memory_node(state: AgentState) -> AgentState:
    session_store.append(state["session_id"], "user", state["user_message"])
    session_store.append(state["session_id"], "assistant", state["answer"])
    return {"history": session_store.get(state["session_id"])}


def build_graph():
    builder = StateGraph(AgentState)
    builder.add_node("load_memory", load_memory_node)
    builder.add_node("guardrail", guardrail_node)
    builder.add_node("select_tools", select_tools_node)
    builder.add_node("execute_tools", execute_tools_node)
    builder.add_node("compose_answer", compose_answer_node)
    builder.add_node("compose_error", compose_error_node)
    builder.add_node("save_memory", save_memory_node)

    builder.add_edge(START, "load_memory")
    builder.add_edge("load_memory", "guardrail")
    builder.add_conditional_edges(
        "guardrail",
        route_after_guardrail,
        {"continue": "select_tools", "blocked": "compose_error"},
    )
    builder.add_edge("select_tools", "execute_tools")
    builder.add_edge("execute_tools", "compose_answer")
    builder.add_edge("compose_answer", "save_memory")
    builder.add_edge("compose_error", "save_memory")
    builder.add_edge("save_memory", END)
    return builder.compile()


agent_graph = build_graph()


def run_agent(request: ChatRequest) -> ChatResponse:
    input_state = request.model_dump()
    input_state["user_message"] = input_state.pop("message")
    state = agent_graph.invoke(input_state)
    result = state["result"]

    return ChatResponse(
        session_id=state["session_id"],
        answer=state["answer"],
        result=result,
        used_tools=state.get("selected_tools", []),
        rag_sources=state.get("rag_sources", []),
        memory_turns=len(state.get("history", [])),
    )


def get_workflow_mermaid() -> str:
    return agent_graph.get_graph().draw_mermaid()
