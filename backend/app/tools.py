import json

from langchain_core.tools import tool

try:
    from backend.app.rag import retrieve_documents
    from backend.tools.expert_prompts import (
        GAP_ANALYST_PROMPT,
        PROJECT_MENTOR_PROMPT,
        RAG_RESEARCHER_PROMPT,
        REPORT_EDITOR_PROMPT,
        ROADMAP_COACH_PROMPT,
    )
except ModuleNotFoundError:
    from app.rag import retrieve_documents
    from tools.expert_prompts import (
        GAP_ANALYST_PROMPT,
        PROJECT_MENTOR_PROMPT,
        RAG_RESEARCHER_PROMPT,
        REPORT_EDITOR_PROMPT,
        ROADMAP_COACH_PROMPT,
    )


def _safe_json_loads(value: str) -> dict:
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else {"text": value}
    except json.JSONDecodeError:
        return {"text": value}


@tool
def search_jobfit_knowledge(query: str) -> str:
    """SW/IT 직무 지식 리서처 Tool.

    로컬 JobFit 직무/포트폴리오 지식 문서를 검색한다.
    """
    docs = retrieve_documents(query)
    return json.dumps(
        [
            {
                "title": doc.metadata.get("title", "unknown"),
                "source": doc.metadata.get("source", "local"),
                "content": doc.page_content[:1200],
            }
            for doc in docs
        ],
        ensure_ascii=False,
    )


@tool
def analyze_gap(input_text: str) -> str:
    """채용 역량 갭 분석 컨설턴트 Tool.

    사용자 요청과 RAG 문서를 근거로 공고 대비 부족 역량을 분석한다.
    """
    data = _safe_json_loads(input_text)
    text = f"{data.get('message', '')}\n{data.get('context', '')}".lower()
    gaps: list[dict[str, str]] = []

    checks = [
        ("API/백엔드 설계", ["api", "백엔드", "fastapi", "node", "서버"]),
        ("운영/배포 경험", ["배포", "운영", "docker", "ci/cd", "모니터링"]),
        ("테스트/문서화", ["테스트", "문서", "readme", "검증"]),
        ("임베디드 디버깅", ["임베디드", "uart", "can", "gpio", "펌웨어"]),
    ]

    for capability, keywords in checks:
        if any(keyword in text for keyword in keywords):
            gaps.append(
                {
                    "capability": capability,
                    "level": "중간",
                    "reason": f"입력과 검색 문서에서 {capability} 관련 요구가 확인됩니다.",
                },
            )

    if not gaps:
        gaps.append(
            {
                "capability": "직무 요구역량 근거",
                "level": "높음",
                "reason": "입력 정보가 부족해 공고 요구역량과 경험의 연결 근거가 약합니다.",
            },
        )

    return json.dumps(gaps[:4], ensure_ascii=False)


@tool
def recommend_project(input_text: str) -> str:
    """시니어 포트폴리오 멘토 Tool.

    선택된 역량 갭을 증명할 포트폴리오 프로젝트를 추천한다.
    """
    data = _safe_json_loads(input_text)
    text = f"{data.get('message', '')} {data.get('gaps', '')}".lower()

    if any(word in text for word in ["임베디드", "uart", "gpio", "펌웨어"]):
        title = "통신 오류 재현과 복구 시나리오 검증 펌웨어"
        stack = ["C", "UART", "GPIO", "테스트 로그"]
    elif any(word in text for word in ["인프라", "docker", "운영", "모니터링"]):
        title = "서비스 로그 기반 장애 대응 런북 대시보드"
        stack = ["Linux", "Docker", "Python", "Grafana"]
    else:
        title = "채용공고 기반 API 검증 포트폴리오 서버"
        stack = ["Python", "FastAPI", "Pydantic", "테스트"]

    projects = [
        {
            "title": title,
            "difficulty": data.get("level", "중급"),
            "period": data.get("period", "4주"),
            "reason": "부족 역량을 실제 산출물로 증명하기 위한 프로젝트입니다.",
            "outputs": ["README", "실행 예시", "테스트 결과", ", ".join(stack)],
        },
    ]
    return json.dumps(projects, ensure_ascii=False)


@tool
def generate_roadmap(input_text: str) -> str:
    """취업 준비 로드맵 코치 Tool.

    선택된 프로젝트와 준비 기간에 맞춰 산출물 중심 로드맵을 만든다.
    """
    data = _safe_json_loads(input_text)
    period = str(data.get("period", "4주"))
    weeks = 12 if "12" in period else 8 if "8" in period else 4
    project_title = data.get("project_title", "추천 프로젝트")

    roadmap = [
        {
            "week": f"{index}주차",
            "goal": f"{project_title} 핵심 범위 {index}단계 진행",
            "task": "학습한 내용을 코드와 문서 산출물에 바로 반영",
            "output": f"{index}주차 README/실행 기록",
        }
        for index in range(1, weeks + 1)
    ]
    return json.dumps(roadmap, ensure_ascii=False)


JOBFIT_TOOLS = [
    search_jobfit_knowledge,
    analyze_gap,
    recommend_project,
    generate_roadmap,
]

search_jobfit_knowledge.description = (
    f"{RAG_RESEARCHER_PROMPT}\n\n"
    "로컬 JobFit 직무/포트폴리오 지식 문서를 검색한다."
)
analyze_gap.description = (
    f"{GAP_ANALYST_PROMPT}\n\n"
    "사용자 요청과 RAG 문서를 근거로 공고 대비 부족 역량을 분석한다."
)
recommend_project.description = (
    f"{PROJECT_MENTOR_PROMPT}\n\n"
    "선택된 역량 갭을 증명할 포트폴리오 프로젝트를 추천한다."
)
generate_roadmap.description = (
    f"{ROADMAP_COACH_PROMPT}\n\n"
    f"최종 리포트 정리 원칙: {REPORT_EDITOR_PROMPT}\n\n"
    "선택된 프로젝트와 준비 기간에 맞춰 산출물 중심 로드맵을 만든다."
)
