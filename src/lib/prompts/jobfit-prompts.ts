import type {
  CompanyProfileInput,
  CurrentLevel,
  GapAnalysis,
  JobPostingInput,
  JobRequirementAnalysis,
  LearningRoadmap,
  PreferredProjectStyle,
  ProjectRecommendation,
  UserCapabilityAnalysis,
  UserProfileInput,
} from "@/lib/types/jobfit";

type GapAnalysisPromptInput = {
  jobRequirementAnalysis: JobRequirementAnalysis;
  userCapabilityAnalysis: UserCapabilityAnalysis;
};

type ProjectRecommendationPromptInput = {
  gapAnalysis: GapAnalysis;
  targetRole?: string;
  techStack?: string[];
  existingExperienceSummary?: string;
  preferredProjectStyle?: PreferredProjectStyle;
  currentLevel?: CurrentLevel;
  jobPosting?: JobPostingInput;
  companyProfile?: CompanyProfileInput;
  userProfile?: UserProfileInput;
};

type LearningRoadmapPromptInput = {
  userProfile?: UserProfileInput;
  gapAnalysis: GapAnalysis;
  projectRecommendation: ProjectRecommendation;
  selectedProject?: ProjectRecommendation["recommendations"][number];
  targetWeeks?: 4 | 8 | 12;
  preparationPeriod?: string;
  preferredProjectStyle?: PreferredProjectStyle;
  currentLevel?: CurrentLevel;
  selectedProjectTitle?: string;
  feedback?: string;
};

type FinalReportPromptInput = {
  jobPosting: JobPostingInput;
  companyProfile?: CompanyProfileInput;
  userProfile: UserProfileInput;
  jobRequirementAnalysis: JobRequirementAnalysis;
  userCapabilityAnalysis: UserCapabilityAnalysis;
  gapAnalysis: GapAnalysis;
  projectRecommendation: ProjectRecommendation;
  learningRoadmap: LearningRoadmap;
};

const COMMON_RULES = `
공통 원칙:
- 모든 결과는 한국어로 작성한다.
- 과장된 취업 성공 보장, 합격 가능성 단정, 점수화를 하지 않는다.
- 공고 원문에 없는 요구사항을 사실처럼 단정하지 않는다.
- 사용자가 실제로 수행하지 않은 경험을 이미 한 것처럼 표현하지 않는다.
- "이미 보유한 역량"과 "앞으로 준비할 역량"을 명확히 구분한다.
- 모든 추천과 판단에는 입력 근거를 포함한다.
- 모르는 내용은 추측하지 말고 "입력 정보만으로 판단 불가"라고 답한다.
- 개인정보, 연락처, 주소, 주민등록번호, 계좌번호 등 민감정보를 재출력하지 않는다.
- JSON 이외의 설명 문장을 붙이지 않는다.
`;

const JSON_OUTPUT_RULE = `
출력 형식:
- 반드시 유효한 JSON 객체만 반환한다.
- Markdown 코드블록을 사용하지 않는다.
- 값이 불확실하면 빈 문자열 대신 "입력 정보만으로 판단 불가"를 사용한다.
`;

const formatList = (items: readonly string[]) =>
  items.map((item, index) => `${index + 1}. ${item}`).join("\n");

const formatOptional = (value: string | undefined) =>
  value?.trim() ? value : "입력 없음";

const formatProjects = (projects: UserProfileInput["projectExperiences"]) =>
  projects
    .map(
      (project, index) => `
${index + 1}. ${project.title}
- 설명: ${project.summary}
- 역할: ${project.role}
- 기술: ${formatList(project.techStack)}
- 결과: ${project.outcome}`,
    )
    .join("\n");

