# SW/IT 17개 직무 역량과 추천 CS 지식 RAG 문서

이 문서는 JobFit Agent의 로컬 RAG 검색 대상이다. 특정 기업 공고를 복사한 자료가 아니라 SW/IT 직무 전반에 공통적으로 적용할 수 있는 일반화된 역량 기준이다.

## 1. 공통 SW/IT 기본 역량

모든 SW/IT 직무는 담당 범위가 달라도 다음 기본기를 갖추면 채용공고 해석과 포트폴리오 설계에 도움이 된다.

- 문제 정의: 사용자의 불편, 비즈니스 목표, 기술 제약을 구분한다.
- 요구사항 분석: 기능 요구사항, 비기능 요구사항, 우선순위를 나눈다.
- 문서화: 결정 이유, 테스트 결과, 장애 원인, 회고를 남긴다.
- 협업: Git, 이슈 관리, 코드 리뷰, 회의록, 역할 분담을 기록한다.
- 데이터 기반 판단: 로그, 지표, 테스트 결과, 사용자 피드백을 근거로 판단한다.
- 보안 기본: 인증, 권한, 개인정보, secret 관리, 입력 검증을 고려한다.
- 운영 관점: 배포, 모니터링, 장애 대응, 백업, 복구 절차를 이해한다.

## 2. 공통 추천 CS 지식

- 컴퓨터 구조: CPU, 메모리, I/O, 캐시, 프로세스 실행 흐름
- 운영체제: process, thread, scheduling, file system, memory management
- 네트워크: TCP/IP, DNS, HTTP/HTTPS, TLS, port, proxy, load balancing
- 데이터베이스: schema, index, transaction, isolation level, query plan
- 자료구조와 알고리즘: array, list, hash, tree, graph, sorting, search, complexity
- 소프트웨어 공학: 요구사항, 설계, 테스트, 유지보수, 리팩터링, 코드 리뷰
- API 설계: REST, status code, pagination, idempotency, error response, OpenAPI
- 테스트: unit test, integration test, e2e test, regression test, test case design
- 보안: authentication, authorization, encryption, OWASP Top 10, least privilege
- 클라우드/DevOps: container, CI/CD, environment variable, monitoring, logging
- UX 기본: 사용자 흐름, 정보 구조, 접근성, 피드백, 오류 메시지

## 3. 17개 직무별 필수 역량과 추천 CS 지식

### 1. IT 기획자

- 필수 역량: 서비스 문제 정의, 요구사항 정리, 정책/화면/API 요구사항 연결, 이해관계자 조율
- 추천 CS 지식: HTTP 기본, 데이터 흐름, API 개념, DB 기본 구조, 보안/개인정보 기본
- 포트폴리오 근거: 요구사항 정의서, 사용자 시나리오, 우선순위 표, 정책 결정 근거

### 2. IT 컨설턴트

- 필수 역량: 현황 진단, 개선 방향 제안, 비용/효과 비교, 기술 도입 타당성 검토
- 추천 CS 지식: 시스템 아키텍처, 클라우드 기본, 보안 기본, 데이터/업무 프로세스 모델링
- 포트폴리오 근거: AS-IS/TO-BE 분석, 개선안, 리스크 표, 의사결정 근거

### 3. 업무분석가

- 필수 역량: 업무 프로세스 분석, 요구사항 도출, 데이터 흐름 파악, 정책 예외 정리
- 추천 CS 지식: DB schema, ERD, API request/response, 상태 전이, validation rule
- 포트폴리오 근거: 프로세스 다이어그램, 요구사항 추적표, 예외 케이스, 승인 흐름

### 4. 데이터분석가

- 필수 역량: 데이터 수집/정제, SQL 분석, 지표 정의, 시각화, 분석 결과 해석
- 추천 CS 지식: SQL, 통계 기초, 데이터 모델링, ETL, index, sampling, dashboard
- 포트폴리오 근거: 분석 노트북, SQL 쿼리, KPI 정의서, 시각화, 의사결정 제안

### 5. IT PM

- 필수 역량: 일정/범위/리스크 관리, 역할 분담, 요구사항 변경 관리, 커뮤니케이션
- 추천 CS 지식: 개발 생명주기, Git workflow, API/DB 기본, 테스트/배포 흐름
- 포트폴리오 근거: WBS, 이슈 관리 기록, 회의록, 리스크 대응표, 릴리즈 계획

### 6. IT 아키텍트

- 필수 역량: 시스템 구조 설계, 기술 선택, 확장성/성능/보안 고려, 표준화
- 추천 CS 지식: system design, network, DB transaction, cache, message queue, cloud architecture
- 포트폴리오 근거: 아키텍처 다이어그램, 기술 선택 근거, 장애/확장 시나리오, 대안 비교

### 7. UI/UX 기획/개발자

- 필수 역량: 사용자 흐름 설계, 화면 요구사항 정의, 프론트엔드 구현 이해, 사용성 검증
- 추천 CS 지식: browser rendering, HTTP, state management, accessibility, performance
- 포트폴리오 근거: user flow, wireframe, component spec, 사용성 테스트, 개선 전후 비교

### 8. UI/UX 디자이너

