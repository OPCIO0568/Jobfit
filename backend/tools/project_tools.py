import json

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

try:
    from backend.rag.retriever import retrieve_jobfit_context
except ModuleNotFoundError:
    from rag.retriever import retrieve_jobfit_context  # type: ignore[no-redef]

try:
    from backend.tools.expert_prompts import PROJECT_MENTOR_PROMPT, RAG_RESEARCHER_PROMPT
except ModuleNotFoundError:
    from tools.expert_prompts import PROJECT_MENTOR_PROMPT, RAG_RESEARCHER_PROMPT  # type: ignore[no-redef]


class SearchJobFitRagInput(BaseModel):
    query: str = Field(description="검색할 직무, 역량, 프로젝트 관련 질문입니다.")
    k: int = Field(default=4, ge=1, le=10, description="반환할 RAG chunk 개수입니다.")


class RecommendProjectInput(BaseModel):
    missing_skills: list[str] = Field(description="부족하거나 증명 근거가 약한 역량 목록입니다.")
    target_role: str = Field(description="사용자의 목표 직무입니다.")
    preparation_weeks: int = Field(default=4, ge=1, le=52, description="사용자의 준비 가능 기간입니다.")
    user_level: str = Field(default="중급", description="사용자의 현재 수준입니다. 예: 입문, 중급, 고급.")
    gap_evidence: list[str] = Field(default_factory=list, description="역량 갭 판단 근거 목록입니다.")
    user_projects: str = Field(default="", description="사용자가 입력한 기존 프로젝트 경험입니다.")
    preferred_project_type: str = Field(default="상관없음", description="개인, 팀, 상관없음 등 프로젝트 선호 방식입니다.")
    rag_context: list[str] = Field(default_factory=list, description="RAG 검색으로 얻은 직무 지식 chunk입니다.")


def _search_jobfit_rag(query: str, k: int = 4) -> str:
    # RAG 문서 검색 Tool 본체
    try:
        chunks = retrieve_jobfit_context(query, k)
        return _json({"query": query, "chunks": chunks, "warning": None if chunks else "검색 결과가 비어 있습니다."})
    except Exception as exc:
        return _json({"query": query, "chunks": [], "warning": f"RAG 검색 실패: {exc.__class__.__name__}"})


def _recommend_project(
    missing_skills: list[str],
    target_role: str,
    preparation_weeks: int = 4,
    user_level: str = "중급",
    gap_evidence: list[str] | None = None,
    user_projects: str = "",
    preferred_project_type: str = "상관없음",
    rag_context: list[str] | None = None,
) -> str:
    # 부족역량/직무/기간을 보고 프로젝트 3개 만드는 Tool 본체
    try:
        basis_text = " ".join([target_role, " ".join(missing_skills), " ".join(gap_evidence or []), " ".join(rag_context or [])])
        role = _detect_role(target_role) or _detect_role(basis_text) or "backend"
        skills = _compact_skills(missing_skills)
        projects = _project_set(
            role,
            skills,
            preparation_weeks,
            user_level,
            gap_evidence or [],
            user_projects,
            preferred_project_type,
        )
        return _json(
            {
                "target_role": target_role,
                "basis": {
                    "missing_skills": skills,
                    "user_level": user_level,
                    "preparation_weeks": preparation_weeks,
                    "preferred_project_type": preferred_project_type,
                    "rag_chunks_used": len(rag_context or []),
                },
                "projects": projects,
                "caution": "추천은 공고와 입력 경험을 바탕으로 한 준비 방향이며 합격을 보장하지 않습니다.",
            },
        )
    except Exception as exc:
        return _json({"projects": [], "warning": f"프로젝트 추천 실패: {exc.__class__.__name__}"})


def _detect_role(text: str) -> str:
    # 목표 직무가 백엔드/인프라/임베디드 중 어디인지 대충 판단
    lower = text.lower()
    if any(word in lower for word in ["임베디드", "embedded", "uart", "can", "freertos", "mcu", "rtos"]):
        return "embedded"
    if any(word in lower for word in ["백엔드", "backend", "api", "server", "서버"]):
        return "backend"
    if any(word in lower for word in ["인프라", "infra", "linux", "nginx", "monitoring", "모니터링", "네트워크"]):
        return "infra"
    return ""


def _compact_skills(skills: list[str]) -> list[str]:
    cleaned = [skill.strip() for skill in skills if skill and len(skill.strip()) >= 2]
    return list(dict.fromkeys(cleaned))[:6] or ["직무 요구역량 증명"]


