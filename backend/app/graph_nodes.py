import json
import re
from typing import Any

try:
    from backend.app.graph_state import GraphState, PartialGraphState
    from backend.app.middleware import log_agent_event, safe_error_response, sanitize_text, validate_jobfit_request
    from backend.app.schemas import JobFitRequest
    from backend.tools import analyze_job_posting_tool, generate_markdown_report_tool, recommend_project_tool, search_jobfit_rag_tool
except ModuleNotFoundError:
    from app.graph_state import GraphState, PartialGraphState
    from app.middleware import log_agent_event, safe_error_response, sanitize_text, validate_jobfit_request
    from app.schemas import JobFitRequest
    from tools import analyze_job_posting_tool, generate_markdown_report_tool, recommend_project_tool, search_jobfit_rag_tool


# 사용자 입력에서 기술스택으로 볼만한 단어들
KNOWN_SKILLS = [
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
    "Prometheus",
    "Grafana",
]


def input_validation_node(state: GraphState) -> PartialGraphState:
    # 1번 노드: 입력값 검증하고 개인정보 마스킹된 값으로 정리
    try:
        request = JobFitRequest(
            session_id=state.get("session_id"),
            user_message=state.get("user_message") or "",
            job_posting=state.get("job_posting"),
            company_values=state.get("company_values"),
            user_skills=state.get("user_skills"),
            user_projects=state.get("user_projects"),
            self_intro=state.get("self_intro"),
            target_role=state.get("target_role"),
            preparation_weeks=state.get("preparation_weeks"),
            preferred_project_type=state.get("preferred_project_type"),
            current_level=state.get("current_level"),
        )
        validation = validate_jobfit_request(request)
        sanitized = validation.get("sanitized_request", {})
        log_agent_event("input_validation", {"session_id": state.get("session_id"), "is_valid": validation["is_valid"]})

        return {
            **sanitized,
            "validation_result": validation,
            "next_action": "job_posting_analysis" if validation["is_valid"] else "clarify",
        }
    except Exception as exc:
        return _node_error("input_validation_node", exc)


def job_posting_analysis_node(state: GraphState) -> PartialGraphState:
    # 2번 노드: 채용공고/인재상 분석 Tool 실행하는 부분
    try:
        output = analyze_job_posting_tool.invoke(
            {
                "job_posting": state.get("job_posting") or "",
                "company_values": state.get("company_values") or "",
            },
        )
        return {"job_posting_analysis": _json_loads(output), "next_action": "user_profile_analysis"}
    except Exception as exc:
        return _node_error("job_posting_analysis_node", exc)


def user_profile_analysis_node(state: GraphState) -> PartialGraphState:
    # 3번 노드: 사용자가 쓴 기술스택/프로젝트/자소서에서 근거 뽑는 부분
    try:
        project_lines = _lines(state.get("user_projects") or "")
        intro_lines = _lines(state.get("self_intro") or "")
        history_lines = [
            sanitize_text(message.get("content", ""))
            for message in state.get("chat_history", [])
            if message.get("role") == "user"
        ]
        combined = " ".join(project_lines + intro_lines + history_lines + [state.get("user_message") or ""])
        confirmed_skills = _unique(
            [sanitize_text(skill) for skill in state.get("user_skills") or [] if skill.strip()]
            + _extract_known_skills(combined),
        )

        analysis = {
            "confirmed_skills": confirmed_skills,
            "inferred_skills": _inferred_skills(combined, confirmed_skills),
            "project_experience": project_lines[:8],
            "self_intro_evidence": intro_lines[:6],
            "collaboration_experience": _evidence_lines(project_lines + intro_lines, ["협업", "팀", "소통", "리뷰", "역할", "분담"]),
            "problem_solving_experience": _evidence_lines(project_lines + intro_lines, ["문제", "개선", "오류", "장애", "해결", "최적화"]),
            "documentation_experience": _evidence_lines(project_lines + intro_lines, ["README", "문서", "보고", "정리", "기록"]),
            "operation_experience": _evidence_lines(project_lines + intro_lines, ["배포", "운영", "모니터링", "로그", "장애"]),
            "evidence_by_source": {
                "skills": confirmed_skills,
                "projects": project_lines[:5],
                "self_intro": intro_lines[:5],
            },
            "weak_evidence": _weak_evidence(combined),
        }
        return {"user_profile_analysis": analysis, "next_action": "rag_retrieval"}
    except Exception as exc:
        return _node_error("user_profile_analysis_node", exc)


