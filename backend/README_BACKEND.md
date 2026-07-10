# JobFit Agent Backend

이 폴더는 최종 평가 핵심인 Python + LangChain + LangGraph Agent Core입니다.

전체 서비스 소개, 아키텍처, 평가 요구사항 충족표, 발표 흐름은 루트 `README.md`를 우선 확인하세요. 이 문서는 backend만 빠르게 실행하고 점검하기 위한 안내서입니다.

## 역할

- FastAPI API 제공
- LangGraph `StateGraph` workflow 실행
- LangChain `StructuredTool` 4개 제공
- 로컬 Markdown 문서 기반 RAG 검색
- `session_id` 기반 인메모리 Memory 유지
- 입력 검증, 개인정보 마스킹, 안전한 에러 응답 제공
- Pydantic 기반 구조화 출력 반환
- FastAPI 없이 실행 가능한 CLI 데모 제공

## 폴더 구조

```text
backend/
  main.py                         FastAPI 엔트리포인트
  cli_demo.py                     CLI 데모
  requirements.txt                Python 의존성
  .env.example                    환경변수 예시
  README_BACKEND.md               backend 빠른 안내

  app/
    api.py                        FastAPI route
    config.py                     환경변수 로딩
    graph_state.py                LangGraph state
    graph_nodes.py                workflow node
    graph_workflow.py             StateGraph, conditional edge, MemorySaver
    memory.py                     인메모리 세션 저장소
    middleware.py                 입력 검증, 마스킹, 로깅, 안전한 에러
    schemas.py                    Pydantic 모델, OutputParser

  tools/
    job_posting_tools.py
    project_tools.py
    report_tools.py

  rag/
    loader.py
    retriever.py
    documents/

  docs/
    workflow.mmd
    workflow.md
```

## 설치

루트 `.venv` 사용 기준입니다.

```powershell
cd C:\Ucode\11_AIboot_FINAL
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

PowerShell 실행 정책 오류가 나면 현재 터미널에서만 허용합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

## 환경변수

`backend/.env.example`:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
EMBEDDING_MODEL=text-embedding-3-small
APP_ENV=development
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8001
JOBFIT_BACKEND_MOCK=false
```

API Key는 코드에 하드코딩하지 않습니다. API Key가 없거나 `JOBFIT_BACKEND_MOCK=true`이면 fallback으로 실행되지만, 응답에 외부 API 미사용 경고가 포함됩니다.

## FastAPI 실행

```powershell
cd C:\Ucode\11_AIboot_FINAL
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn main:app --reload --port 8001
```

확인:

```powershell
curl http://127.0.0.1:8001/health
```

OpenAPI 문서:

```text
http://127.0.0.1:8001/docs
```

## 주요 API

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/health` | 서버 상태 확인 |
| `POST` | `/agent/jobfit` | LangGraph Agent 실행 |
| `GET` | `/agent/workflow-mermaid` | workflow Mermaid 문자열 반환 |

## CLI 데모

샘플 1회 실행:

```powershell
cd C:\Ucode\11_AIboot_FINAL
.\.venv\Scripts\Activate.ps1
cd backend
python cli_demo.py --sample --once
```

멀티턴 입력:

```powershell
python cli_demo.py --sample
```

직접 입력:

```powershell
python cli_demo.py
```

종료는 `exit`입니다.

## Workflow

Workflow 원본:

- `backend/docs/workflow.mmd`
- `backend/docs/workflow.md`

API로도 확인할 수 있습니다.

```powershell
curl http://127.0.0.1:8001/agent/workflow-mermaid
```

핵심 흐름:

```text
START
-> input_validation_node
-> route_after_validation
   -> clarification_node 또는 job_posting_analysis_node
-> user_profile_analysis_node
-> rag_retrieval_node
-> gap_analysis_node
-> route_after_gap_analysis
   -> clarification_node 또는 tool_selection_node
-> project_recommendation_node
-> roadmap_generation_node
-> final_report_node
-> END
```

## 검증

```powershell
cd C:\Ucode\11_AIboot_FINAL
.\.venv\Scripts\Activate.ps1
python -m compileall backend
cd backend
python cli_demo.py --sample --once
```

## 참고

발표와 제출 문서 기준은 루트 `README.md`입니다. 이 파일은 backend 실행을 빠르게 확인하기 위한 요약 문서입니다.