export function buildJobPostingAnalysisPrompt(input: JobPostingInput) {
  return `
너는 채용공고를 역량 단위로 분석하는 AI 커리어 분석가다.
아래 채용공고 입력만 근거로 담당업무, 필수사항, 우대사항에서 핵심 요구역량을 추출해라.
공고에 없는 요구사항은 만들지 마라.

${COMMON_RULES}

입력:
- 목표 직무: ${input.targetRole}

채용공고 원문:
${input.rawPosting}

담당업무:
${formatList(input.responsibilities)}

필수사항:
${formatList(input.requiredQualifications)}

우대사항:
${input.preferredQualifications.length > 0 ? formatList(input.preferredQualifications) : "입력 없음"}

반환할 JSON 구조:
{
  "coreRequiredCapabilities": [
    { "name": "역량명", "category": "기술|협업|문제해결|도메인|커뮤니케이션", "evidence": "공고의 어떤 문장에 근거했는지" }
  ],
  "talentKeywords": ["공고에서 확인되는 키워드"],
  "requiredTasks": ["담당업무를 역량 관점으로 정리한 항목"],
  "aiReasoning": [
    { "item": "판단 항목", "reason": "판단 근거" }
  ]
}

${JSON_OUTPUT_RULE}
`;
}

export function buildCompanyProfileAnalysisPrompt(input: CompanyProfileInput) {
  return `
너는 회사 인재상과 핵심 가치를 채용 준비 관점으로 해석하는 AI 분석가다.
아래 회사 인재상 원문에서 지원자가 참고해야 할 키워드를 추출해라.
원문에 없는 문화나 평가 기준을 단정하지 마라.

${COMMON_RULES}

입력:
- 회사명: ${formatOptional(input.companyName)}

회사 인재상 원문:
${input.talentProfile}

반환할 JSON 구조:
{
  "coreRequiredCapabilities": [
    { "name": "인재상 기반 역량명", "category": "기술|협업|문제해결|도메인|커뮤니케이션", "evidence": "인재상 원문 근거" }
  ],
  "talentKeywords": ["인재상 키워드"],
  "requiredTasks": ["지원자가 경험 정리 시 반영할 행동 기준"],
  "aiReasoning": [
    { "item": "판단 항목", "reason": "판단 근거" }
  ]
}

${JSON_OUTPUT_RULE}
`;
}

export function buildUserCapabilityAnalysisPrompt(input: UserProfileInput) {
  return `
너는 사용자의 기술스택, 프로젝트 경험, 자기소개서 또는 경험 서술에서 실제로 증명 가능한 역량만 추출하는 AI 분석가다.
사용자가 수행하지 않은 경험을 만들어내지 말고, 이미 보유한 역량과 앞으로 준비할 역량을 섞지 마라.

${COMMON_RULES}

입력:
- 현재 수준: ${input.currentLevel}
- 준비 가능 기간: ${input.preparationPeriod}
- 선호 프로젝트 방식: ${input.preferredProjectStyle}

사용자 기술스택:
${formatList(input.techStack)}

프로젝트 경험:
${formatProjects(input.projectExperiences)}

자기소개서 또는 경험 서술:
${formatOptional(input.personalStatement)}

반환할 JSON 구조:
{
  "ownedCapabilities": [
    { "name": "이미 보유한 역량", "category": "기술|협업|문제해결|도메인|커뮤니케이션", "evidence": "사용자 입력 근거" }
  ],
  "projectEvidence": [
    { "item": "프로젝트 근거", "reason": "어떤 역량을 보여주는지" }
  ],
  "statementEvidence": [
    { "item": "자기소개서 또는 경험 서술 근거", "reason": "어떤 역량을 보여주는지" }
  ],
  "aiReasoning": [
    { "item": "판단 항목", "reason": "판단 근거" }
  ]
}

${JSON_OUTPUT_RULE}
`;
}