def _project_set(
    role: str,
    skills: list[str],
    weeks: int,
    level: str,
    gap_evidence: list[str],
    user_projects: str,
    preferred_type: str,
) -> list[dict[str, object]]:
    # 직무별 프로젝트 템플릿. 여기 바꾸면 추천 프로젝트가 바뀜
    short_weeks = min(max(1, weeks // 3 or 1), 2)
    mid_weeks = min(max(3, weeks // 2), 6)
    long_weeks = min(max(6, weeks), 12)
    context = " ".join(skills + gap_evidence).lower()
    experience = _experience_anchor(user_projects)
    style = preferred_type if preferred_type in {"개인", "팀"} else "개인 또는 팀"

    if role == "embedded":
        specs = [
            (
                "센서 로그 수집 및 오류 재현 도구",
                ["C", "UART", "GPIO", "CSV 로그"],
                "센서/시리얼 입력을 수집하고 비정상 값을 재현 가능한 로그로 남기는 도구",
                ["입력 데이터 수집", "오류 조건 재현", "CSV 로그 저장", "README에 재현 절차 작성"],
            ),
            (
                "CAN 메시지 모니터링 및 상태 진단 프로젝트",
                ["C/C++", "CAN", "상태 머신", "테스트 로그"],
                "CAN 메시지를 파싱해 상태 변화를 기록하고 장애 조건을 문서화하는 프로젝트",
                ["메시지 파서", "상태 전이표", "오류 프레임 샘플", "테스트 로그"],
            ),
            (
                "FreeRTOS 기반 태스크 상태 진단 모니터",
                ["FreeRTOS", "Queue", "Watchdog", "Runtime Stats"],
                "태스크 지연, 큐 적체, watchdog 위험을 관찰하고 리포트하는 임베디드 운영 진단 프로젝트",
                ["태스크 상태 수집", "큐 적체 감지", "watchdog 위험 로그", "운영 리포트"],
            ),
        ]
    elif role == "infra":
        specs = [
            (
                "Linux 서버 점검 자동화 스크립트",
                ["Linux", "Shell", "Python", "로그 분석"],
                "CPU, 메모리, 디스크, 포트 상태를 점검하고 조치 기준을 출력하는 운영 자동화 도구",
                ["서버 상태 점검", "로그 요약", "위험 기준 출력", "운영 체크리스트"],
            ),
            (
                "Docker + Nginx 배포와 장애 복구 실습",
                ["Docker", "Nginx", "Reverse Proxy", "배포 문서"],
                "컨테이너 서비스 배포, 프록시 설정, 장애 상황 복구 절차를 증명하는 프로젝트",
                ["컨테이너 배포", "프록시 설정", "장애 재현", "복구 절차 문서"],
            ),
            (
                "모니터링 지표 기반 장애 대응 대시보드",
                ["Prometheus", "Grafana", "로그", "알림 기준"],
                "운영 지표를 수집하고 장애 징후를 대시보드와 대응 문서로 연결하는 프로젝트",
                ["지표 수집", "대시보드", "알림 기준", "장애 대응 Runbook"],
            ),
        ]
    else:
        specs = _backend_specs(context)

    return [
        # 단기는 1순위 역량만, 중급/고급은 점점 범위 늘림
        _project(specs[0], "입문", short_weeks, skills[:1], level, experience, style),
        _project(specs[1], "중급", mid_weeks, skills[:3], level, experience, style),
        _project(specs[2], "고급", long_weeks, skills, level, experience, style),
    ]


def _backend_specs(context: str) -> list[tuple[str, list[str], str, list[str]]]:
    has_ops = any(word in context for word in ["로그", "운영", "배포", "장애", "문제 추적", "monitoring", "logging"])
    has_collab = any(word in context for word in ["git", "협업", "리뷰", "코드리뷰", "커뮤니케이션", "pr"])
    has_test = any(word in context for word in ["test", "테스트", "검증", "품질"])

    if has_ops and has_collab:
        return [
            (
                "REST API 로그 추적 미니 서버",
                ["FastAPI", "Structured Logging", "pytest", "OpenAPI"],
                "기존 REST API 경험 위에 요청 ID, 에러 로그, 실패 케이스를 붙여 문제 추적 근거를 만드는 프로젝트",
                ["요청 ID 미들웨어", "에러 응답 표준화", "실패 케이스 테스트", "로그 샘플 문서"],
            ),
            (
                "PR 리뷰 흐름이 포함된 장애 추적 백엔드",
                ["FastAPI", "PostgreSQL", "Docker", "GitHub Flow"],
                "이슈 등록, API 변경, PR 리뷰 체크리스트, 장애 로그 기록을 하나의 포트폴리오 흐름으로 연결하는 프로젝트",
                ["이슈/장애 API", "PR 템플릿", "코드리뷰 체크리스트", "Docker 실행 환경", "API 테스트"],
            ),
            (
                "비동기 작업 큐와 운영 관측 백엔드",
                ["Redis", "Queue", "Logging", "Metrics", "Docker Compose"],
                "오래 걸리는 작업의 실패, 재시도, 로그 추적, 리뷰 가능한 변경 이력을 운영 관점에서 보여주는 고급 프로젝트",
                ["작업 큐", "재시도 정책", "운영 로그", "간단한 메트릭", "장애 대응 Runbook"],
            ),
        ]

    if has_ops:
        return [
            (
                "API 에러 로그 추적 미니 프로젝트",
                ["FastAPI", "Logging", "pytest", "OpenAPI"],
                "API 요청 실패를 재현하고 로그로 원인을 추적하는 단기 백엔드 프로젝트",
                ["에러 케이스 3개", "로그 포맷", "테스트 결과", "README 재현 절차"],
            ),
            (
                "장애 재현 가능한 API 운영 로그 분석 서비스",
                ["FastAPI", "PostgreSQL", "Docker", "Structured Logging"],
                "배포 환경을 가정해 요청 로그, 에러 로그, 장애 원인 분석 흐름을 남기는 실무형 프로젝트",
                ["로그 저장 API", "장애 재현 시나리오", "Docker 실행", "분석 리포트"],
            ),
            (
                "비동기 분석 작업 큐와 실패 복구 백엔드",
                ["Redis", "Queue", "Retry", "Monitoring"],
                "오래 걸리는 작업을 큐로 처리하고 실패/재시도/복구 기준을 문서화하는 고급 프로젝트",
                ["큐 워커", "재시도 정책", "실패 로그", "운영 체크리스트"],
            ),
        ]

    if has_collab:
        return [
            (
                "Git PR 리뷰 체크리스트 API",
                ["FastAPI", "Git", "OpenAPI", "pytest"],
                "API 변경 사항을 PR 단위로 설명하고 리뷰 체크리스트를 남기는 협업 증명 프로젝트",
                ["PR 템플릿", "리뷰 체크리스트 API", "테스트", "변경 이력 문서"],
            ),
            (
                "팀 협업 이슈 트래커 백엔드",
                ["FastAPI", "PostgreSQL", "Docker", "GitHub Flow"],
                "역할 분담, 이슈 상태, 리뷰 기록을 API와 README로 보여주는 포트폴리오 프로젝트",
                ["이슈 API", "역할/상태 모델", "Docker 실행", "리뷰 시나리오"],
            ),
            (
                "릴리즈 변경 이력과 코드리뷰 운영 백엔드",
                ["FastAPI", "SQL", "CI", "Release Note"],
                "코드리뷰, 테스트 통과, 릴리즈 노트를 연결해 협업과 품질 관리를 증명하는 고급 프로젝트",
                ["CI 체크", "릴리즈 노트", "리뷰 로그", "품질 기준 문서"],
            ),
        ]

    if has_test:
        return [
            (
                "API 테스트 케이스 미니 서버",
                ["FastAPI", "pytest", "Pydantic", "OpenAPI"],
                "성공/실패 요청을 테스트로 검증해 API 품질 근거를 남기는 프로젝트",
                ["입력 검증", "테스트 케이스", "OpenAPI 문서", "실패 응답 표"],
            ),
            (
                "계약 테스트 기반 백엔드 검증 프로젝트",
                ["FastAPI", "PostgreSQL", "pytest", "Docker"],
                "API 계약, DB 상태, 예외 응답을 테스트로 검증하는 중급 프로젝트",
                ["계약 테스트", "DB 테스트", "Docker 실행", "테스트 리포트"],
            ),
            (
                "CI 품질 게이트가 있는 API 서버",
                ["GitHub Actions", "pytest", "Lint", "Coverage"],
                "테스트와 정적 검사를 CI에 연결해 품질 관리 역량을 증명하는 고급 프로젝트",
                ["CI workflow", "커버리지 기준", "품질 실패 사례", "개선 문서"],
            ),
        ]

    return [
            (
                "채용공고 분석 API 검증 서버",
                ["FastAPI", "Pydantic", "OpenAPI", "테스트"],
                "채용공고 텍스트를 구조화하고 입력 검증, 에러 응답, API 문서까지 증명하는 백엔드 프로젝트",
                ["공고 입력 API", "스키마 검증", "에러 응답", "OpenAPI 문서"],
            ),
            (
                "역량 갭 분석 백엔드와 리포트 생성기",
                ["SQL", "FastAPI", "Markdown Export", "API Test"],
                "사용자 경험과 공고 요구사항을 비교해 리포트로 내보내는 실무형 백엔드 프로젝트",
                ["분석 API", "결과 저장 모델", "Markdown 리포트", "API 테스트"],
            ),
            (
                "비동기 분석 작업 큐와 운영 로그 프로젝트",
                ["Redis", "Queue", "Logging", "Monitoring"],
                "오래 걸리는 분석 작업을 큐로 처리하고 실패/재시도/로그를 운영 관점에서 보여주는 프로젝트",
                ["작업 큐", "상태 조회 API", "실패 로그", "운영 문서"],
            ),
        ]


def _project(
    spec: tuple[str, list[str], str, list[str]],
    difficulty: str,
    weeks: int,
    skills: list[str],
    level: str,
    experience: str,
    style: str,
) -> dict[str, object]:
    # 화면에 내려줄 프로젝트 카드 데이터 만드는 부분
    title, stack, description, scope = spec
    target_skills = list(dict.fromkeys(skills + stack))[:8]
    return {
        "title": title,
        "difficulty": difficulty,
        "estimated_weeks": weeks,
        "target_skills": target_skills,
        "description": (
            f"{description}. {experience} 현재 수준({level})과 선호 방식({style})을 고려해 "
            "공부가 아니라 실행 가능한 산출물로 증명하는 데 초점을 둡니다."
        ),
        "required_outputs": [
            *scope[:4],
            "README: 문제 정의, 실행 방법, 검증 결과, 기술 선택 근거",
        ][:5],
        "portfolio_points": [
            f"{', '.join(target_skills[:3])}를 왜 사용했는지 설명",
            f"{title}에서 다룬 실패 케이스와 예외 처리 방식",
            "공고 요구역량과 프로젝트 산출물의 연결성",
            "기존 경험에서 무엇을 확장했는지 명확히 설명",
        ],
        "reduced_scope": f"시간이 부족하면 '{scope[0]}'와 README 검증 결과만 먼저 완성합니다.",
        "risk_notes": [
            "기능 수를 늘리기보다 공고 요구역량 1~2개를 확실히 증명해야 합니다.",
            "테스트, 로그, PR 기록 중 하나라도 없으면 면접에서 증명력이 약해집니다.",
        ],
    }


def _experience_anchor(user_projects: str) -> str:
    text = user_projects.strip()
    if not text:
        return "기존 프로젝트 근거가 짧으므로 작은 범위부터 시작합니다."
    if any(word in text.lower() for word in ["api", "rest", "fastapi", "spring"]):
        return "기존 REST API 구현 경험을 출발점으로 삼습니다."
    if any(word in text.lower() for word in ["docker", "배포", "운영"]):
        return "기존 배포/실행 환경 경험을 확장합니다."
    return "기존 프로젝트 경험과 연결 가능한 범위로 제한합니다."


def _json(value: dict[str, object]) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


search_jobfit_rag_tool = StructuredTool.from_function(
    name="search_jobfit_rag_tool",
    func=_search_jobfit_rag,
    args_schema=SearchJobFitRagInput,
    description=(
        f"{RAG_RESEARCHER_PROMPT}\n\n"
        "프로젝트 추천, 역량 갭 분석, 면접 준비에 필요한 로컬 JobFit RAG 문서 chunk를 검색할 때 사용한다."
    ),
)

recommend_project_tool = StructuredTool.from_function(
    name="recommend_project_tool",
    func=_recommend_project,
    args_schema=RecommendProjectInput,
    description=(
        f"{PROJECT_MENTOR_PROMPT}\n\n"
        "부족 역량, 목표 직무, 준비 기간, 사용자 수준, RAG 근거를 바탕으로 "
        "입문/중급/고급 추천 프로젝트 3개와 산출물, 축소 버전을 만들 때 사용한다."
    ),
)
