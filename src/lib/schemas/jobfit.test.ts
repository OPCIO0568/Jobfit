import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CompanyProfileInputSchema,
  GapAnalysisSchema,
  JobPostingInputSchema,
  JobRequirementAnalysisSchema,
  UserCapabilityAnalysisSchema,
  UserProfileInputSchema,
} from "./jobfit";
import type { GapAnalysis } from "../types/jobfit";

const jobPostingInput = {
  rawPosting:
    "백엔드 API 개발, 입력 검증, 배포 자동화, 장애 대응, 문서화, 협업 커뮤니케이션 역량을 요구합니다.",
  targetRole: "백엔드 개발자",
  responsibilities: ["백엔드 API 개발", "서비스 운영 개선"],
  requiredQualifications: ["TypeScript", "REST API"],
  preferredQualifications: ["배포 경험"],
};

const userProfileInput = {
  techStack: ["TypeScript", "Next.js"],
  projectExperiences: [
    {
      title: "API 리포트 생성기",
      summary: "입력 검증과 Markdown 리포트 생성을 구현했습니다.",
      role: "API와 검증 로직 구현",
      techStack: ["TypeScript", "Zod"],
      outcome: "README와 샘플 리포트를 제출했습니다.",
    },
  ],
  personalStatement: "프로젝트에서 검증 실패 케이스를 정리하고 문서화했습니다.",
  preparationPeriod: "8주",
  preferredProjectStyle: "개인",
  currentLevel: "중급",
};

const jobRequirementAnalysis = {
  coreRequiredCapabilities: [
    {
      name: "API 설계",
      category: "기술",
      evidence: "공고에서 백엔드 API 개발을 요구합니다.",
    },
  ],
  talentKeywords: ["협업"],
  requiredTasks: ["API 개발"],
  aiReasoning: [{ item: "공고 근거", reason: "담당업무에 API 개발이 있습니다." }],
} as const;

const userCapabilityAnalysis = {
  ownedCapabilities: [
    {
      name: "입력 검증",
      category: "기술",
      evidence: "Zod 기반 검증을 구현했습니다.",
    },
  ],
  projectEvidence: [
    { item: "프로젝트", reason: "검증 로직 구현 경험이 있습니다." },
  ],
  statementEvidence: [
    { item: "자기소개서", reason: "문서화 경험을 확인했습니다." },
  ],
  aiReasoning: [{ item: "확인된 경험", reason: "입력된 프로젝트에 근거합니다." }],
} as const;

const gapAnalysis = {
  missingCapabilities: [
    {
      capability: "운영 모니터링",
      gapLevel: "높음",
      reason: "운영 경험 근거가 부족합니다.",
    },
  ],
  studyItems: ["모니터링 기본"],
  projectProofItems: ["장애 대응 기록"],
  risksAndWarnings: ["합격을 보장하지 않습니다."],
  aiReasoning: [{ item: "갭 근거", reason: "공고 대비 운영 경험이 약합니다." }],
} as const;

describe("JobFit Zod schemas", () => {
  it("accepts valid input data and rejects empty required fields", () => {
    expect(JobPostingInputSchema.parse(jobPostingInput).targetRole).toBe(
      "백엔드 개발자",
    );
    expect(CompanyProfileInputSchema.parse({
      companyName: "데모 회사",
      talentProfile: "협업과 주도성을 중시합니다.",
    }).talentProfile).toContain("협업");
    expect(UserProfileInputSchema.parse(userProfileInput).currentLevel).toBe(
      "중급",
    );

    expect(
      JobPostingInputSchema.safeParse({ ...jobPostingInput, rawPosting: "" })
        .success,
    ).toBe(false);
  });

  it("keeps gap analysis input and output types stable", () => {
    const requirement = JobRequirementAnalysisSchema.parse(jobRequirementAnalysis);
    const capability = UserCapabilityAnalysisSchema.parse(userCapabilityAnalysis);
    const parsedGap = GapAnalysisSchema.parse(gapAnalysis);

    expectTypeOf(parsedGap).toEqualTypeOf<GapAnalysis>();
    expect(requirement.coreRequiredCapabilities[0].category).toBe("기술");
    expect(capability.ownedCapabilities[0].name).toBe("입력 검증");
    expect(parsedGap.missingCapabilities[0].gapLevel).toBe("높음");
  });
});
