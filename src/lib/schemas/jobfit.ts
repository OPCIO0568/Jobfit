import { z } from "zod";

const ShortTextSchema = z.string().trim().min(1).max(200);
const LongTextSchema = z.string().trim().min(1).max(20000);
const TextListSchema = z.array(ShortTextSchema).min(1).max(20);

/**
 * 사용자가 선호하는 프로젝트 수행 방식을 검증합니다.
 */
export const PreferredProjectStyleSchema = z
  .enum(["개인", "팀", "상관없음"])
  .describe("사용자가 선호하는 프로젝트 수행 방식입니다.");

/**
 * 사용자의 현재 역량 수준을 검증합니다.
 */
export const CurrentLevelSchema = z
  .enum(["입문", "중급", "고급"])
  .describe("사용자가 스스로 평가한 현재 역량 수준입니다.");

/**
 * 추천 프로젝트의 예상 난이도를 검증합니다.
 */
export const ProjectDifficultySchema = z
  .enum(["입문", "중급", "고급"])
  .describe("추천 프로젝트의 예상 난이도입니다.");

/**
 * 채용공고 원문과 공고에서 분리 가능한 담당업무, 필수사항, 우대사항을 검증합니다.
 */
export const JobPostingInputSchema = z.object({
  rawPosting: LongTextSchema.describe("사용자가 붙여 넣은 채용공고 원문입니다."),
  targetRole: ShortTextSchema.describe("사용자가 지원하려는 목표 직무입니다."),
  responsibilities: TextListSchema.describe("채용공고의 담당업무 목록입니다."),
  requiredQualifications: TextListSchema.describe(
    "채용공고의 필수사항 또는 자격요건 목록입니다.",
  ),
  preferredQualifications: z
    .array(ShortTextSchema)
    .max(20)
    .default([])
    .describe("채용공고의 우대사항 목록입니다."),
});

/**
 * 회사 인재상과 기업 맥락을 검증합니다.
 */
export const CompanyProfileInputSchema = z.object({
  companyName: ShortTextSchema.optional().describe("지원 대상 회사명입니다."),
  talentProfile: LongTextSchema.describe("회사 인재상 또는 핵심 가치 원문입니다."),
});

const UserProjectExperienceSchema = z.object({
  title: ShortTextSchema.describe("프로젝트명입니다."),
  summary: z.string().trim().min(1).max(3000).describe("프로젝트 설명입니다."),
  role: ShortTextSchema.describe("프로젝트에서 사용자가 맡은 역할입니다."),
  techStack: TextListSchema.describe("프로젝트에서 사용한 기술스택입니다."),
  outcome: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe("프로젝트 결과물 또는 성과입니다."),
});

/**
 * 사용자의 기술스택, 프로젝트 경험, 자기소개서 또는 경험 서술을 검증합니다.
 */
export const UserProfileInputSchema = z.object({
  techStack: TextListSchema.describe("사용자가 보유한 기술스택 목록입니다."),
  projectExperiences: z
    .array(UserProjectExperienceSchema)
    .min(1)
    .max(10)
    .describe("사용자의 프로젝트 경험 목록입니다."),
  personalStatement: LongTextSchema.optional().describe(
    "자기소개서 초안 또는 경험 서술입니다.",
  ),
  preparationPeriod: ShortTextSchema.describe("취업 준비에 사용할 수 있는 기간입니다."),
  preferredProjectStyle: PreferredProjectStyleSchema,
  currentLevel: CurrentLevelSchema,
});

const EvidenceSchema = z.object({
  item: ShortTextSchema.describe("판단 대상 항목입니다."),
  reason: z.string().trim().min(1).max(1000).describe("AI 판단 근거입니다."),
});

const CapabilitySchema = z.object({
  name: ShortTextSchema.describe("역량명입니다."),
  category: z
    .enum(["기술", "협업", "문제해결", "도메인", "커뮤니케이션"])
    .describe("역량 분류입니다."),
  evidence: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe("해당 역량을 판단한 근거입니다."),
});

/**
 * 채용공고에서 추출한 핵심 요구역량과 인재상 키워드를 검증합니다.
 */