def rag_retrieval_node(state: GraphState) -> PartialGraphState:
    # 4번 노드: 직무랑 부족역량 기준으로 로컬 RAG 문서 검색
    try:
        query = " ".join(
            value
            for value in [
                state.get("target_role") or "",
                state.get("user_message") or "",
                " ".join(state.get("user_skills") or []),
                " ".join(_flatten(state.get("job_posting_analysis", {}).get("technical_keywords", []))),
            ]
            if value
        )
        output = search_jobfit_rag_tool.invoke({"query": query, "k": 4})
        data = _json_loads(output)
        return {"rag_context": data.get("chunks", []), "next_action": "gap_analysis"}
    except Exception as exc:
        return _node_error("rag_retrieval_node", exc)


def gap_analysis_node(state: GraphState) -> PartialGraphState:
    # 5번 노드: 공고 요구역량이랑 사용자 경험 비교해서 부족한 것 찾음
    try:
        job = state.get("job_posting_analysis", {})
        user = state.get("user_profile_analysis", {})
        # 필수역량을 먼저 보고, 우대역량은 그 다음 우선순위로 둠
        required_core = _extract_skill_phrases(_flatten(job.get("required_skills", [])))
        responsibility_core = _extract_skill_phrases(_flatten(job.get("responsibilities", [])))
        preferred_core = [
            skill
            for skill in _extract_skill_phrases(_flatten(job.get("preferred_skills", [])))
            if skill not in required_core and skill not in responsibility_core
        ]
        required = _dedupe_capabilities(
            required_core + responsibility_core + preferred_core + _flatten(job.get("technical_keywords", [])),
        )
        user_text = " ".join(_flatten(user)).lower()

        strengths = [skill for skill in required if _has_positive_skill(user_text, skill)]
        missing = [skill for skill in required if skill not in strengths]
        if not missing:
            missing = ["공고 요구역량을 포트폴리오 산출물로 더 명확히 증명하기"]
        priority = [skill for skill in required_core if skill in missing]
        priority += [skill for skill in responsibility_core if skill in missing]
        priority += [skill for skill in preferred_core if skill in missing]

        study_items = [_study_item(skill) for skill in missing[:5]]
        project_items = [_project_item(skill) for skill in missing[:5]]
        evidence = _gap_evidence_items(missing[:6], job, user, state.get("rag_context", []))
        gap = {
            "strengths": strengths[:6],
            "missing_skills": missing[:6],
            "study_items": study_items,
            "project_items": project_items,
            "documentation_items": [
                "README에 문제 정의, 실행 방법, 검증 방법 작성",
                "테스트 결과 또는 로그 캡처 정리",
                "기술 선택 이유와 대안 비교 작성",
                "면접에서 설명할 실패/개선 사례 정리",
            ],
            "priority": (priority or missing)[:3],
            "risk_notes": [
                "입력 경험이 짧으면 보유 역량보다 보완 항목이 더 크게 잡힐 수 있습니다.",
                "프로젝트 산출물이 없으면 실제 수행 경험으로 보기 어렵습니다.",
            ],
            "evidence": evidence,
        }
        return {"gap_analysis": gap, "next_action": "project_recommendation"}
    except Exception as exc:
        return _node_error("gap_analysis_node", exc)


def tool_selection_node(state: GraphState) -> PartialGraphState:
    # 과제에서 Tool 선택 노드가 보이도록 둔 부분
    try:
        validation = state.get("validation_result", {})
        if state.get("errors"):
            return {"next_action": "error"}
        if validation and not validation.get("is_valid", True):
            return {"next_action": "clarify"}
        return {"next_action": "project_recommendation"}
    except Exception as exc:
        return _node_error("tool_selection_node", exc)


