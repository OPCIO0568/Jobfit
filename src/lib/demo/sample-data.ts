export type DemoJobFitForm = {
  targetRole: string;
  rawPosting: string;
  companyName: string;
  talentProfile: string;
  techStack: string;
  projectExperience: string;
  experienceNarrative: string;
  preparationPeriod: string;
  preferredProjectStyle: string;
  currentLevel: string;
};

export type DemoSample = {
  id: string;
  label: string;
  description: string;
  form: DemoJobFitForm;
};

export const demoSamples: DemoSample[] = [
  {
    id: "it-infra",
    label: "IT 인프라 직무",
    description: "운영 자동화, 모니터링, 장애 대응 중심 샘플",
    form: {
      targetRole: "IT 인프라 엔지니어",
      companyName: "가상 클라우드 운영팀",
      rawPosting: `담당업무
- 사내 서비스와 개발 환경의 Linux 서버 운영
- 네트워크, 계정, 권한, 배포 환경 점검
- 모니터링 지표 기반 장애 원인 분석 및 재발 방지 문서화
- 반복 운영 작업의 스크립트 자동화

필수사항
- Linux 기본 명령어와 시스템 로그 분석 경험
- TCP/IP, DNS, 방화벽 등 네트워크 기본 이해
- Bash 또는 Python 기반 자동화 경험
- 장애 대응 기록과 운영 문서 작성 능력

우대사항
- Docker, Nginx, GitHub Actions 또는 유사 CI/CD 경험
- Prometheus, Grafana 등 모니터링 도구 이해
- 보안 점검 체크리스트 작성 경험`,
      talentProfile: `문제를 숨기지 않고 기록하는 사람을 선호합니다.
운영 자동화와 재발 방지에 관심이 있으며, 장애 상황에서 침착하게 우선순위를 정할 수 있어야 합니다.
팀과 지식을 공유하고, 문서로 남겨 다음 담당자가 이어받을 수 있게 만드는 태도를 중요하게 봅니다.`,
      techStack:
        "Linux, Bash, Python, Docker, Nginx, Git, GitHub Actions, Grafana",
      projectExperience: `홈랩 서버 운영 자동화 프로젝트
- Ubuntu 서버에 Nginx reverse proxy와 Docker Compose 기반 서비스를 구성했습니다.
- 배포 명령을 Bash 스크립트로 정리하고, 로그 확인 절차를 README에 문서화했습니다.
- 장애 상황을 가정해 포트 충돌, 컨테이너 재시작, 디스크 사용량 점검 체크리스트를 만들었습니다.
- 결과물: 운영 README, 배포 스크립트, 장애 대응 체크리스트`,
      experienceNarrative: `저는 작은 서버 운영 환경을 직접 구성하면서 장애가 났을 때 빠르게 원인을 좁히는 과정의 중요성을 배웠습니다.
처음에는 설정을 기억에 의존했지만, 이후에는 명령어와 판단 기준을 README에 정리했습니다.
반복되는 확인 작업은 스크립트로 줄였고, 다음에는 모니터링 지표와 알림까지 연결해 운영 품질을 높이고 싶습니다.`,
      preparationPeriod: "8주",
      preferredProjectStyle: "개인",
      currentLevel: "중급",
    },
  },
  {
    id: "embedded-software",
    label: "임베디드 소프트웨어 직무",
    description: "MCU, 센서, 통신, 디버깅 중심 샘플",
    form: {
      targetRole: "임베디드 소프트웨어 개발자",
      companyName: "가상 모빌리티 제어팀",
      rawPosting: `담당업무
- MCU 기반 제어 펌웨어 개발 및 보드 bring-up
- 센서 입력 처리, 통신 프로토콜 연동, 상태 머신 구현
- UART, CAN, I2C 등 주변장치 디버깅
- 테스트 로그 기반 문제 분석 및 재현 절차 문서화

필수사항
- C/C++ 기반 임베디드 개발 경험
- MCU GPIO, timer, interrupt 기본 이해
- UART 또는 CAN 통신 디버깅 경험
- 회로도와 데이터시트를 읽고 원인을 추적하는 능력

우대사항
- FreeRTOS 또는 유사 RTOS 경험
- PlatformIO, ESP-IDF, STM32CubeIDE 등 개발 환경 경험
- logic analyzer, oscilloscope를 활용한 신호 검증 경험`,
      talentProfile: `하드웨어와 소프트웨어 경계에서 원인을 차분히 좁히는 태도를 중요하게 봅니다.
문제가 생겼을 때 추측만 하지 않고 로그, 파형, 코드 경로를 함께 확인하는 사람을 선호합니다.
팀원이 재현할 수 있도록 테스트 조건과 결과를 명확히 남기는 문화를 지향합니다.`,
      techStack:
        "C, C++, ESP32, PlatformIO, FreeRTOS, UART, CAN, GPIO, logic analyzer",
      projectExperience: `ESP32 기반 센서/스위치 입력 제어 프로젝트
- GPIO 입력을 debouncing 처리하고 상태 변화에 따라 LED와 serial log를 출력했습니다.
- FreeRTOS task를 나누어 입력 감지와 상태 표시를 분리했습니다.
- UART 로그로 boot 상태와 입력 이벤트를 확인하고, 핀 설정 오류를 재현해 수정했습니다.
- 결과물: firmware source, pin map 문서, serial log 캡처, 테스트 절차 README`,
      experienceNarrative: `임베디드 프로젝트를 진행하며 코드가 업로드되는 것과 실제로 의도대로 동작하는 것은 다르다는 점을 배웠습니다.
문제가 생기면 먼저 핀맵, 로그, 전원 상태를 분리해서 확인했고, 재현 가능한 테스트 순서를 문서화했습니다.
앞으로는 CAN 통신과 RTOS task 설계를 더 체계적으로 정리해 포트폴리오로 증명하고 싶습니다.`,
      preparationPeriod: "12주",
      preferredProjectStyle: "상관없음",
      currentLevel: "중급",
    },
  },
  {
    id: "backend",
    label: "백엔드 개발 직무",
    description: "API, DB, 인증, 테스트, 배포 중심 샘플",
    form: {
      targetRole: "백엔드 개발자",
      companyName: "가상 B2B SaaS 개발팀",
      rawPosting: `담당업무
- REST API 설계 및 구현
- 데이터 모델링과 SQL 쿼리 성능 개선
- 인증/인가, 입력 검증, 에러 처리 정책 구현
- 테스트 코드와 API 문서 작성
- 배포 환경에서 로그를 확인하고 문제를 추적

필수사항
- Node.js 또는 Python 기반 API 서버 개발 경험
- 관계형 데이터베이스 스키마 설계 경험
- HTTP, 인증, 트랜잭션, 예외 처리 기본 이해
- Git 기반 협업과 코드 리뷰 경험

우대사항
- TypeScript, NestJS, FastAPI, PostgreSQL 경험
- Docker 기반 개발 환경 구성
- CI/CD, 테스트 자동화, 모니터링 경험`,
      talentProfile: `사용자 문제를 API와 데이터 모델로 명확히 풀어내는 개발자를 선호합니다.
빠르게 만드는 것뿐 아니라 입력 검증, 장애 대응, 문서화를 함께 고려하는 태도를 중요하게 봅니다.
불확실한 요구사항은 질문으로 좁히고, 결정 내용을 기록해 팀과 공유하는 문화를 지향합니다.`,
      techStack:
        "TypeScript, Node.js, Express, PostgreSQL, Prisma, Docker, Jest, GitHub Actions",
      projectExperience: `채용 준비 리포트 API 프로젝트
- 사용자의 입력을 Zod로 검증하고, 분석 결과를 JSON 형태로 반환하는 API를 구현했습니다.
- PostgreSQL 스키마를 설계하고 Prisma로 CRUD와 목록 조회를 구성했습니다.
- 에러 응답 형식을 통일하고 README에 API 요청/응답 예시를 정리했습니다.
- 결과물: API 명세, DB schema, 테스트 케이스, 배포 URL`,
      experienceNarrative: `백엔드 프로젝트에서 단순히 데이터를 저장하는 것보다 입력 검증과 에러 응답 형식이 중요하다는 점을 경험했습니다.
처음에는 기능 구현에 집중했지만, 테스트 케이스와 API 문서를 추가하면서 다른 사람이 사용할 수 있는 형태로 개선했습니다.
앞으로는 성능 측정, 인증/인가, 배포 후 로그 기반 문제 추적까지 보완하고 싶습니다.`,
      preparationPeriod: "8주",
      preferredProjectStyle: "개인",
      currentLevel: "중급",
    },
  },
];
