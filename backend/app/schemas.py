from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(description="API server status")
    app_env: str = Field(description="Current application environment")
    openai_model: str = Field(description="Configured chat model name")
    embedding_model: str = Field(description="Configured embedding model name")


class JobFitRequest(BaseModel):
    session_id: str | None = Field(
        default=None,
        description="멀티턴 대화 이력을 구분하기 위한 세션 ID입니다.",
    )
    user_message: str = Field(description="사용자가 자연어로 입력한 요청입니다.")
    job_posting: str | None = Field(
        default=None,
        description="목표 회사 또는 직무의 채용공고 원문입니다.",
    )
    company_values: str | None = Field(
        default=None,
        description="회사 인재상, 핵심 가치, 일하는 방식 관련 텍스트입니다.",
    )
    user_skills: list[str] | None = Field(
        default=None,
        description="사용자가 보유했다고 입력한 기술스택 목록입니다.",
    )
    user_projects: str | None = Field(
        default=None,
        description="사용자의 프로젝트 경험 서술입니다.",
    )
    self_intro: str | None = Field(
        default=None,
        description="자기소개서 또는 경험 기반 서술입니다.",
    )
    target_role: str | None = Field(
        default=None,
        description="사용자가 목표로 하는 직무명입니다.",
    )
    preparation_weeks: int | None = Field(
        default=None,
        ge=1,
        le=52,
        description="사용자가 준비 가능한 기간입니다. 단위는 주입니다.",
    )
    preferred_project_type: str | None = Field(
        default=None,
        description="선호 프로젝트 방식입니다. 예: 개인, 팀, 상관없음.",
    )
    current_level: str | None = Field(
        default=None,
        description="사용자의 현재 수준입니다. 예: 입문, 중급, 고급.",
    )


class JobPostingAnalysis(BaseModel):
    role_summary: str = Field(description="채용공고에서 파악한 목표 직무 요약입니다.")
    responsibilities: list[str] = Field(description="공고에 나타난 주요 담당업무입니다.")
    required_skills: list[str] = Field(description="공고 기반 필수 역량 목록입니다.")
    preferred_skills: list[str] = Field(description="공고 기반 우대 역량 목록입니다.")
    talent_keywords: list[str] = Field(description="회사 인재상 또는 가치관 키워드입니다.")
    requirement_categories: dict[str, list[str]] = Field(
        description="기술, 협업, 문서화, 도메인 등 범주별 요구역량입니다.",
    )
    evidence: list[str] = Field(description="공고 분석에 사용한 근거 문장 또는 요약입니다.")


class UserProfileAnalysis(BaseModel):
    confirmed_skills: list[str] = Field(description="사용자 입력에서 근거가 확인된 역량입니다.")
    inferred_skills: list[str] = Field(description="입력으로부터 추정 가능하지만 근거가 약한 역량입니다.")
    project_experience: list[str] = Field(description="사용자 프로젝트 경험에서 확인된 내용입니다.")
    collaboration_experience: list[str] = Field(description="협업 또는 커뮤니케이션 경험 근거입니다.")
    documentation_experience: list[str] = Field(description="문서화, README, 회고 등 산출물 근거입니다.")
    evidence_by_source: dict[str, list[str]] = Field(
        description="기술스택, 프로젝트, 자기소개서 등 입력 출처별 분석 근거입니다.",
    )
    weak_evidence: list[str] = Field(description="아직 증명 근거가 부족한 역량입니다.")


class GapAnalysis(BaseModel):
    strengths: list[str] = Field(description="공고 대비 사용자가 이미 보유한 강점입니다.")
    missing_skills: list[str] = Field(description="공고 대비 부족하거나 근거가 약한 역량입니다.")
    study_items: list[str] = Field(description="학습으로 보완해야 할 항목입니다.")
    project_items: list[str] = Field(description="프로젝트 산출물로 증명해야 할 항목입니다.")
    documentation_items: list[str] = Field(description="README, 회고, 테스트 기록 등 문서화할 항목입니다.")
    priority: list[str] = Field(description="가장 먼저 보완해야 할 우선순위 목록입니다.")
    risk_notes: list[str] = Field(description="분석 결과 사용 시 주의해야 할 위험 요소입니다.")
    evidence: list[str] = Field(description="갭 분석 판단에 사용한 근거입니다.")


class ProjectRecommendation(BaseModel):
    title: str = Field(description="추천 프로젝트명입니다.")
    difficulty: str = Field(description="프로젝트 난이도입니다. 예: 입문, 중급, 고급.")
    estimated_weeks: int = Field(description="프로젝트 예상 수행 기간입니다. 단위는 주입니다.")
    target_skills: list[str] = Field(description="프로젝트로 증명할 목표 역량입니다.")
    description: str = Field(description="프로젝트의 목적과 구현 방향 설명입니다.")
    required_outputs: list[str] = Field(description="필수로 남겨야 할 산출물 목록입니다.")
    portfolio_points: list[str] = Field(description="포트폴리오와 면접에서 어필할 포인트입니다.")
    reduced_scope: str = Field(description="시간이 부족할 때 수행할 축소 버전입니다.")
    risk_notes: list[str] = Field(description="프로젝트 진행 시 주의해야 할 위험 요소입니다.")


