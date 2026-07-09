# JobFit Agent 기술 설계서

## 1. 전체 기술 스택

MVP 기본 기술 스택은 다음과 같다.

| 영역 | 기술 | 역할 |
| --- | --- | --- |
| 프레임워크 | Next.js App Router | 화면, 서버 API Route, 서버/클라이언트 경계 구성 |
| 언어 | TypeScript | 입력/출력 타입 안정성 확보 |
| UI | Tailwind CSS | 한국어 UI 스타일링 |
| 검증 | Zod | 요청 데이터, AI 응답, API 응답 검증 |
| AI SDK | OpenAI JavaScript SDK | 서버에서만 OpenAI API 호출 |
| 브라우저 저장소 | localStorage | 비민감 UI 상태 저장 |
| 리포트 | Markdown Export | 분석 결과를 Markdown 문서로 내보내기 |

환경변수는 다음만 사용한다.

| 환경변수 | 필수 여부 | 설명 |
| --- | --- | --- |
| `OPENAI_API_KEY` | `MOCK_AI=false`일 때 필수 | 서버에서만 사용하는 OpenAI API Key |
| `OPENAI_MODEL` | `MOCK_AI=false`일 때 필수 | 사용할 모델명 |
| `MOCK_AI` | 선택 | `true`면 OpenAI API 호출 없이 Mock 결과 반환 |

모델명은 코드에 고정하지 않는다. `MOCK_AI=false`인데 `OPENAI_API_KEY` 또는 `OPENAI_MODEL`이 없으면 서버 설정 오류로 처리한다.

## 2. 폴더 구조

MVP 기준 폴더 구조는 다음과 같이 설계한다.

```text
app/
  page.tsx
  layout.tsx
  api/
    analyze/
      route.ts
components/
  jobfit-form.tsx
  analysis-result.tsx
  markdown-report.tsx
lib/
  schemas/
    jobfit.ts
  server/
    env.ts
    llm-adapter.ts
    openai-adapter.ts
    mock-adapter.ts
    analysis-pipeline.ts
    privacy.ts
    markdown.ts
  client/
    storage.ts
docs/
  PRD.md
  TECH_DESIGN.md
```

원칙:

- `lib/server/*`는 서버 전용 코드다.
- 클라이언트 컴포넌트는 `lib/server/*`를 import하지 않는다.
- 공유 가능한 Zod Schema와 타입은 `lib/schemas/*`에 둔다.
- API Route는 얇게 유지하고 실제 분석 흐름은 `analysis-pipeline`에 둔다.
- MVP에서는 DB 폴더, RAG 폴더, 인증 폴더를 만들지 않는다.

## 3. 클라이언트와 서버 책임 분리

### 클라이언트 책임

- 한국어 입력 폼 렌더링
- 기본 필수값 검증과 길이 안내
- `/api/analyze`로 분석 요청
- 로딩, 성공, 실패 상태 표시
- 구조화 결과와 Markdown 리포트 표시
- Markdown 파일 다운로드 또는 복사 기능 제공
- localStorage에 비민감 UI 상태만 저장

클라이언트가 하지 않는 것:

- OpenAI SDK import
- API Key 접근
- 모델명 결정
- 서버 전용 Adapter import
- 자기소개서, 프로젝트 경험, 개인정보 localStorage 저장

### 서버 책임

- 요청 본문 Zod 검증
- 개인정보 마스킹
- OpenAI 또는 Mock Adapter 선택
- OpenAI API 호출
- AI 응답 Zod 검증
- Markdown 리포트 생성
- 에러 응답 표준화
- 민감 입력값 미저장 원칙 유지

## 4. OpenAI API 호출 구조

OpenAI API 호출은 서버 Route에서만 시작한다.

흐름:

1. 클라이언트가 `/api/analyze`에 입력 데이터를 전송한다.
2. API Route가 요청 데이터를 Zod로 검증한다.
3. 서버가 `MOCK_AI` 값을 확인한다.
4. `MOCK_AI=true`면 Mock Adapter를 사용한다.
5. `MOCK_AI=false`면 OpenAI Adapter를 사용한다.
6. OpenAI Adapter는 서버 환경변수의 `OPENAI_API_KEY`, `OPENAI_MODEL`을 사용한다.
7. AI 응답은 JSON Schema 기반 구조화 출력으로 요청한다.
8. 서버는 응답을 Zod로 다시 검증한다.
9. 서버는 검증된 결과로 Markdown 리포트를 생성해 반환한다.

