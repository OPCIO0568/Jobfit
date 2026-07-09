import argparse

from backend.app.agent import run_agent
from backend.app.schemas import ChatRequest


def main() -> None:
    parser = argparse.ArgumentParser(description="Run JobFit LangGraph agent once.")
    parser.add_argument("message", help="User request")
    parser.add_argument("--session-id", default="cli")
    parser.add_argument("--period", default="4주")
    parser.add_argument("--level", default="중급")
    args = parser.parse_args()

    response = run_agent(
        ChatRequest(
            session_id=args.session_id,
            message=args.message,
            profile={"period": args.period, "current_level": args.level},
        ),
    )
    print(response.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