def project_recommendation_node(state: GraphState) -> PartialGraphState:
    # 6번 노드: 부족역량 기준으로 프로젝트 3개 추천
    try:
        gap = state.get("gap_analysis", {})
        output = recommend_project_tool.invoke(
            {
                "missing_skills": gap.get("missing_skills", []),
                "target_role": state.get("target_role") or "목표 직무",
                "preparation_weeks": state.get("preparation_weeks") or 4,
                "user_level": state.get("current_level") or _infer_level(state),
                "gap_evidence": gap.get("evidence", []),
                "user_projects": state.get("user_projects") or "",
                "preferred_project_type": state.get("preferred_project_type") or "상관없음",
                "rag_context": state.get("rag_context", []),
            },
        )
        data = _json_loads(output)
        return {"project_recommendations": data.get("projects", []), "next_action": "roadmap_generation"}
    except Exception as exc:
        return _node_error("project_recommendation_node", exc)


def roadmap_generation_node(state: GraphState) -> PartialGraphState:
    # 7번 노드: 선택한 준비 기간만큼 주차별 로드맵 생성
    try:
        weeks = min(max(state.get("preparation_weeks") or 4, 1), 12)
        project = (state.get("project_recommendations") or [{}])[0]
        title = project.get("title", "추천 프로젝트")
        study_items = _flatten(state.get("gap_analysis", {}).get("study_items", []))[:4]
        items = [_roadmap_week(week, weeks, title, study_items, project) for week in range(1, weeks + 1)]
        return {"roadmap": {"total_weeks": weeks, "items": items}, "next_action": "final_report"}
    except Exception as exc:
        return _node_error("roadmap_generation_node", exc)


def final_report_node(state: GraphState) -> PartialGraphState:
    # 8번 노드: 화면용 JSON이랑 Markdown 리포트 만들기 전 최종 묶음
    try:
        report = {
            "summary": f"{state.get('target_role') or '목표 직무'} 기준으로 공고 요구역량, 사용자 경험, 부족 역량, 프로젝트와 로드맵을 연결한 분석 결과입니다.",
            "job_requirements": state.get("job_posting_analysis", {}),
            "user_capabilities": state.get("user_profile_analysis", {}),
            "gap_analysis": state.get("gap_analysis", {}),
            "project_recommendations": state.get("project_recommendations", []),
            "roadmap": state.get("roadmap", {}),
            "portfolio_checklist": [
                "README: 문제 정의, 실행 방법, 주요 기능",
                "검증 자료: 테스트 결과, 로그, 스크린샷",
                "설계 문서: 아키텍처, 데이터 흐름, 예외 처리",
                "회고: 실패 케이스와 개선 과정",
                "면접 Q&A: 기술 선택 이유와 트레이드오프",
            ],
            "cautions": [
                "AI 분석은 참고용이며 취업 성공을 보장하지 않습니다.",
                "공고 원문에 없는 요구사항은 단정하지 않았습니다.",
                "사용자가 실제 수행하지 않은 경험은 보유 역량으로 표현하지 않았습니다.",
            ],
        }
        markdown = generate_markdown_report_tool.invoke({"final_analysis": report})
        return {"final_report": {"json": report, "markdown": markdown}, "next_action": "done"}
    except Exception as exc:
        return _node_error("final_report_node", exc)


def clarification_node(state: GraphState) -> PartialGraphState:
    # 입력이 부족하면 여기서 더 입력하라고 안내하고 끝냄
    try:
        validation = state.get("validation_result", {})
        missing = validation.get("missing_fields", [])
        warnings = validation.get("warnings", [])
        question = "추가 정보가 필요합니다. " + ", ".join(missing or ["채용공고와 사용자 경험"]) + " 항목을 보완해 주세요."
        return {"final_report": {"message": question, "warnings": warnings}, "next_action": "done"}
    except Exception as exc:
        return _node_error("clarification_node", exc)