- 필수 역량: 정보 구조, 사용자 리서치, 인터랙션 설계, 디자인 시스템, 접근성
- 추천 CS 지식: 웹 접근성, 반응형 레이아웃, 디자인 토큰, 프론트엔드 제약, 사용자 데이터 해석
- 포트폴리오 근거: 리서치 근거, IA, 와이어프레임, 프로토타입, 디자인 시스템

### 9. 응용 SW 개발자

- 필수 역량: 애플리케이션 기능 구현, API 연동, 상태 관리, 예외 처리, 테스트
- 추천 CS 지식: 자료구조, 알고리즘, OS 기본, network, DB, OOP/FP, software design pattern
- 포트폴리오 근거: 기능 설계, 핵심 코드, 테스트 결과, 에러 처리, 사용자 흐름

### 10. 시스템 SW 개발자

- 필수 역량: OS/시스템 API 이해, 성능/자원 관리, low-level debugging, 안정성 확보
- 추천 CS 지식: OS, computer architecture, C/C++, memory, thread, synchronization, file system
- 포트폴리오 근거: 성능 측정, 디버깅 로그, 메모리/스레드 이슈 해결, 테스트 케이스

### 11. 정보시스템운영자

- 필수 역량: 서버/서비스 운영, 로그 확인, 장애 대응, 계정/권한 관리, 운영 문서화
- 추천 CS 지식: Linux, network, DB 운영, shell script, monitoring, backup/recovery
- 포트폴리오 근거: 운영 체크리스트, 장애 재현/복구 로그, 모니터링 화면, Runbook

### 12. IT 지원기술자

- 필수 역량: 사용자 문의 대응, PC/네트워크/시스템 기본 점검, 장애 접수/분류, 현장 지원
- 추천 CS 지식: OS 기본, network troubleshooting, security basics, log reading, ticket workflow
- 포트폴리오 근거: 장애 처리 기록, FAQ 문서, 점검 스크립트, 문제 재발 방지 조치

### 13. IT 감리

- 필수 역량: 요구사항/설계/구현/테스트 산출물 검토, 위험 식별, 품질 기준 점검
- 추천 CS 지식: SDLC, 요구사항 추적성, 테스트 전략, 보안 점검, 시스템 아키텍처
- 포트폴리오 근거: 체크리스트, 검토 의견서, 리스크 리포트, 개선 권고안

### 14. IT 품질관리자

- 필수 역량: 품질 기준 수립, 테스트 프로세스 관리, 결함 분석, 재발 방지
- 추천 CS 지식: software testing, defect lifecycle, CI, static analysis, quality metric
- 포트폴리오 근거: 품질 지표, 결함 분류표, 테스트 전략, 개선 전후 비교

### 15. IT 테스터

- 필수 역량: 테스트 케이스 설계, 기능/회귀/통합 테스트, 결함 보고, 재현 절차 작성
- 추천 CS 지식: test design technique, API testing, browser/devtool, SQL basic, automation testing
- 포트폴리오 근거: 테스트 케이스, 버그 리포트, 재현 영상/로그, 자동화 스크립트

### 16. 정보보안전문가

- 필수 역량: 취약점 진단, 보안 정책, 접근제어, 로그 분석, 침해 대응 기본
- 추천 CS 지식: network security, cryptography basic, OWASP Top 10, IAM, secure coding, threat modeling
- 포트폴리오 근거: 취약점 점검 리포트, 보안 체크리스트, 대응 절차, 안전한 코드 수정 사례

### 17. 사업/성과 분석 담당자

- 필수 역량: 서비스 성과 지표 정의, 데이터 기반 의사결정, 실험 결과 해석, 비즈니스 보고
- 추천 CS 지식: SQL, analytics event design, A/B test, funnel analysis, dashboard, data quality
- 포트폴리오 근거: KPI 정의서, 분석 리포트, 대시보드, 실험 결과, 개선 제안

## 4. 직무군별 추천 프로젝트 방향

- 전략/기획 직무군: 요구사항 정의서, 사용자 시나리오, 정책/예외 케이스 정리 프로젝트
- 분석/설계 직무군: ERD, 데이터 흐름도, 업무 프로세스 모델링, KPI 대시보드 프로젝트
- 구축/개발 직무군: API 서버, 시스템 모니터링, UI 구현, 테스트 자동화 프로젝트
- 테스트/품질 직무군: 테스트 케이스 관리, 결함 리포트, 회귀 테스트 자동화 프로젝트
- 운영/지원 직무군: 로그 분석, 장애 대응 Runbook, 서버 점검 자동화 프로젝트
- 보안 직무군: 취약점 점검 체크리스트, 인증/인가 개선, 보안 로그 분석 프로젝트
- 사업/성과 직무군: 서비스 지표 분석, 전환율 개선 제안, 실험 결과 리포트 프로젝트

## 5. 면접에서 자주 검증되는 공통 질문

- 이 직무에서 가장 중요한 문제는 무엇이라고 보았는가?
- 본인 프로젝트 산출물이 공고 요구역량을 어떻게 증명하는가?
- 단순 구현 외에 테스트, 운영, 보안, 문서화는 어떻게 고려했는가?
- 실패하거나 막힌 부분을 어떤 근거로 분석했는가?
- 팀 협업 과정에서 Git, 이슈, 리뷰, 회의록을 어떻게 남겼는가?
- 직무에 필요한 CS 기본기 중 현재 부족한 것은 무엇이고 어떻게 보완할 것인가?