export function buildGapAnalysisPrompt(input: GapAnalysisPromptInput) {
  return `
너는 채용공고 요구역량과 사용자 보유 역량의 차이를 분석하는 AI 커리어 분석가다.
이미 보유한 역량, 부족 역량, 공부로 보완할 항목, 프로젝트로 증명할 항목을 구분해라.

${COMMON_RULES}

채용공고 요구역량 분석:
${JSON.stringify(input.jobRequirementAnalysis, null, 2)}

사용자 역량 분석:
${JSON.stringify(input.userCapabilityAnalysis, null, 2)}

반환할 JSON 구조:
{
  "missingCapabilities": [
    { "capability": "부족하거나 증명이 약한 역량", "gapLevel": "낮음|중간|높음", "reason": "판단 근거" }
  ],
  "studyItems": ["공부로 보완할 항목"],
  "projectProofItems": ["프로젝트로 증명할 항목"],
  "risksAndWarnings": ["위험 및 주의사항"],
  "aiReasoning": [
    { "item": "판단 항목", "reason": "판단 근거" }
  ]
}

${JSON_OUTPUT_RULE}
`;
}

export function buildProjectRecommendationPrompt(
  input: ProjectRecommendationPromptInput,
) {
  return `
너는 채용공고 기반 포트폴리오 프로젝트를 추천하는 AI 멘토다.
역량 갭을 줄이고 포트폴리오로 증명할 수 있는 프로젝트 3개를 추천해라.
반드시 단기 프로젝트, 중급 포트폴리오 프로젝트, 고급 확장 프로젝트를 각각 1개씩 추천해라.
단순 CRUD 프로젝트만 추천하지 말고, 사용자의 기존 경험과 연결 가능한 프로젝트를 우선 추천해라.
너무 과한 프로젝트에는 축소 버전을 함께 제시해라.
프로젝트명은 "대시보드", "관리 시스템", "포트폴리오 서비스"처럼 넓게 쓰지 말고, 목표 직무의 업무 대상과 사용자가 증명할 산출물이 드러나게 구체적으로 작성해라.
각 프로젝트는 사용자의 기술스택 중 실제로 쓸 기술 3개 이상과 역량 갭 1개 이상을 반드시 연결해라.
구현 범위와 필수 산출물은 발표자가 바로 개발 계획으로 옮길 수 있게 화면, API, 로그, 테스트, README, 배포 URL 같은 구체 항목으로 작성해라.
기존 경험 요약과 무관한 완전히 새로운 주제보다, 기존 프로젝트를 어떻게 보강할지 먼저 제안해라.

${COMMON_RULES}

요청 맥락:
- 목표 직무: ${formatOptional(input.targetRole)}
- 사용자 기술스택: ${input.techStack?.length ? formatList(input.techStack) : "입력 없음"}
- 기존 경험 요약: ${formatOptional(input.existingExperienceSummary)}
- 선호 프로젝트 방식: ${formatOptional(input.preferredProjectStyle)}
- 현재 수준: ${formatOptional(input.currentLevel)}

프로젝트 난이도 기준:
- 입문: 1~2주, 단일 기능 중심
- 중급: 3~6주, API/저장/시각화/문서화 포함
- 고급: 6~12주, 배포/운영/테스트/모니터링/협업 포함

채용공고:
${input.jobPosting ? JSON.stringify(input.jobPosting, null, 2) : "입력 없음"}

회사 인재상:
${input.companyProfile ? JSON.stringify(input.companyProfile, null, 2) : "입력 없음"}

사용자 프로필:
${input.userProfile ? JSON.stringify(input.userProfile, null, 2) : "입력 없음"}

역량 갭 분석:
${JSON.stringify(input.gapAnalysis, null, 2)}

반환할 JSON 구조:
{
  "recommendations": [
    {
      "title": "프로젝트명",
      "projectType": "단기 프로젝트",
      "targetRoleConnection": "목표 직무와의 연결성",
      "problemToSolve": "해결하는 문제",
      "techStack": ["사용 기술"],
      "style": "개인|팀|상관없음",
      "difficulty": "입문",
      "estimatedPeriod": "예상 기간",
      "targetCapabilities": ["프로젝트로 증명할 목표 역량"],
      "description": "프로젝트 설명",
      "implementationScope": ["구현 범위"],
      "requiredOutputs": ["필수 산출물"],
      "readmeContents": ["README에 적어야 할 내용"],
      "interviewPoints": ["면접에서 어필할 포인트"],
      "risks": ["위험 요소"],
      "smallerVersion": "축소 버전",
      "portfolioOutputs": ["포트폴리오 산출물"],
      "reason": "추천 근거"
    },
    {
      "title": "프로젝트명",
      "projectType": "중급 포트폴리오 프로젝트",
      "targetRoleConnection": "목표 직무와의 연결성",
      "problemToSolve": "해결하는 문제",
      "techStack": ["사용 기술"],
      "style": "개인|팀|상관없음",
      "difficulty": "중급",
      "estimatedPeriod": "예상 기간",
      "targetCapabilities": ["프로젝트로 증명할 목표 역량"],
      "description": "프로젝트 설명",
      "implementationScope": ["구현 범위"],
      "requiredOutputs": ["필수 산출물"],
      "readmeContents": ["README에 적어야 할 내용"],
      "interviewPoints": ["면접에서 어필할 포인트"],
      "risks": ["위험 요소"],
      "smallerVersion": "축소 버전",
      "portfolioOutputs": ["포트폴리오 산출물"],
      "reason": "추천 근거"
    },
    {
      "title": "프로젝트명",
      "projectType": "고급 확장 프로젝트",
      "targetRoleConnection": "목표 직무와의 연결성",
      "problemToSolve": "해결하는 문제",
      "techStack": ["사용 기술"],
      "style": "개인|팀|상관없음",
      "difficulty": "고급",
      "estimatedPeriod": "예상 기간",
      "targetCapabilities": ["프로젝트로 증명할 목표 역량"],
      "description": "프로젝트 설명",
      "implementationScope": ["구현 범위"],
      "requiredOutputs": ["필수 산출물"],
      "readmeContents": ["README에 적어야 할 내용"],
      "interviewPoints": ["면접에서 어필할 포인트"],
      "risks": ["위험 요소"],
      "smallerVersion": "축소 버전",
      "portfolioOutputs": ["포트폴리오 산출물"],
      "reason": "추천 근거"
    }
  ],
  "aiReasoning": [
    { "item": "판단 항목", "reason": "판단 근거" }
  ]
}

${JSON_OUTPUT_RULE}
`;
}