공식 OpenAI 문서 기준으로 OpenAI JavaScript SDK는 서버 사이드 JavaScript 환경에서 사용하고, 구조화 출력은 JSON Schema 준수를 우선한다.

## 5. LLM Adapter 설계

LLM Adapter는 AI 호출 구현을 숨기는 서버 전용 인터페이스다.

목표:

- API Route가 OpenAI SDK 세부 구현을 몰라도 되게 한다.
- Mock 모드와 실제 OpenAI 호출을 같은 호출 형태로 다룬다.
- 향후 다른 모델 또는 RAG 파이프라인을 붙일 때 변경 범위를 줄인다.

MVP Adapter 구성:

| 구성요소 | 위치 | 책임 |
| --- | --- | --- |
| LLM Adapter 타입 | `lib/server/llm-adapter.ts` | 분석 요청을 받고 구조화 결과를 반환하는 서버 전용 계약 |
| OpenAI Adapter | `lib/server/openai-adapter.ts` | OpenAI SDK 호출, JSON Schema 응답 요청 |
| Mock Adapter | `lib/server/mock-adapter.ts` | 고정된 데모 응답 반환 |
| Adapter 선택 함수 | `lib/server/analysis-pipeline.ts` | `MOCK_AI` 값에 따라 Adapter 선택 |

MVP에서는 Adapter를 하나의 분석 메서드로 제한한다. 공고 분석, 역량 분석, 로드맵 생성을 여러 API 호출로 쪼개지 않는다. 한 번의 구조화 출력으로 필요한 결과를 받는 편이 단순하다.

## 6. Mock AI 모드 설계

`MOCK_AI=true`일 때는 OpenAI API Key 없이도 데모가 가능해야 한다.

Mock 모드 원칙:

- OpenAI SDK를 초기화하지 않는다.
- `OPENAI_API_KEY`가 없어도 동작한다.
- 입력값 일부를 반영하되, 개인정보 원문을 그대로 반복하지 않는다.
- 실제 AI 응답과 같은 Zod Output Schema를 만족해야 한다.
- 결과 화면과 Markdown Export를 실제 모드와 동일하게 검증할 수 있어야 한다.

Mock 응답은 고정된 구조를 사용한다.

- 공고 분석 샘플
- 사용자 강점 샘플
- 역량 갭 샘플
- 학습 로드맵 샘플
- 프로젝트 추천 샘플
- Markdown 리포트 생성에 필요한 필드

Mock 모드는 UI 개발, 데모, API Key 없는 로컬 확인에만 사용한다.

## 7. Zod Schema 기반 데이터 구조

Zod Schema는 세 계층으로 둔다.

| Schema | 위치 | 용도 |
| --- | --- | --- |
| AnalyzeInputSchema | `lib/schemas/jobfit.ts` | 클라이언트 요청과 서버 입력 검증 |
| AnalysisResultSchema | `lib/schemas/jobfit.ts` | AI 구조화 응답 검증 |
| AnalyzeResponseSchema | `lib/schemas/jobfit.ts` | API 응답 검증과 클라이언트 표시 |

### AnalyzeInput 주요 필드

- `targetCompany`
- `targetRole`
- `jobPostingText`
- `companyValuesText`
- `techStack`
- `projectExperience`
- `personalStatement`
- `preparationPeriod`
- `availableStudyTime`
- `constraints`

### AnalysisResult 주요 필드

- `jobAnalysis`
- `userProfileAnalysis`
- `skillGaps`
- `priorities`
- `learningRoadmap`
- `projectRecommendations`
- `projectDifficulty`
- `executionRoadmap`
- `personalStatementFeedback`
- `humanReviewNotes`
- `warnings`

### AnalyzeResponse 주요 필드

- `result`
- `markdownReport`
- `meta`

`meta`에는 Mock 여부, 생성 시간, 모델명 표시 가능 여부를 둔다. 단, API Key나 민감 입력값은 포함하지 않는다.

## 8. API Route 설계

