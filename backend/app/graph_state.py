from typing import Any, Literal, TypedDict


NextAction = Literal[
    "clarify",
    "job_posting_analysis",
    "user_profile_analysis",
    "rag_retrieval",
    "gap_analysis",
    "project_recommendation",
    "roadmap_generation",
    "final_report",
    "done",
    "error",
]


class ChatMessage(TypedDict):
    role: str
    content: str


class GraphState(TypedDict, total=False):
    session_id: str | None
    user_message: str
    job_posting: str | None
    company_values: str | None
    user_skills: list[str] | None
    user_projects: str | None
    self_intro: str | None
    target_role: str | None
    preparation_weeks: int | None
    preferred_project_type: str | None
    current_level: str | None
    chat_history: list[ChatMessage]
    validation_result: dict[str, Any]
    job_posting_analysis: dict[str, Any]
    user_profile_analysis: dict[str, Any]
    rag_context: list[str]
    gap_analysis: dict[str, Any]
    project_recommendations: list[dict[str, Any]]
    roadmap: dict[str, Any]
    final_report: dict[str, Any]
    next_action: NextAction
    errors: list[str]


PartialGraphState = dict[str, Any]