class RoadmapItem(BaseModel):
    week: int = Field(description="로드맵 주차입니다.")
    goal: str = Field(description="해당 주차의 핵심 목표입니다.")
    study_topics: list[str] = Field(description="해당 주차에 학습할 주제입니다.")
    practice_tasks: list[str] = Field(description="학습 내용을 검증할 실습 과제입니다.")
    project_tasks: list[str] = Field(description="해당 주차에 진행할 프로젝트 작업입니다.")
    outputs: list[str] = Field(description="해당 주차에 남겨야 할 산출물입니다.")
    completion_criteria: list[str] = Field(description="해당 주차 완료 기준입니다.")


class Roadmap(BaseModel):
    total_weeks: int = Field(description="전체 로드맵 기간입니다. 단위는 주입니다.")
    items: list[RoadmapItem] = Field(description="주차별 로드맵 항목입니다.")


class FinalReport(BaseModel):
    summary: str = Field(description="전체 분석 결과 요약입니다.")
    job_requirements: JobPostingAnalysis = Field(description="채용공고 요구역량 분석 결과입니다.")
    user_capabilities: UserProfileAnalysis = Field(description="사용자 보유 역량 분석 결과입니다.")
    gap_analysis: GapAnalysis = Field(description="공고와 사용자 경험 사이의 역량 갭 분석입니다.")
    project_recommendations: list[ProjectRecommendation] = Field(
        description="역량 갭을 보완하기 위한 추천 프로젝트 목록입니다.",
    )
    roadmap: Roadmap = Field(description="선택 기간 기준 학습 및 프로젝트 실행 로드맵입니다.")
    portfolio_checklist: list[str] = Field(description="최종 포트폴리오 산출물 체크리스트입니다.")
    cautions: list[str] = Field(description="AI 분석 한계와 사용 시 주의사항입니다.")


class AgentResponse(BaseModel):
    session_id: str = Field(description="응답이 속한 세션 ID입니다.")
    message: str = Field(description="사용자에게 표시할 자연어 응답 요약입니다.")
    report: FinalReport = Field(description="구조화된 최종 JobFit 분석 리포트입니다.")
    used_tools: list[str] = Field(description="Agent가 실행한 Tool 이름 목록입니다.")
    rag_sources: list[str] = Field(description="RAG 검색에 사용된 문서 출처 목록입니다.")
    memory_turns: int = Field(description="현재 세션에 저장된 대화 턴 수입니다.")


class ErrorResponse(BaseModel):
    error_code: str = Field(description="클라이언트가 분기 처리할 수 있는 에러 코드입니다.")
    message: str = Field(description="사용자에게 보여줄 안전한 에러 메시지입니다.")
    action: str | None = Field(
        default=None,
        description="사용자가 문제를 해결하기 위해 취할 수 있는 다음 행동입니다.",
    )


class ChatRequest(BaseModel):
    session_id: str = Field(
        default="default",
        description="이전 backend 초안에서 사용한 세션 ID입니다.",
    )
    message: str = Field(description="이전 backend 초안에서 사용한 사용자 요청입니다.")
    profile: dict[str, Any] = Field(
        default_factory=dict,
        description="이전 backend 초안에서 사용한 추가 사용자 프로필입니다.",
    )


class GapItem(BaseModel):
    capability: str = Field(description="부족하거나 보완할 역량명입니다.")
    level: str = Field(description="갭의 심각도 또는 우선순위입니다.")
    reason: str = Field(description="해당 갭으로 판단한 근거입니다.")


class ProjectPlan(BaseModel):
    title: str = Field(description="추천 프로젝트명입니다.")
    difficulty: str = Field(description="프로젝트 난이도입니다.")
    period: str = Field(description="프로젝트 예상 기간입니다.")
    reason: str = Field(description="프로젝트 추천 근거입니다.")
    outputs: list[str] = Field(description="프로젝트 산출물 목록입니다.")


class RoadmapWeek(BaseModel):
    week: str = Field(description="로드맵 주차 라벨입니다.")
    goal: str = Field(description="해당 주차의 목표입니다.")
    task: str = Field(description="해당 주차의 핵심 작업입니다.")
    output: str = Field(description="해당 주차의 산출물입니다.")


class AgentStructuredResult(BaseModel):
    summary: str = Field(description="Agent 구조화 응답 요약입니다.")
    gap_items: list[GapItem] = Field(description="역량 갭 항목 목록입니다.")
    projects: list[ProjectPlan] = Field(description="추천 프로젝트 목록입니다.")
    roadmap: list[RoadmapWeek] = Field(description="주차별 로드맵 목록입니다.")
    cautions: list[str] = Field(description="주의사항과 한계 목록입니다.")


class ChatResponse(BaseModel):
    session_id: str = Field(description="응답 세션 ID입니다.")
    answer: str = Field(description="사용자에게 표시할 자연어 응답입니다.")
    result: AgentStructuredResult = Field(description="Agent 구조화 응답입니다.")
    used_tools: list[str] = Field(description="실행한 Tool 이름 목록입니다.")
    rag_sources: list[str] = Field(description="참조한 RAG 문서 출처입니다.")
    memory_turns: int = Field(description="세션 메모리에 저장된 대화 턴 수입니다.")


def get_result_parser() -> Any:
    from langchain_core.output_parsers import PydanticOutputParser

    return PydanticOutputParser(pydantic_object=AgentStructuredResult)