export const JobRequirementAnalysisSchema = z.object({
  coreRequiredCapabilities: z
    .array(CapabilitySchema)
    .min(1)
    .max(20)
    .describe("공고 기반 핵심 요구역량 목록입니다."),
  talentKeywords: TextListSchema.describe("회사 인재상에서 추출한 키워드입니다."),
  requiredTasks: TextListSchema.describe("공고 담당업무를 역량 관점으로 정리한 목록입니다."),
  aiReasoning: z
    .array(EvidenceSchema)
    .min(1)
    .max(10)
    .describe("공고 분석에 대한 AI 판단 근거입니다."),
});

/**
 * 사용자 입력에서 확인되는 보유 역량과 근거를 검증합니다.
 */
export const UserCapabilityAnalysisSchema = z.object({
  ownedCapabilities: z
    .array(CapabilitySchema)
    .min(1)
    .max(20)
    .describe("사용자가 이미 보유한 것으로 판단되는 역량입니다."),
  projectEvidence: z
    .array(EvidenceSchema)
    .min(1)
    .max(20)
    .describe("프로젝트 경험에서 확인되는 역량 근거입니다."),
  statementEvidence: z
    .array(EvidenceSchema)
    .max(10)
    .default([])
    .describe("자기소개서 또는 경험 서술에서 확인되는 역량 근거입니다."),
  aiReasoning: z
    .array(EvidenceSchema)
    .min(1)
    .max(10)
    .describe("사용자 역량 분석에 대한 AI 판단 근거입니다."),
});

const GapItemSchema = z.object({
  capability: ShortTextSchema.describe("부족하거나 증명이 약한 역량입니다."),
  gapLevel: z.enum(["낮음", "중간", "높음"]).describe("역량 갭의 심각도입니다."),
  reason: z.string().trim().min(1).max(1000).describe("갭으로 판단한 이유입니다."),
});

/**
 * 공고 요구역량과 사용자 보유 역량 사이의 차이를 검증합니다.
 */
export const GapAnalysisSchema = z.object({
  missingCapabilities: z
    .array(GapItemSchema)
    .min(1)
    .max(15)
    .describe("공고 대비 부족한 역량 목록입니다."),
  studyItems: TextListSchema.describe("공부로 보완해야 할 항목입니다."),
  projectProofItems: TextListSchema.describe("프로젝트로 증명해야 할 항목입니다."),
  risksAndWarnings: z
    .array(z.string().trim().min(1).max(1000))
    .min(1)
    .max(10)
    .describe("지원 준비 시 주의해야 할 위험 요소입니다."),
  aiReasoning: z
    .array(EvidenceSchema)
    .min(1)
    .max(10)
    .describe("갭 분석에 대한 AI 판단 근거입니다."),
});

const RecommendedProjectSchema = z.object({
  title: ShortTextSchema.describe("추천 프로젝트명입니다."),
  projectType: z
    .enum(["단기 프로젝트", "중급 포트폴리오 프로젝트", "고급 확장 프로젝트"])
    .describe("프로젝트 추천 유형입니다."),
  targetRoleConnection: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe("목표 직무와 프로젝트의 연결성입니다."),
  problemToSolve: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe("프로젝트가 해결하려는 문제입니다."),
  techStack: TextListSchema.describe("프로젝트에 사용할 기술스택입니다."),
  style: PreferredProjectStyleSchema,
  difficulty: ProjectDifficultySchema,
  estimatedPeriod: ShortTextSchema.describe("프로젝트 예상 수행 기간입니다."),
  targetCapabilities: TextListSchema.describe("프로젝트로 증명할 목표 역량입니다."),
  description: z.string().trim().min(1).max(2000).describe("프로젝트 설명입니다."),
  implementationScope: TextListSchema.describe("MVP 구현 범위입니다."),
  requiredOutputs: TextListSchema.describe("필수 산출물입니다."),
  readmeContents: TextListSchema.describe("README에 적어야 할 내용입니다."),
  interviewPoints: TextListSchema.describe("면접에서 어필할 포인트입니다."),
  risks: TextListSchema.describe("프로젝트 진행 시 위험 요소입니다."),
  smallerVersion: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe("일정이 부족할 때 만들 수 있는 축소 버전입니다."),
  portfolioOutputs: TextListSchema.describe("포트폴리오에 남길 산출물입니다."),
  reason: z.string().trim().min(1).max(1000).describe("해당 프로젝트를 추천한 이유입니다."),
});

