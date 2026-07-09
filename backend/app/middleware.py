import logging
import re
import time
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

try:
    from backend.app.config import get_settings
    from backend.app.schemas import ErrorResponse, JobFitRequest
except ModuleNotFoundError:
    from app.config import get_settings  # type: ignore[no-redef]
    from app.schemas import ErrorResponse, JobFitRequest  # type: ignore[no-redef]


logger = logging.getLogger("jobfit.backend")

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+82-?)?01[016789]-?\d{3,4}-?\d{4}")
RESIDENT_ID_RE = re.compile(r"\b\d{6}-?[1-4]\d{6}\b")
WHITESPACE_RE = re.compile(r"\s+")

MAX_INPUT_LENGTH = 12_000
MIN_USER_MESSAGE_LENGTH = 5
MIN_JOB_POSTING_LENGTH = 80
MIN_EXPERIENCE_LENGTH = 80


def sanitize_text(text: str) -> str:
    return mask_sensitive_info(WHITESPACE_RE.sub(" ", text.strip()))[:MAX_INPUT_LENGTH]


def mask_sensitive_info(text: str) -> str:
    masked = EMAIL_RE.sub("[EMAIL_MASKED]", text)
    masked = PHONE_RE.sub("[PHONE_MASKED]", masked)
    return RESIDENT_ID_RE.sub("[ID_MASKED]", masked)


def validate_jobfit_request(request: JobFitRequest) -> dict[str, Any]:
    sanitized = request.model_dump()
    warnings: list[str] = []
    missing_fields: list[str] = []

    for field in [
        "user_message",
        "job_posting",
        "company_values",
        "user_projects",
        "self_intro",
        "target_role",
        "preferred_project_type",
        "current_level",
    ]:
        value = sanitized.get(field)
        if isinstance(value, str):
            sanitized[field] = sanitize_text(value)

    if not sanitized["user_message"] or len(sanitized["user_message"]) < MIN_USER_MESSAGE_LENGTH:
        missing_fields.append("user_message")
        warnings.append("분석 요청을 조금 더 구체적으로 입력해 주세요.")

    if not sanitized.get("job_posting"):
        missing_fields.append("job_posting")

    if not sanitized.get("target_role"):
        missing_fields.append("target_role")

    user_experience = " ".join(
        value
        for value in [sanitized.get("user_projects"), sanitized.get("self_intro")]
        if isinstance(value, str)
    )

    needs_job_posting_detail = len(sanitized.get("job_posting") or "") < MIN_JOB_POSTING_LENGTH
    needs_user_experience_detail = len(user_experience) < MIN_EXPERIENCE_LENGTH

    if needs_job_posting_detail:
        warnings.append("채용공고가 짧아 요구역량 분석 정확도가 낮을 수 있습니다.")

    if needs_user_experience_detail:
        if not user_experience:
            missing_fields.append("user_experience")
        warnings.append("사용자 프로젝트 또는 자기소개서 경험이 짧아 역량 분석에 한계가 있습니다.")

    return {
        "is_valid": not missing_fields,
        "missing_fields": missing_fields,
        "sanitized_request": sanitized,
        "needs_job_posting_detail": needs_job_posting_detail,
        "needs_user_experience_detail": needs_user_experience_detail,
        "warnings": warnings,
    }


def log_agent_event(event_name: str, payload: dict | None = None) -> None:
    safe_payload = _safe_log_payload(payload or {})
    logger.info("agent_event name=%s payload=%s", event_name, safe_payload)


def safe_error_response(message: str) -> ErrorResponse:
    safe_message = sanitize_text(message)
    if _looks_internal_error(safe_message):
        safe_message = "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."

    return ErrorResponse(
        error_code="JOBFIT_SAFE_ERROR",
        message=safe_message or "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        action="입력 내용을 확인한 뒤 다시 실행해 주세요.",
    )


def mask_sensitive_text(text: str) -> str:
    return mask_sensitive_info(text)


def validate_user_message(message: str) -> str:
    text = sanitize_text(message)
    if len(text) < MIN_USER_MESSAGE_LENGTH:
        raise ValueError("분석 요청을 조금 더 구체적으로 입력해 주세요.")
    return text


def install_middlewares(app: FastAPI) -> None:
    logging.basicConfig(level=logging.INFO)

    @app.middleware("http")
    async def safe_logging_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled backend error path=%s", request.url.path)
            error = safe_error_response("서버 처리 중 오류가 발생했습니다.")
            return JSONResponse(status_code=500, content=error.model_dump())

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "request path=%s status=%s elapsed_ms=%s env=%s",
            request.url.path,
            response.status_code,
            elapsed_ms,
            get_settings().app_env,
        )
        return response


def _safe_log_payload(payload: dict[str, Any]) -> dict[str, Any]:
    safe: dict[str, Any] = {}
    for key, value in payload.items():
        if key in {"job_posting", "company_values", "user_projects", "self_intro", "openai_api_key"}:
            safe[key] = "[REDACTED]"
        else:
            safe[key] = _safe_log_value(value)
    return safe


def _safe_log_value(value: Any) -> Any:
    if isinstance(value, str):
        return sanitize_text(value)[:300]
    if isinstance(value, list):
        return [_safe_log_value(item) for item in value[:10]]
    if isinstance(value, dict):
        return _safe_log_payload(value)
    return value


def _looks_internal_error(message: str) -> bool:
    lowered = message.lower()
    return any(
        word in lowered
        for word in ["traceback", "stack", "api key", "apikey", "secret", "token", "openai_api_key"]
    )