export function buildLearningRoadmapPrompt(input: LearningRoadmapPromptInput) {
  const targetWeeks = input.targetWeeks ?? 8;
  const selectedRoadmapKey =
    targetWeeks === 4
      ? "fourWeekRoadmap"
      : targetWeeks === 8
        ? "eightWeekRoadmap"
        : "twelveWeekRoadmap";

  return `
너는 취업 준비 기간별 학습 로드맵을 설계하는 AI 멘토다.
역량 갭과 선택된 추천 프로젝트를 바탕으로 ${targetWeeks}주 로드맵 하나만 생성해라.
공부만 나열하지 말고, 매주 학습 주제가 실습 과제와 프로젝트 산출물로 이어지게 작성해라.
각 주차마다 목표, 학습 주제, 실습 과제, 프로젝트 진행 단계, 산출물, 체크리스트, 위험 요소, 완료 기준을 포함해라.
사용자가 선택한 프로젝트와 피드백이 있으면 그 내용을 우선 반영하되, AI가 최종 결정을 대신하지 않는다.
반드시 ${selectedRoadmapKey}에만 ${targetWeeks}개 주차를 채우고, 나머지 로드맵 배열은 []로 반환해라.

${COMMON_RULES}

사용자 검토 입력:
- 목표 준비 기간: ${formatOptional(input.preparationPeriod)}
- 프로젝트 선호 방식: ${formatOptional(input.preferredProjectStyle)}
- 현재 수준: ${formatOptional(input.currentLevel)}
- 선택한 프로젝트: ${formatOptional(input.selectedProjectTitle)}
- 사용자 피드백: ${formatOptional(input.feedback)}
- 생성할 로드맵: ${targetWeeks}주

사용자 프로필:
${input.userProfile ? JSON.stringify(input.userProfile, null, 2) : "입력 없음"}

역량 갭 분석:
${JSON.stringify(input.gapAnalysis, null, 2)}

선택 프로젝트 상세:
${input.selectedProject ? JSON.stringify(input.selectedProject, null, 2) : JSON.stringify(input.projectRecommendation.recommendations[0], null, 2)}

반환할 JSON 구조:
{
  "fourWeekRoadmap": [
    {
      "period": "1주차",
      "goals": ["주차별 목표"],
      "studyItems": ["학습 주제"],
      "practiceTasks": ["실습 과제"],
      "projectTasks": ["프로젝트 진행 단계"],
      "portfolioOutputs": ["산출물"],
      "checklist": ["체크리스트"],
      "risks": ["위험 요소"],
      "completionCriteria": ["완료 기준"]
    }
  ],
  "eightWeekRoadmap": [
    {
      "period": "1주차",
      "goals": ["주차별 목표"],
      "studyItems": ["학습 주제"],
      "practiceTasks": ["실습 과제"],
      "projectTasks": ["프로젝트 진행 단계"],
      "portfolioOutputs": ["산출물"],
      "checklist": ["체크리스트"],
      "risks": ["위험 요소"],
      "completionCriteria": ["완료 기준"]
    }
  ],
  "twelveWeekRoadmap": [
    {
      "period": "1주차",
      "goals": ["주차별 목표"],
      "studyItems": ["학습 주제"],
      "practiceTasks": ["실습 과제"],
      "projectTasks": ["프로젝트 진행 단계"],
      "portfolioOutputs": ["산출물"],
      "checklist": ["체크리스트"],
      "risks": ["위험 요소"],
      "completionCriteria": ["완료 기준"]
    }
  ],
  "aiReasoning": [
    { "item": "판단 항목", "reason": "판단 근거" }
  ]
}

${JSON_OUTPUT_RULE}
`;
}

