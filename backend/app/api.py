from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Body
from fastapi.responses import PlainTextResponse

try:
    from backend.app.config import get_settings
    from backend.app.graph_workflow import get_workflow_mermaid, run_jobfit_agent
    from backend.app.middleware import safe_error_response, sanitize_text
    from backend.app.schemas import (
        AgentResponse,
        ErrorResponse,
        FinalReport,
        GapAnalysis,
        HealthResponse,
        JobFitRequest,
        JobPostingAnalysis,
        ProjectRecommendation,
        Roadmap,
        RoadmapItem,
        UserProfileAnalysis,
    )
except ModuleNotFoundError:
    from app.config import get_settings
    from app.graph_workflow import get_workflow_mermaid, run_jobfit_agent
    from app.middleware import safe_error_response, sanitize_text
    from app.schemas import (
        AgentResponse,
        ErrorResponse,
        FinalReport,
        GapAnalysis,
        HealthResponse,
        JobFitRequest,
        JobPostingAnalysis,
        ProjectRecommendation,
        Roadmap,
        RoadmapItem,
        UserProfileAnalysis,
    )


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app_env=settings.app_env,
        openai_model=settings.openai_model,
        embedding_model=settings.embedding_model,
    )


@router.post("/agent/jobfit", response_model=AgentResponse | ErrorResponse)
def run_jobfit_endpoint(
    request: Annotated[JobFitRequest, Body(description="JobFit Agent 분석 요청")],
) -> AgentResponse | ErrorResponse:
    # FastAPI에서 LangGraph Agent 실행하는 메인 API
    session_id = request.session_id or str(uuid4())

    try:
        state = run_jobfit_agent(_sanitize_request(request, session_id), session_id)
        final_report = state.get("final_report", {})

        if "message" in final_report:
            return ErrorResponse(
                error_code="JOBFIT_NEEDS_MORE_INPUT",
                message=str(final_report["message"]),
                action="채용공고, 목표 직무, 사용자 프로젝트 경험을 보완한 뒤 다시 실행해 주세요.",
            )

        return AgentResponse(
            session_id=session_id,
            message=_response_message(),
            report=_build_final_report(state),
            used_tools=[
                "analyze_job_posting_tool",
                "search_jobfit_rag_tool",
                "recommend_project_tool",
                "generate_markdown_report_tool",
            ],
            rag_sources=_rag_sources(state.get("rag_context", [])),
            memory_turns=len(state.get("chat_history", [])),
        )
    except Exception:
        return safe_error_response("서버 처리 중 오류가 발생했습니다.")


@router.get("/agent/workflow-mermaid", response_class=PlainTextResponse)
def workflow_mermaid() -> str:
    # README/발표용 workflow mermaid 뽑는 API
    try:
        return get_workflow_mermaid()
    except Exception:
        return "graph TD\n  error[workflow mermaid 생성 실패]"


def _sanitize_request(request: JobFitRequest, session_id: str) -> JobFitRequest:
    # Agent로 넘기기 전에 입력값 한번 정리
    data = request.model_dump()
    for field in [
        "user_message",
        "job_posting",
        "company_values",
        "user_projects",
        "self_intro",
        "target_role",
        "preferred_project_type",
        "current_level",
    ]:
        if isinstance(data.get(field), str):
            data[field] = sanitize_text(data[field])
    data["session_id"] = session_id
    return JobFitRequest(**data)


def _response_message() -> str:
    if get_settings().openai_api_key:
        return "JobFit Agent 분석을 완료했습니다."
    return "OPENAI_API_KEY가 없어 로컬 RAG와 규칙 기반 fallback으로 분석했습니다."


def _build_final_report(state: dict) -> FinalReport:
    # graph state를 FastAPI 응답 모델에 맞게 바꾸는 부분
    report = state.get("final_report", {}).get("json", {})
    return FinalReport(
        summary=str(report.get("summary") or "JobFit 분석 결과입니다."),
        job_requirements=_job_requirements(state.get("job_posting_analysis", {})),
        user_capabilities=_user_capabilities(state.get("user_profile_analysis", {})),
        gap_analysis=_gap_analysis(state.get("gap_analysis", {})),
        project_recommendations=[_project(project) for project in state.get("project_recommendations", [])],
        roadmap=_roadmap(state.get("roadmap", {})),
        portfolio_checklist=_strings(
            report.get(
                "portfolio_checklist",
                ["README", "테스트 결과", "실행 로그", "기술 선택 근거"],
            ),
        ),
        cautions=_strings(
            report.get(
                "cautions",
                ["AI 분석은 참고용이며 취업 성공을 보장하지 않습니다."],
            ),
        ),
    )


