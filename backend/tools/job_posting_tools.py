import json
import re

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field


# 공고에서 기술스택 뽑을 때 보는 키워드
TECH_KEYWORDS = [
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "FastAPI",
    "Spring",
    "Node.js",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "Redis",
    "Docker",
    "Kubernetes",
    "Linux",
    "Nginx",
    "AWS",
    "CI/CD",
    "Git",
    "C",
    "C++",
    "UART",
    "CAN",
    "FreeRTOS",
    "RTOS",
    "MCU",
    "TCP/IP",
    "Prometheus",
    "Grafana",
]

# 인재상/회사 가치에서 볼 키워드
VALUE_KEYWORDS = [
    "협업",
    "책임감",
    "문제해결",
    "주도",
    "학습",
    "성장",
    "소통",
    "고객",
    "문서화",
    "품질",
    "운영",
]


class AnalyzeJobPostingInput(BaseModel):
    job_posting: str = Field(description="분석할 채용공고 원문입니다.")
    company_values: str = Field(default="", description="회사 인재상 또는 핵심가치 텍스트입니다.")


def _analyze_job_posting(job_posting: str, company_values: str = "") -> str:
    # 채용공고 텍스트를 담당업무/필수/우대로 대충 나눠서 구조화
    try:
        text = job_posting.strip()
        values = company_values.strip()
        if not text:
            return _json({"error": "채용공고 원문이 비어 있어 분석할 수 없습니다."})

        lines = _meaningful_lines(text)
        responsibilities = _collect(lines, ["담당", "업무", "개발", "운영", "구축", "설계", "관리", "분석", "자동화"])
        required = _collect(lines, ["필수", "자격", "요건", "required", "must"], exclude=["우대", "preferred", "plus"])
        preferred = _collect(lines, ["우대", "preferred", "plus", "환영"])
        technical_keywords = _extract_keywords(text, TECH_KEYWORDS)
        talent_keywords = _extract_keywords(values or text, VALUE_KEYWORDS)

        if not required and technical_keywords:
            required = [f"{skill} 활용 경험 또는 관련 프로젝트 근거" for skill in technical_keywords[:5]]

        return _json(
            {
                "role_summary": _role_summary(text),
                "responsibilities": responsibilities or lines[:4],
                "required_skills": required or ["공고에 명시된 필수 역량 섹션이 부족합니다."],
                "preferred_skills": preferred or ["공고에 명시된 우대 역량 섹션이 부족합니다."],
                "talent_keywords": talent_keywords,
                "technical_keywords": technical_keywords,
                "requirement_categories": {
                    "기술": technical_keywords,
                    "협업": [item for item in talent_keywords if item in {"협업", "소통", "책임감"}],
                    "문서화": [item for item in talent_keywords if item == "문서화"],
                    "운영": [item for item in technical_keywords + talent_keywords if item in {"Linux", "Docker", "Kubernetes", "운영"}],
                },
                "evidence": lines[:5],
                "caution": "공고 원문과 인재상 텍스트에 확인되는 내용만 요약했습니다.",
            },
        )
    except Exception as exc:
        return _json({"error": f"채용공고 분석 도구 실행 실패: {exc.__class__.__name__}"})


def _meaningful_lines(text: str) -> list[str]:
    # 긴 공고를 줄 단위로 쪼개는 부분
    normalized = re.sub(
        r"(담당업무|주요업무|필수사항|필수요건|자격요건|우대사항|우대요건)",
        r"\n\1: ",
        text,
    )
    candidates = re.split(r"[\n\r]+|[•·\-]\s+|[,;]\s*|(?<=[.!?])\s+", normalized)
    return [line.strip(" -\t") for line in candidates if len(line.strip()) >= 8]


def _collect(lines: list[str], words: list[str], limit: int = 7, exclude: list[str] | None = None) -> list[str]:
    # 필수/우대 같은 섹션을 키워드로 걸러냄
    lowered = [word.lower() for word in words]
    blocked = [word.lower() for word in exclude or []]
    return [
        line
        for line in lines
        if any(word in line.lower() for word in lowered)
        and not any(word in line.lower() for word in blocked)
    ][:limit]


def _extract_keywords(text: str, keywords: list[str]) -> list[str]:
    return [keyword for keyword in keywords if _contains_keyword(text, keyword)]


def _contains_keyword(text: str, keyword: str) -> bool:
    # C가 CI/CD에서 잡히는 식의 오탐을 줄이려고 경계 체크
    if any(char.isascii() and char.isalpha() for char in keyword):
        pattern = rf"(?<![A-Za-z0-9+#./]){re.escape(keyword)}(?![A-Za-z0-9+#./])"
        return re.search(pattern, text, flags=re.IGNORECASE) is not None
    return keyword in text


def _role_summary(text: str) -> str:
    # 공고 문구 보고 직무 종류를 간단히 판별
    lower = text.lower()
    if any(word in lower for word in ["embedded", "임베디드", "uart", "can", "mcu", "freertos"]):
        return "임베디드 소프트웨어 직무 요구사항 요약"
    if any(word in lower for word in ["infra", "인프라", "linux", "네트워크", "서버 운영"]):
        return "IT 인프라 직무 요구사항 요약"
    if any(word in lower for word in ["backend", "백엔드", "api", "server", "서버"]):
        return "백엔드 개발 직무 요구사항 요약"
    return "입력된 채용공고 기반 직무 요구사항 요약"


def _json(value: dict[str, object]) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


analyze_job_posting_tool = StructuredTool.from_function(
    name="analyze_job_posting_tool",
    func=_analyze_job_posting,
    args_schema=AnalyzeJobPostingInput,
    description=(
        "채용공고 원문과 회사 인재상을 근거로 담당업무, 필수역량, 우대역량, "
        "인재상 키워드, 기술 키워드를 구조화할 때 사용한다. 공고에 없는 요구사항은 단정하지 않는다."
    ),
)
