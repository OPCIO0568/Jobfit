import argparse
import logging
import warnings
from uuid import uuid4

try:
    from backend.app.config import get_settings
    from backend.app.graph_workflow import run_jobfit_agent
    from backend.app.schemas import JobFitRequest
except ModuleNotFoundError:
    from app.config import get_settings
    from app.graph_workflow import run_jobfit_agent
    from app.schemas import JobFitRequest


SAMPLE_REQUEST = JobFitRequest(
    user_message="백엔드 개발 직무에 맞춰 역량 갭과 프로젝트를 추천해줘",
    target_role="백엔드 개발",
    job_posting=(
        "담당업무: FastAPI 기반 API 개발, 데이터 모델링, 운영 로그 분석, 역할 분담 문서화. "
        "필수요건: Python, SQL, Docker 테스트 경험과 API 설계 역량. "
        "우대사항: Redis, CI/CD, 배포 자동화, 모니터링 경험. "
        "협업 문서와 코드 리뷰를 중요하게 봅니다."
    ),
    company_values="협업, 문제해결, 문서화, 학습",
    user_skills=["Python", "FastAPI", "Docker"],
    user_projects=(
        "FastAPI API 서버를 만들고 README에 실행 방법을 작성했습니다. "
        "Docker로 로컬 실행 환경을 구성했고 pytest로 주요 API를 검증했습니다."
    ),
    self_intro="오류 로그를 보고 응답 검증 문제를 수정했으며, 협업 과정에서 보고 문서를 남겼습니다.",
    preparation_weeks=4,
    preferred_project_type="개인",
    current_level="중급",
)


def main() -> None:
    logging.basicConfig(level=logging.ERROR)
    warnings.filterwarnings("ignore", category=RuntimeWarning)

    parser = argparse.ArgumentParser(description="JobFit Agent CLI demo")
    parser.add_argument("--sample", action="store_true", help="데모용 샘플 입력으로 실행합니다.")
    parser.add_argument("--once", action="store_true", help="첫 분석만 실행하고 종료합니다.")
    args = parser.parse_args()

    session_id = f"cli-{uuid4()}"
    _print_api_key_notice()

    request = SAMPLE_REQUEST.model_copy() if args.sample else _read_initial_request()
    request.session_id = session_id
    state = run_jobfit_agent(request, session_id)
    _print_result(state)

    if args.once:
        return

    while True:
        message = input("\n후속 질문을 입력하세요. 종료하려면 exit: ").strip()
        if message.lower() == "exit":
            print("CLI 데모를 종료합니다.")
            return
        if not message:
            continue

        state = run_jobfit_agent(JobFitRequest(session_id=session_id, user_message=message), session_id)
        _print_result(state)


def _read_initial_request() -> JobFitRequest:
    print("처음 분석에 필요한 정보를 입력합니다. 엔터를 누르면 예시값을 사용합니다.")
    print("샘플로 바로 테스트하려면 다음 명령을 사용하세요: python cli_demo.py --sample")

    return JobFitRequest(
        user_message=_prompt("요청", "채용공고 기반으로 역량 갭과 프로젝트를 추천해줘"),
        target_role=_prompt("목표 직무", "백엔드 개발"),
        job_posting=_prompt("채용공고 원문", ""),
        company_values=_prompt("회사 인재상", ""),
        user_skills=_split_skills(_prompt("사용자 기술스택(쉼표 구분)", "")),
        user_projects=_prompt("프로젝트 경험", ""),
        self_intro=_prompt("자기소개서/경험 서술", ""),
        preparation_weeks=_parse_weeks(_prompt("준비 기간(주)", "4")),
        preferred_project_type=_prompt("선호 프로젝트 방식", "개인"),
        current_level=_prompt("현재 수준", "중급"),
    )


def _prompt(label: str, default: str) -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    if value.lower() == "exit":
        raise SystemExit("CLI 데모를 종료합니다.")
    return value or default


def _split_skills(value: str) -> list[str]:
    return [skill.strip() for skill in value.split(",") if skill.strip()]


def _parse_weeks(value: str) -> int:
    try:
        return max(1, min(int(value), 52))
    except ValueError:
        return 4


def _print_api_key_notice() -> None:
    if not get_settings().openai_api_key:
        print("OPENAI_API_KEY가 없습니다. OpenAI 호출 없이 로컬 RAG와 규칙 기반 fallback으로 실행합니다.")


def _print_result(state: dict) -> None:
    report = state.get("final_report", {})
    if report.get("message"):
        print("\n=== 추가 입력 필요 ===")
        print(report["message"])
        for warning in report.get("warnings", []):
            print(f"- {warning}")
        return

    data = report.get("json", {})
    print("\n=== JobFit Agent 결과 ===")
    print(data.get("summary", "분석 결과가 생성되었습니다."))
    _print_list("부족 역량", data.get("gap_analysis", {}).get("missing_skills", []))
    _print_projects(data.get("project_recommendations", []))
    _print_roadmap(data.get("roadmap", {}))
    print(f"메모리 대화 턴 수: {len(state.get('chat_history', []))}")


def _print_list(title: str, items: list[str]) -> None:
    print(f"\n[{title}]")
    for item in items[:6] or ["없음"]:
        print(f"- {item}")


def _print_projects(projects: list[dict]) -> None:
    print("\n[추천 프로젝트]")
    for index, project in enumerate(projects[:3], start=1):
        print(
            f"{index}. {project.get('title', '추천 프로젝트')} "
            f"({project.get('difficulty', '중급')}, {project.get('estimated_weeks', '?')}주)"
        )
        outputs = ", ".join(project.get("required_outputs", [])[:3])
        if outputs:
            print(f"   산출물: {outputs}")


def _print_roadmap(roadmap: dict) -> None:
    print(f"\n[로드맵] {roadmap.get('total_weeks', 0)}주")
    for item in roadmap.get("items", [])[:4]:
        print(f"- {item.get('week')}주차: {item.get('goal')}")


if __name__ == "__main__":
    main()