MVP API Route는 하나만 둔다.

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/analyze` | JobFit 분석 실행 |

### 요청

- Content-Type: `application/json`
- Body: `AnalyzeInputSchema`

### 성공 응답

- HTTP 200
- Body: `AnalyzeResponseSchema`
- 포함 내용: 구조화 분석 결과, Markdown 리포트, 비민감 메타데이터

### 실패 응답

- HTTP 400: 입력 검증 실패
- HTTP 413: 입력 길이 초과
- HTTP 500: 서버 설정 오류 또는 예상하지 못한 서버 오류
- HTTP 502: OpenAI API 실패 또는 AI 응답 구조 검증 실패

MVP에서는 별도 세션 API, 저장 API, 히스토리 API를 만들지 않는다.

## 9. 입력 검증 방식

입력 검증은 클라이언트와 서버에서 모두 수행한다.

### 클라이언트 검증

- 필수 필드 누락 안내
- 너무 짧은 공고 또는 프로젝트 경험 안내
- 너무 긴 입력에 대한 사전 안내
- 민감정보 입력 주의 문구 표시

### 서버 검증

- Zod Schema로 타입, 필수값, 문자열 길이 검증
- 빈 문자열 trim 처리
- 배열 입력이 필요한 경우 최소 항목 수 검증
- 전체 요청 크기 제한
- 검증 실패 시 OpenAI API 호출 전 종료

서버 검증이 최종 기준이다. 클라이언트 검증은 사용자 경험 개선용으로만 본다.

## 10. 개인정보 마스킹 방식

MVP에서는 개인정보를 저장하지 않는다. 그래도 사용자가 실수로 입력할 수 있으므로 서버에서 OpenAI 호출 전 기본 마스킹을 수행한다.

마스킹 대상:

- 이메일 주소
- 전화번호
- 주민등록번호 형태
- 주소로 추정되는 긴 패턴
- 계좌번호로 추정되는 숫자 묶음

처리 원칙:

- 마스킹은 서버에서 수행한다.
- 마스킹된 텍스트만 OpenAI Adapter에 전달한다.
- 서버 로그에는 원문 입력을 남기지 않는다.
- 마스킹 결과는 분석 품질을 크게 해치지 않는 범위에서만 적용한다.
- MVP에서는 정규식 기반 마스킹만 사용한다.

마스킹은 보조 안전장치다. UI에서도 민감정보를 입력하지 말라고 안내한다.

## 11. 분석 파이프라인

MVP 분석 파이프라인은 다음 순서로 동작한다.

```text
Client Form
  -> POST /api/analyze
  -> AnalyzeInputSchema 검증
  -> 개인정보 마스킹
  -> LLM Adapter 선택
  -> Mock 또는 OpenAI 분석 실행
  -> AnalysisResultSchema 검증
  -> Markdown 리포트 생성
  -> AnalyzeResponseSchema 검증
  -> Client Result 렌더링
