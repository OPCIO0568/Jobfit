import json
from typing import Any

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

try:
    from backend.tools.expert_prompts import REPORT_EDITOR_PROMPT
except ModuleNotFoundError:
    from tools.expert_prompts import REPORT_EDITOR_PROMPT  # type: ignore[no-redef]


class GenerateMarkdownReportInput(BaseModel):
    final_analysis: dict[str, Any] = Field(description="최종 분석 결과 JSON 객체입니다.")


def _generate_markdown_report(final_analysis: dict[str, Any]) -> str:
    try:
        title = final_analysis.get("summary") or final_analysis.get("title") or "JobFit Agent 분석 리포트"
        sections = ["# JobFit Agent 분석 리포트", "", f"## 요약\n\n{title}"]

        for key, value in final_analysis.items():
            if key in {"summary", "title"}:
                continue
            sections.append(f"## {_label(key)}")
            sections.append(_to_markdown(value))

        sections.append("## AI 분석 한계와 주의사항")
        sections.append("- 입력한 공고와 경험을 기준으로 한 참고 자료이며 합격을 보장하지 않습니다.")
        sections.append("- 최종 지원 전 최신 공고와 본인의 실제 수행 경험으로 다시 확인하세요.")
        sections.append("- 포트폴리오/README에는 실행 근거를 남기고, API Key·비밀번호 같은 민감정보는 노출하지 마세요.")
        return "\n\n".join(sections).strip()
    except Exception as exc:
        return f"# JobFit Agent 분석 리포트\n\n보고서 생성 실패: {exc.__class__.__name__}"


def _to_markdown(value: Any) -> str:
    if isinstance(value, list):
        return "\n".join(f"- {_inline(item)}" for item in value) or "- 없음"
    if isinstance(value, dict):
        return "\n".join(f"- **{_label(key)}**: {_inline(item)}" for key, item in value.items()) or "- 없음"
    return str(value)


def _inline(value: Any) -> str:
    if isinstance(value, (dict, list)):
        return f"`{json.dumps(value, ensure_ascii=False)}`"
    return str(value)


def _label(key: Any) -> str:
    labels = {
        "job_requirements": "채용공고 요구역량",
        "user_capabilities": "사용자 보유 역량",
        "gap_analysis": "역량 갭 분석",
        "project_recommendations": "추천 프로젝트",
        "roadmap": "학습 로드맵",
        "portfolio_checklist": "포트폴리오 체크리스트",
        "cautions": "주의사항",
    }
    return labels.get(str(key), str(key).replace("_", " ").strip().title())


generate_markdown_report_tool = StructuredTool.from_function(
    name="generate_markdown_report_tool",
    func=_generate_markdown_report,
    args_schema=GenerateMarkdownReportInput,
    description=(
        f"{REPORT_EDITOR_PROMPT}\n\n"
        "최종 분석 JSON을 사용자가 다운로드하거나 제출할 수 있는 Markdown 보고서 문자열로 변환할 때 사용한다."
    ),
)