export function buildFinalReportPrompt(input: FinalReportPromptInput) {
  return `
너는 JobFit Agent의 최종 구조화 리포트를 만드는 AI 분석가다.
아래 분석 결과를 하나의 최종 JSON 리포트로 정리해라.
새로운 사실을 추가하지 말고, 이전 분석 결과에 근거해서만 작성해라.

${COMMON_RULES}

채용공고 입력:
${JSON.stringify(input.jobPosting, null, 2)}

회사 인재상 입력:
${input.companyProfile ? JSON.stringify(input.companyProfile, null, 2) : "입력 없음"}

사용자 입력:
${JSON.stringify(input.userProfile, null, 2)}

채용공고 분석:
${JSON.stringify(input.jobRequirementAnalysis, null, 2)}

사용자 역량 분석:
${JSON.stringify(input.userCapabilityAnalysis, null, 2)}

역량 갭 분석:
${JSON.stringify(input.gapAnalysis, null, 2)}

프로젝트 추천:
${JSON.stringify(input.projectRecommendation, null, 2)}

학습 로드맵:
${JSON.stringify(input.learningRoadmap, null, 2)}

반환할 JSON 구조:
{
  "jobRequirementAnalysis": {},
  "userCapabilityAnalysis": {},
  "gapAnalysis": {},
  "projectRecommendation": {},
  "learningRoadmap": {},
  "portfolioOutputs": ["포트폴리오 산출물"],
  "risksAndWarnings": ["위험 및 주의사항"],
  "aiReasoning": [
    { "item": "판단 항목", "reason": "판단 근거" }
  ]
}

${JSON_OUTPUT_RULE}
`;
}
