import re
from functools import lru_cache
from typing import Any, Literal

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

try:
    from backend.app.graph_nodes import (
        clarification_node,
        final_report_node,
        gap_analysis_node,
        input_validation_node,
        job_posting_analysis_node,
        project_recommendation_node,
        rag_retrieval_node,
        roadmap_generation_node,
        tool_selection_node,
        user_profile_analysis_node,
    )
    from backend.app.graph_state import GraphState
    from backend.app.memory import session_store
    from backend.app.middleware import sanitize_text
    from backend.app.schemas import JobFitRequest
except ModuleNotFoundError:
    from app.graph_nodes import (
        clarification_node,
        final_report_node,
        gap_analysis_node,
        input_validation_node,
        job_posting_analysis_node,
        project_recommendation_node,
        rag_retrieval_node,
        roadmap_generation_node,
        tool_selection_node,
        user_profile_analysis_node,
    )
    from app.graph_state import GraphState
    from app.memory import session_store
    from app.middleware import sanitize_text
    from app.schemas import JobFitRequest


ValidationRoute = Literal["clarification", "analyze"]
GapRoute = Literal["clarification", "recommend"]


def route_after_validation(state: GraphState) -> ValidationRoute:
    # 입력 부족하면 바로 질문으로 보내는 분기
    validation = state.get("validation_result", {})
    if state.get("errors") or validation.get("missing_fields"):
        return "clarification"
    return "analyze"


def route_after_gap_analysis(state: GraphState) -> GapRoute:
    # 갭 분석 후 추천까지 갈지, 정보 더 받을지 정하는 분기
    validation = state.get("validation_result", {})
    gap = state.get("gap_analysis", {})
    missing_critical_context = (
        validation.get("needs_job_posting_detail")
        and validation.get("needs_user_experience_detail")
    )
    if state.get("errors") or missing_critical_context or not gap.get("missing_skills"):
        return "clarification"
    return "recommend"


@lru_cache(maxsize=2)
def get_workflow(use_memory: bool = False) -> Any:
    # LangGraph StateGraph 실제 연결 부분
    builder = StateGraph(GraphState)

    builder.add_node("input_validation", input_validation_node)
    builder.add_node("job_posting_analysis", job_posting_analysis_node)
    builder.add_node("user_profile_analysis", user_profile_analysis_node)
    builder.add_node("rag_retrieval", rag_retrieval_node)
    builder.add_node("gap_analysis", gap_analysis_node)
    builder.add_node("tool_selection", tool_selection_node)
    builder.add_node("project_recommendation", project_recommendation_node)
    builder.add_node("roadmap_generation", roadmap_generation_node)
    builder.add_node("final_report", final_report_node)
    builder.add_node("clarification", clarification_node)

    builder.add_edge(START, "input_validation")
    # conditional edge 1: 입력 검증 결과로 갈림
    builder.add_conditional_edges(
        "input_validation",
        route_after_validation,
        {"clarification": "clarification", "analyze": "job_posting_analysis"},
    )
    builder.add_edge("job_posting_analysis", "user_profile_analysis")
    builder.add_edge("user_profile_analysis", "rag_retrieval")
    builder.add_edge("rag_retrieval", "gap_analysis")
    # conditional edge 2: 분석 결과가 부족하면 추가 질문으로 감
    builder.add_conditional_edges(
        "gap_analysis",
        route_after_gap_analysis,
        {"clarification": "clarification", "recommend": "tool_selection"},
    )
    builder.add_edge("tool_selection", "project_recommendation")
    builder.add_edge("project_recommendation", "roadmap_generation")
    builder.add_edge("roadmap_generation", "final_report")
    builder.add_edge("final_report", END)
    builder.add_edge("clarification", END)

    if use_memory:
        return builder.compile(checkpointer=MemorySaver())
    return builder.compile()


def run_jobfit_agent(input_data: JobFitRequest, session_id: str | None = None) -> GraphState:
    # MVP memory: in-memory only. Server restart clears this state.
    # session_id 기준으로 이전 입력을 이어받는 부분
    thread_id = session_id or input_data.session_id or "default"
    previous_state = session_store.get_state(thread_id)
    state = _merge_with_session_state(input_data.model_dump(), previous_state)
    state["session_id"] = thread_id
    state["chat_history"] = session_store.get(thread_id)
    state["errors"] = []

    workflow = get_workflow(use_memory=True)
    result = workflow.invoke(state, config={"configurable": {"thread_id": thread_id}})

    session_store.append(thread_id, "user", sanitize_text(input_data.user_message))
    session_store.append(thread_id, "assistant", _assistant_memory_text(result))
    result["chat_history"] = session_store.get(thread_id)
    session_store.save_state(thread_id, result)
    return result


def get_workflow_mermaid() -> str:
    return get_workflow().get_graph().draw_mermaid()


def _merge_with_session_state(current: dict[str, Any], previous: dict[str, Any]) -> GraphState:
    # 멀티턴에서 비어있는 값은 이전 턴 값 재사용
    merged: GraphState = {}
    carried_fields = [
        "job_posting",
        "company_values",
        "user_skills",
        "user_projects",
        "self_intro",
        "target_role",
        "preparation_weeks",
        "preferred_project_type",
        "current_level",
    ]

    for field in carried_fields:
        value = current.get(field)
        merged[field] = value if value not in (None, "", []) else previous.get(field)

    merged["user_message"] = current.get("user_message") or ""
    merged["session_id"] = current.get("session_id") or previous.get("session_id")

    parsed_weeks = _parse_weeks(merged["user_message"])
    if parsed_weeks:
        merged["preparation_weeks"] = parsed_weeks

    if _looks_like_profile_update(merged["user_message"]):
        previous_intro = merged.get("self_intro") or ""
        merged["self_intro"] = f"{previous_intro}\n{merged['user_message']}".strip()

    return merged


def _parse_weeks(message: str) -> int | None:
    match = re.search(r"(\d{1,2})\s*(?:주|weeks?)", message, flags=re.IGNORECASE)
    if not match:
        return None
    return min(max(int(match.group(1)), 1), 52)


def _looks_like_profile_update(message: str) -> bool:
    return any(word in message for word in ["경험", "해봤", "사용", "없어", "없습니다", "있어", "있습니다"])


def _assistant_memory_text(state: GraphState) -> str:
    final_report = state.get("final_report", {})
    if isinstance(final_report.get("message"), str):
        return sanitize_text(final_report["message"])

    report_json = final_report.get("json", {})
    if isinstance(report_json, dict) and report_json.get("summary"):
        return sanitize_text(str(report_json["summary"]))

    return "JobFit 분석을 완료했습니다."