def _roadmap_week(
    week: int,
    total_weeks: int,
    title: str,
    study_items: list[str],
    project: dict[str, Any],
) -> dict[str, object]:
    if week == 1:
        phase = "요구사항 정리와 최소 기능 설계"
    elif week == total_weeks:
        phase = "검증, 문서화, 포트폴리오 정리"
    elif week <= max(2, total_weeks // 2):
        phase = "핵심 기능 구현과 단위 검증"
    else:
        phase = "예외 처리, 로그, 운영 관점 보강"

    outputs = project.get("required_outputs") or ["README", "검증 로그"]
    return {
        "week": week,
        "goal": f"{title} - {phase}",
        "study_topics": study_items[:3] or ["공고 요구역량 핵심 개념 정리"],
        "practice_tasks": [f"{phase}에 필요한 작은 실습 1개 수행"],
        "project_tasks": [f"{title}의 {phase} 범위 구현"],
        "outputs": [str(outputs[min(week - 1, len(outputs) - 1)])],
        "completion_criteria": ["실행 가능한 결과물과 검증 근거가 남아 있음"],
    }


def _json_loads(value: str) -> dict[str, Any]:
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else {"items": data}
    except json.JSONDecodeError:
        return {"raw": value}


def _lines(text: str) -> list[str]:
    return [sanitize_text(line) for line in re.split(r"[\n\r]+|[•·\-]\s+", text) if len(line.strip()) >= 4]


def _evidence_lines(lines: list[str], keywords: list[str]) -> list[str]:
    return [line for line in lines if any(keyword.lower() in line.lower() for keyword in keywords)][:4]


def _weak_evidence(text: str) -> list[str]:
    checks = {
        "문서화 근거": ["readme", "문서", "보고", "기록"],
        "테스트 근거": ["test", "테스트", "검증", "pytest"],
        "운영/배포 근거": ["배포", "운영", "로그", "모니터링"],
        "협업 근거": ["협업", "팀", "리뷰", "역할"],
    }
    lower = text.lower()
    return [name for name, keywords in checks.items() if not any(keyword in lower for keyword in keywords)]


def _inferred_skills(text: str, confirmed: list[str]) -> list[str]:
    lower = text.lower()
    inferred: list[str] = []
    if "api" in lower and not any(skill.lower() == "fastapi" for skill in confirmed):
        inferred.append("API 설계 경험")
    if "로그" in lower or "장애" in lower:
        inferred.append("문제 원인 분석 경험")
    return inferred


def _extract_known_skills(text: str) -> list[str]:
    return [skill for skill in KNOWN_SKILLS if _has_positive_skill(text, skill)]


def _extract_skill_phrases(lines: list[str]) -> list[str]:
    phrases = [line[:60] for line in lines if "부족" not in line]
    found = _extract_known_skills(" ".join(lines))
    return _unique(phrases + found)[:8]


def _has_positive_skill(text: str, skill: str) -> bool:
    lower_text = text.lower()
    lower_skill = skill.lower()
    match = _skill_match(lower_text, lower_skill)
    if match is None:
        return False
    index = match.start()
    window = lower_text[max(0, index - 12) : match.end() + 20]
    return not any(word in window for word in ["없", "미경험", "부족", "못", "하지 않"])


def _skill_match(text: str, skill: str) -> re.Match[str] | None:
    # CI/CD 안의 C 같은 오탐 막으려고 토큰 기준으로 찾음
    if any(char.isascii() and char.isalpha() for char in skill):
        pattern = rf"(?<![a-z0-9+#./]){re.escape(skill)}(?![a-z0-9+#./])"
        return re.search(pattern, text, flags=re.IGNORECASE)
    return re.search(re.escape(skill), text)


def _study_item(skill: str) -> str:
    return f"{skill}의 핵심 개념, 실무 사용 사례, 실패 케이스 학습"


def _project_item(skill: str) -> str:
    return f"{skill}를 README, 테스트/로그, 실행 결과로 증명"


def _gap_evidence_items(
    missing: list[str],
    job: dict[str, Any],
    user: dict[str, Any],
    rag_context: list[str],
) -> list[str]:
    # 부족역량마다 다른 근거를 붙이는 부분. 한 줄 근거 반복 방지용.
    job_lines = _flatten(
        [
            job.get("required_skills", []),
            job.get("preferred_skills", []),
            job.get("responsibilities", []),
            job.get("evidence", []),
        ],
    )
    user_lines = _flatten(
        [
            user.get("project_experience", []),
            user.get("self_intro_evidence", []),
            user.get("collaboration_experience", []),
            user.get("problem_solving_experience", []),
            user.get("documentation_experience", []),
            user.get("operation_experience", []),
            user.get("confirmed_skills", []),
        ],
    )
    return [_gap_evidence(skill, job_lines, user_lines, rag_context) for skill in missing]


def _gap_evidence(skill: str, job_lines: list[str], user_lines: list[str], rag_context: list[str]) -> str:
    job_line = _best_line(skill, job_lines)
    user_line = _best_line(skill, user_lines)
    fallback_user = user_lines[0] if user_lines else "사용자 프로젝트 경험"
    missing_focus = _missing_focus(skill)
    rag_line = _best_line(skill, rag_context)

    job_part = f"공고 근거: {_shorten(job_line or skill, 95)}"
    if user_line:
        user_part = f"사용자 근거: {_shorten(user_line, 95)}"
    else:
        user_part = f"사용자 근거: {_shorten(fallback_user, 70)} 경험은 확인되지만, {missing_focus} 근거는 부족합니다."

    if rag_line:
        return f"{job_part} / {user_part} / RAG 기준: {_shorten(_strip_source(rag_line), 90)}"
    return f"{job_part} / {user_part}"


def _best_line(skill: str, lines: list[str]) -> str:
    skill_tokens = _tokens(skill)
    if not skill_tokens:
        return ""
    for line in lines:
        line_tokens = _tokens(line)
        if skill_tokens & line_tokens:
            return line
    return ""


def _tokens(text: str) -> set[str]:
    return {
        token.lower()
        for token in re.findall(r"[A-Za-z0-9+#./]+|[가-힣]{2,}", text)
        if token.lower()
        not in {
            "경험",
            "근거",
            "사항",
            "필수",
            "우대",
            "기반",
            "구현",
            "활용",
            "관련",
            "프로젝트",
            "사용자",
        }
    }


def _missing_focus(skill: str) -> str:
    lower = skill.lower()
    if any(word in lower for word in ["로그", "운영", "배포", "장애", "monitoring"]):
        return "배포 환경 로그 확인, 문제 추적, 장애 대응 산출물"
    if any(word in lower for word in ["git", "협업", "리뷰", "커뮤니케이션", "소통"]):
        return "Git 브랜치 전략, PR/코드리뷰, 협업 커뮤니케이션 기록"
    if any(word in lower for word in ["test", "테스트", "검증"]):
        return "테스트 케이스, 실패 케이스, 검증 결과"
    if any(word in lower for word in ["sql", "db", "데이터"]):
        return "데이터 모델링, 쿼리 검증, 성능 확인"
    if any(word in lower for word in ["api", "rest", "fastapi", "spring"]):
        return "API 설계 의도, 예외 처리, OpenAPI/테스트 근거"
    return f"{skill}를 직접 수행했다는 산출물"


def _shorten(text: str, limit: int) -> str:
    clean = " ".join(str(text).split())
    return clean if len(clean) <= limit else f"{clean[: limit - 1]}…"


def _strip_source(text: str) -> str:
    return re.sub(r"^\[source:[^\]]+\]\s*", "", text).strip()


def _dedupe_capabilities(values: list[str]) -> list[str]:
    # "Git 활용 경험..."과 "Git"처럼 같은 역량이 두 번 보이는 것 정리
    result: list[str] = []
    for value in values:
        clean = value.strip()
        if clean and not any(_same_capability(clean, existing) for existing in result):
            result.append(clean)
    return result


def _same_capability(a: str, b: str) -> bool:
    lower_a = a.lower()
    lower_b = b.lower()
    if lower_a in lower_b or lower_b in lower_a:
        return True
    tokens_a = _tokens(a)
    tokens_b = _tokens(b)
    return bool(tokens_a & tokens_b) and (len(tokens_a) == 1 or len(tokens_b) == 1)


def _infer_level(state: GraphState) -> str:
    text = f"{state.get('user_message') or ''} {state.get('self_intro') or ''}"
    if "입문" in text:
        return "입문"
    if "고급" in text:
        return "고급"
    return "중급"


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _flatten(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [item for entry in value for item in _flatten(entry)]
    if isinstance(value, dict):
        return [item for entry in value.values() for item in _flatten(entry)]
    return []


def _node_error(node_name: str, exc: Exception) -> PartialGraphState:
    error = safe_error_response(f"{node_name} 처리 중 오류가 발생했습니다.")
    return {"errors": [error.message], "next_action": "error"}
