import json

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

try:
    from backend.rag.retriever import retrieve_jobfit_context
except ModuleNotFoundError:
    from rag.retriever import retrieve_jobfit_context  # type: ignore[no-redef]


class SearchJobFitRagInput(BaseModel):
    query: str = Field(description="검색할 직무, 역량, 프로젝트 관련 질문입니다.")
    k: int = Field(default=4, ge=1, le=10, description="반환할 RAG chunk 개수입니다.")


class RecommendProjectInput(BaseModel):
    missing_skills: list[str] = Field(description="부족하거나 증명 근거가 약한 역량 목록입니다.")
    target_role: str = Field(description="사용자의 목표 직무입니다.")
    preparation_weeks: int = Field(default=4, ge=1, le=52, description="사용자의 준비 가능 기간입니다.")
    user_level: str = Field(default="중급", description="사용자의 현재 수준입니다. 예: 입문, 중급, 고급.")
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
    rag_context: list[str] | None = None,
) -> str:
    # 부족역량/직무/기간을 보고 프로젝트 3개 만드는 Tool 본체
    try:
        basis_text = " ".join([target_role, " ".join(missing_skills), " ".join(rag_context or [])])
        role = _detect_role(target_role) or _detect_role(basis_text) or "backend"
        skills = _compact_skills(missing_skills)
        projects = _project_set(role, skills, preparation_weeks, user_level)
        return _json(
            {
                "target_role": target_role,
                "basis": {
                    "missing_skills": skills,
                    "user_level": user_level,
                    "preparation_weeks": preparation_weeks,
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
    if any(word in lower for word in ["인프라", "infra", "linux", "nginx", "monitoring", "모니터링", "네트워크"]):
        return "infra"
    if any(word in lower for word in ["백엔드", "backend", "api", "server", "서버"]):
        return "backend"
    return ""


def _compact_skills(skills: list[str]) -> list[str]:
    cleaned = [skill.strip() for skill in skills if skill and len(skill.strip()) >= 2]
    return list(dict.fromkeys(cleaned))[:6] or ["직무 요구역량 증명"]


def _project_set(role: str, skills: list[str], weeks: int, level: str) -> list[dict[str, object]]:
    # 직무별 프로젝트 템플릿. 여기 바꾸면 추천 프로젝트가 바뀜
    short_weeks = min(max(1, weeks // 3 or 1), 2)
    mid_weeks = min(max(3, weeks // 2), 6)
    long_weeks = min(max(6, weeks), 12)

    if role == "embedded":
        specs = [
            (
                "센서 로그 수집 및 오류 재현 도구",
                ["C", "UART", "GPIO", "CSV 로그"],
                "센서/시리얼 입력을 수집하고 비정상 값을 재현 가능한 로그로 남기는 도구",
            ),
            (
                "CAN 메시지 모니터링 및 상태 진단 프로젝트",
                ["C/C++", "CAN", "상태 머신", "테스트 로그"],
                "CAN 메시지를 파싱해 상태 변화를 기록하고 장애 조건을 문서화하는 프로젝트",
            ),
            (
                "FreeRTOS 기반 태스크 상태 진단 모니터",
                ["FreeRTOS", "Queue", "Watchdog", "Runtime Stats"],
                "태스크 지연, 큐 적체, watchdog 위험을 관찰하고 리포트하는 임베디드 운영 진단 프로젝트",
            ),
        ]
    elif role == "infra":
        specs = [
            (
                "Linux 서버 점검 자동화 스크립트",
                ["Linux", "Shell", "Python", "로그 분석"],
                "CPU, 메모리, 디스크, 포트 상태를 점검하고 조치 기준을 출력하는 운영 자동화 도구",
            ),
            (
                "Docker + Nginx 배포와 장애 복구 실습",
                ["Docker", "Nginx", "Reverse Proxy", "배포 문서"],
                "컨테이너 서비스 배포, 프록시 설정, 장애 상황 복구 절차를 증명하는 프로젝트",
            ),
            (
                "모니터링 지표 기반 장애 대응 대시보드",
                ["Prometheus", "Grafana", "로그", "알림 기준"],
                "운영 지표를 수집하고 장애 징후를 대시보드와 대응 문서로 연결하는 프로젝트",
            ),
        ]
    else:
        specs = [
            (
                "채용공고 분석 API 검증 서버",
                ["FastAPI", "Pydantic", "OpenAPI", "테스트"],
                "채용공고 텍스트를 구조화하고 입력 검증, 에러 응답, API 문서까지 증명하는 백엔드 프로젝트",
            ),
            (
                "역량 갭 분석 백엔드와 리포트 생성기",
                ["SQL", "FastAPI", "Markdown Export", "API Test"],
                "사용자 경험과 공고 요구사항을 비교해 리포트로 내보내는 실무형 백엔드 프로젝트",
            ),
            (
                "비동기 분석 작업 큐와 운영 로그 프로젝트",
                ["Redis", "Queue", "Logging", "Monitoring"],
                "오래 걸리는 분석 작업을 큐로 처리하고 실패/재시도/로그를 운영 관점에서 보여주는 프로젝트",
            ),
        ]

    return [
        # 단기는 1순위 역량만, 중급/고급은 점점 범위 늘림
        _project(specs[0], "입문", short_weeks, skills[:1], level),
        _project(specs[1], "중급", mid_weeks, skills[:3], level),
        _project(specs[2], "고급", long_weeks, skills, level),
    ]


def _project(spec: tuple[str, list[str], str], difficulty: str, weeks: int, skills: list[str], level: str) -> dict[str, object]:
    # 화면에 내려줄 프로젝트 카드 데이터 만드는 부분
    title, stack, description = spec
    target_skills = list(dict.fromkeys(skills + stack))[:8]
    return {
        "title": title,
        "difficulty": difficulty,
        "estimated_weeks": weeks,
        "target_skills": target_skills,
        "description": f"{description}. 현재 수준({level})에서 부족 역량을 산출물로 증명하는 데 초점을 둡니다.",
        "required_outputs": [
            "실행 가능한 코드",
            "README 실행 방법",
            "테스트 또는 검증 로그",
            "문제 상황과 해결 과정 문서",
            "기술 선택 근거",
        ],
        "portfolio_points": [
            f"{', '.join(target_skills[:3])}를 왜 사용했는지 설명",
            "실패 케이스와 예외 처리 방식",
            "공고 요구역량과 프로젝트 산출물의 연결성",
        ],
        "reduced_scope": "시간이 부족하면 핵심 기능 1개, 검증 로그, README만 먼저 완성합니다.",
        "risk_notes": [
            "기능을 많이 넣기보다 실행 가능한 산출물을 우선해야 합니다.",
            "테스트나 로그가 없으면 면접에서 증명력이 약해집니다.",
        ],
    }


def _json(value: dict[str, object]) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


search_jobfit_rag_tool = StructuredTool.from_function(
    name="search_jobfit_rag_tool",
    func=_search_jobfit_rag,
    args_schema=SearchJobFitRagInput,
    description="프로젝트 추천, 역량 갭 분석, 면접 준비에 필요한 로컬 JobFit RAG 문서 chunk를 검색할 때 사용한다.",
)

recommend_project_tool = StructuredTool.from_function(
    name="recommend_project_tool",
    func=_recommend_project,
    args_schema=RecommendProjectInput,
    description=(
        "부족 역량, 목표 직무, 준비 기간, 사용자 수준, RAG 근거를 바탕으로 "
        "입문/중급/고급 추천 프로젝트 3개와 산출물, 축소 버전을 만들 때 사용한다."
    ),
)