/**
 * 추천 프로젝트 3개와 각 프로젝트의 난이도, 산출물, 추천 근거를 검증합니다.
 */
export const ProjectRecommendationSchema = z.object({
  recommendations: z
    .tuple([
      RecommendedProjectSchema.extend({
        projectType: z.literal("단기 프로젝트"),
        difficulty: z.literal("입문"),
      }),
      RecommendedProjectSchema.extend({
        projectType: z.literal("중급 포트폴리오 프로젝트"),
        difficulty: z.literal("중급"),
      }),
      RecommendedProjectSchema.extend({
        projectType: z.literal("고급 확장 프로젝트"),
        difficulty: z.literal("고급"),
      }),
    ])
    .describe("추천 프로젝트 3개입니다."),
  aiReasoning: z
    .array(EvidenceSchema)
    .min(1)
    .max(10)
    .describe("프로젝트 추천에 대한 AI 판단 근거입니다."),
});

const RoadmapStepSchema = z.object({
  period: ShortTextSchema.describe("로드맵 기간 또는 주차입니다."),
  goals: TextListSchema.describe("해당 기간의 학습 목표입니다."),
  studyItems: TextListSchema.describe("해당 기간에 공부할 항목입니다."),
  practiceTasks: TextListSchema.describe("학습 내용을 확인하기 위한 실습 과제입니다."),
  projectTasks: TextListSchema.describe("해당 기간에 수행할 프로젝트 작업입니다."),
  portfolioOutputs: TextListSchema.describe("해당 기간에 만들 포트폴리오 산출물입니다."),
  checklist: TextListSchema.describe("해당 주차에 확인할 체크리스트입니다."),
  risks: TextListSchema.describe("해당 주차의 위험 요소입니다."),
  completionCriteria: TextListSchema.describe("해당 주차를 완료했다고 볼 기준입니다."),
});

/**
 * 선택한 준비 기간 기준 학습 및 실행 로드맵을 검증합니다.
 * 선택하지 않은 기간은 빈 배열로 둘 수 있습니다.
 */
export const LearningRoadmapSchema = z.object({
  fourWeekRoadmap: z
    .array(RoadmapStepSchema)
    .max(4)
    .describe("4주 준비 로드맵입니다."),
  eightWeekRoadmap: z
    .array(RoadmapStepSchema)
    .max(8)
    .describe("8주 준비 로드맵입니다."),
  twelveWeekRoadmap: z
    .array(RoadmapStepSchema)
    .max(12)
    .describe("12주 준비 로드맵입니다."),
  aiReasoning: z
    .array(EvidenceSchema)
    .min(1)
    .max(10)
    .describe("로드맵 구성에 대한 AI 판단 근거입니다."),
});

/**
 * JobFit Agent의 최종 구조화 분석 결과를 검증합니다.
 */
export const FinalJobFitReportSchema = z.object({
  jobRequirementAnalysis: JobRequirementAnalysisSchema.describe("채용공고 분석 결과입니다."),
  userCapabilityAnalysis: UserCapabilityAnalysisSchema.describe("사용자 역량 분석 결과입니다."),
  gapAnalysis: GapAnalysisSchema.describe("역량 갭 분석 결과입니다."),
  projectRecommendation: ProjectRecommendationSchema.describe("프로젝트 추천 결과입니다."),
  learningRoadmap: LearningRoadmapSchema.describe("학습 로드맵 결과입니다."),
  portfolioOutputs: TextListSchema.describe("최종 포트폴리오 산출물 목록입니다."),
  risksAndWarnings: z
    .array(z.string().trim().min(1).max(1000))
    .min(1)
    .max(10)
    .describe("최종 위험 및 주의사항입니다."),
  aiReasoning: z
    .array(EvidenceSchema)
    .min(1)
    .max(20)
    .describe("최종 리포트 전반에 대한 AI 판단 근거입니다."),
});