```

분석 단계는 다음 논리 섹션을 가진다.

1. 공고 분석: 담당업무, 필수사항, 우대사항, 인재상 추출
2. 사용자 분석: 기술스택, 프로젝트 경험, 자기소개서 근거 정리
3. 갭 분석: 일치, 부족, 근거 부족 구분
4. 우선순위화: 준비 기간과 난이도 기준 정렬
5. 학습 로드맵: 기간별 학습 계획 생성
6. 프로젝트 추천: 기존 프로젝트 보완 또는 신규 프로젝트 제안
7. Human Review: 사용자가 검토해야 할 위험 문장 표시
8. Markdown 리포트 생성

MVP에서는 여러 에이전트나 멀티스텝 도구 호출을 만들지 않는다.

## 12. 결과 리포트 생성 방식

Markdown 리포트는 AI가 직접 자유롭게 작성한 긴 문장이 아니라, 검증된 `AnalysisResult`를 서버에서 템플릿에 끼워 넣어 생성한다.

리포트 구성:

- 제목
- 입력 요약
- 채용공고 분석
- 사용자 역량 분석
- 역량 갭
- 학습 로드맵
- 프로젝트 추천
- 실행 로드맵
- 자기소개서 또는 경험 서술 개선 포인트
- Human Review 체크리스트
- 주의사항

생성 원칙:

- Markdown 생성은 서버에서 수행한다.
- 클라이언트는 받은 Markdown 문자열을 표시하거나 다운로드한다.
- 리포트에는 API Key, 원문 개인정보, 서버 내부 오류를 포함하지 않는다.
- AI가 단정한 합격 가능성 표현을 만들지 않도록 주의 문구를 포함한다.

## 13. 에러 처리 정책

에러 응답은 한국어 메시지와 기계가 읽을 수 있는 코드를 함께 반환한다.

| 에러 코드 | HTTP | 상황 | 처리 |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 필수값 누락, 타입 오류 | 누락 또는 오류 필드 안내 |
| `PAYLOAD_TOO_LARGE` | 413 | 입력 길이 초과 | 핵심 내용만 줄여 입력 안내 |
| `SERVER_CONFIG_ERROR` | 500 | 환경변수 누락 | 관리자 설정 문제 안내 |
| `AI_REQUEST_FAILED` | 502 | OpenAI API 호출 실패 | 재시도 안내 |
| `AI_RESPONSE_INVALID` | 502 | AI 응답이 Schema와 불일치 | 재시도 안내 |
| `UNKNOWN_ERROR` | 500 | 예상하지 못한 오류 | 일반 오류 안내 |

로그 정책:

- 원문 자기소개서, 프로젝트 경험, 연락처를 로그로 남기지 않는다.
- 요청 ID, 에러 코드, Mock 여부, 처리 시간 같은 비민감 정보만 남긴다.
- OpenAI API 오류 원문에 민감정보가 포함될 가능성이 있으면 그대로 클라이언트에 전달하지 않는다.

## 14. 테스트 전략

MVP 테스트는 작은 범위부터 시작한다.

### 단위 테스트

- Zod 입력 Schema 검증
- AnalysisResultSchema 검증
- 개인정보 마스킹 함수
- Markdown 리포트 생성 함수
- Mock Adapter 응답 구조 검증

### API 테스트

- 정상 입력 시 200 응답
- 필수값 누락 시 400 응답
- 길이 초과 시 413 응답
- `MOCK_AI=true`에서 API Key 없이 성공
- `MOCK_AI=false`에서 환경변수 누락 시 500 응답

### 수동 확인

- 입력 화면에서 분석 요청
- 결과 화면 렌더링
- Markdown 복사 또는 다운로드
- 네트워크 실패 메시지
- 클라이언트 번들에 `OPENAI_API_KEY`가 포함되지 않는지 확인

빌드 확인 기준:

- TypeScript 타입 오류 없음
- 린트 오류 없음
- 서버 전용 코드가 클라이언트에 import되지 않음
- Mock 모드로 로컬 데모 가능

## 15. 향후 DB/RAG 확장 가능 구조

MVP에서는 DB와 본격 RAG를 제외한다. 다만 나중에 확장할 수 있도록 경계만 준비한다.

### DB 확장

추후 로그인과 저장 기능이 필요해지면 다음 데이터를 DB로 옮길 수 있다.

- 사용자 프로필
- 분석 히스토리
- 저장된 Markdown 리포트
- 프로젝트 포트폴리오
- 자기소개서 버전

확장 시 추가할 수 있는 폴더:

```text
lib/server/db/
lib/server/repositories/
```

MVP에서는 이 폴더를 만들지 않는다.

### RAG 확장

추후 회사별 공고, 인재상, 직무 템플릿을 검색해야 하면 RAG를 추가한다.

확장 후보:

- 채용공고 문서 저장
- 회사 인재상 문서 저장
- 직무별 역량 템플릿 검색
- 사용자 프로젝트 문서 검색
- 벡터 DB 기반 유사 문서 검색

확장 시 추가할 수 있는 폴더:

```text
lib/server/rag/
lib/server/retrievers/
```

MVP에서는 벡터 DB, 임베딩 저장, 자동 크롤링을 만들지 않는다. 현재 구조에서는 LLM Adapter 앞에 검색 컨텍스트를 추가하는 방식으로 확장한다.

## 참고한 공식 문서

- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI SDKs and CLI: https://developers.openai.com/api/docs/libraries
- OpenAI Text generation with Responses API: https://developers.openai.com/api/docs/guides/text
