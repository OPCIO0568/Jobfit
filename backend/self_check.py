import os

os.environ["JOBFIT_BACKEND_MOCK"] = "true"

try:
    from backend.app.agent import get_workflow_mermaid, run_agent
    from backend.app.schemas import ChatRequest
except ModuleNotFoundError:
    from app.agent import get_workflow_mermaid, run_agent
    from app.schemas import ChatRequest


def main() -> None:
    response = run_agent(
        ChatRequest(
            session_id="self-check",
            message="백엔드 개발자 공고에 맞춰 부족 역량, 프로젝트, 4주 로드맵을 추천해줘",
            profile={"period": "4주", "current_level": "중급"},
        ),
    )
    assert response.result.gap_items
    assert response.result.projects
    assert response.result.roadmap
    assert "select_tools" in get_workflow_mermaid()
    print("backend self-check passed")


if __name__ == "__main__":
    main()