def _job_requirements(data: dict) -> JobPostingAnalysis:
    technical = _strings(data.get("technical_keywords"))
    talent = _strings(data.get("talent_keywords"))
    return JobPostingAnalysis(
        role_summary=str(data.get("role_summary") or "채용공고 기반 요구사항 요약"),
        responsibilities=_strings(data.get("responsibilities")),
        required_skills=_strings(data.get("required_skills")),
        preferred_skills=_strings(data.get("preferred_skills")),
        talent_keywords=talent,
        requirement_categories={
            "기술": technical,
            "협업": _strings(data.get("requirement_categories", {}).get("협업")),
            "문서화": _strings(data.get("requirement_categories", {}).get("문서화")),
            "운영": _strings(data.get("requirement_categories", {}).get("운영")),
        },
        evidence=_strings(data.get("evidence")),
    )


def _user_capabilities(data: dict) -> UserProfileAnalysis:
    return UserProfileAnalysis(
        confirmed_skills=_strings(data.get("confirmed_skills")),
        inferred_skills=_strings(data.get("inferred_skills")),
        project_experience=_strings(data.get("project_experience")),
        collaboration_experience=_strings(data.get("collaboration_experience")),
        documentation_experience=_strings(data.get("documentation_experience")),
        evidence_by_source={
            "skills": _strings(data.get("evidence_by_source", {}).get("skills")),
            "projects": _strings(data.get("evidence_by_source", {}).get("projects")),
            "self_intro": _strings(data.get("evidence_by_source", {}).get("self_intro")),
        },
        weak_evidence=_strings(data.get("weak_evidence")),
    )


def _gap_analysis(data: dict) -> GapAnalysis:
    return GapAnalysis(
        strengths=_strings(data.get("strengths")),
        missing_skills=_strings(data.get("missing_skills")),
        study_items=_strings(data.get("study_items")),
        project_items=_strings(data.get("project_items")),
        documentation_items=_strings(data.get("documentation_items")),
        priority=_strings(data.get("priority")),
        risk_notes=_strings(data.get("risk_notes")),
        evidence=_strings(data.get("evidence")),
    )


def _project(data: dict) -> ProjectRecommendation:
    return ProjectRecommendation(
        title=str(data.get("title") or "추천 프로젝트"),
        difficulty=str(data.get("difficulty") or "중급"),
        estimated_weeks=int(data.get("estimated_weeks") or 4),
        target_skills=_strings(data.get("target_skills")),
        description=str(data.get("description") or "부족 역량 보완 프로젝트입니다."),
        required_outputs=_strings(data.get("required_outputs")),
        portfolio_points=_strings(data.get("portfolio_points")),
        reduced_scope=str(data.get("reduced_scope") or "핵심 기능만 먼저 구현합니다."),
        risk_notes=_strings(data.get("risk_notes")),
    )


def _roadmap(data: dict) -> Roadmap:
    return Roadmap(
        total_weeks=int(data.get("total_weeks") or 4),
        items=[
            RoadmapItem(
                week=int(item.get("week") or index + 1),
                goal=str(item.get("goal") or "주차 목표"),
                study_topics=_strings(item.get("study_topics")),
                practice_tasks=_strings(item.get("practice_tasks")),
                project_tasks=_strings(item.get("project_tasks")),
                outputs=_strings(item.get("outputs")),
                completion_criteria=_strings(item.get("completion_criteria")),
            )
            for index, item in enumerate(data.get("items", []))
        ],
    )


def _rag_sources(chunks: list[str]) -> list[str]:
    return [
        chunk.split("\n", 1)[0].strip("[]")
        for chunk in chunks
        if isinstance(chunk, str) and chunk.startswith("[source:")
    ]


def _strings(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return [str(value)] if str(value).strip() else []
