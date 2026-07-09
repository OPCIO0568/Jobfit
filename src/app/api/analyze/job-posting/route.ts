import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredResult } from "@/lib/ai/llm-adapter";
import {
  createSafeJobFitError,
  hasMinimumTextLength,
  MIN_INPUT_LENGTHS,
  toSafeJobFitError,
  validationJobFitError,
} from "@/lib/errors/jobfit-errors";
import { buildJobPostingAnalysisPrompt } from "@/lib/prompts/jobfit-prompts";
import { sanitizeUserInput } from "@/lib/privacy/masking";
import {
  CompanyProfileInputSchema,
  JobPostingInputSchema,
  JobRequirementAnalysisSchema,
} from "@/lib/schemas/jobfit";
import type { JobRequirementAnalysis } from "@/lib/types/jobfit";

const AnalyzeJobPostingRequestSchema = z.object({
  jobPosting: JobPostingInputSchema,
  companyProfile: CompanyProfileInputSchema,
});

const mockAnalysis: JobRequirementAnalysis = {
  coreRequiredCapabilities: [
    {
      name: "TypeScript 기반 웹 개발",
      category: "기술",
      evidence: "필수사항에 TypeScript 또는 웹 프론트엔드 개발 역량이 포함된 것으로 가정한 Mock 결과입니다.",
    },
    {
      name: "협업 커뮤니케이션",
      category: "협업",
      evidence: "담당업무에 팀 협업과 요구사항 조율이 포함된 것으로 가정한 Mock 결과입니다.",
    },
    {
      name: "문서화 역량",
      category: "커뮤니케이션",
      evidence: "산출물 정리와 기능 설명이 필요한 공고라는 가정의 Mock 결과입니다.",
    },
    {
      name: "서비스 도메인 이해",
      category: "도메인",
      evidence: "지원 서비스의 사용자 문제를 이해해야 한다는 가정의 Mock 결과입니다.",
    },
  ],
  talentKeywords: ["주도성", "협업", "문제 해결"],
  requiredTasks: ["채용공고 기반 요구사항 분석", "사용자 경험과 역량 매핑"],
  aiReasoning: [
    {
      item: "MOCK_AI",
      reason: "MOCK_AI=true 상태에서 실제 OpenAI API 호출 없이 반환한 샘플 분석입니다.",
    },
  ],
};

function sanitizeList(items: readonly string[]) {
  return items.map(sanitizeUserInput).filter(Boolean);
}

function sanitizeRequest(input: z.infer<typeof AnalyzeJobPostingRequestSchema>) {
  return {
    jobPosting: {
      rawPosting: sanitizeUserInput(input.jobPosting.rawPosting),
      targetRole: sanitizeUserInput(input.jobPosting.targetRole),
      responsibilities: sanitizeList(input.jobPosting.responsibilities),
      requiredQualifications: sanitizeList(input.jobPosting.requiredQualifications),
      preferredQualifications: sanitizeList(input.jobPosting.preferredQualifications),
    },
    companyProfile: {
      companyName: input.companyProfile.companyName
        ? sanitizeUserInput(input.companyProfile.companyName)
        : undefined,
      talentProfile: sanitizeUserInput(input.companyProfile.talentProfile),
    },
  };
}

function capabilitiesByCategory(
  analysis: JobRequirementAnalysis,
  category: JobRequirementAnalysis["coreRequiredCapabilities"][number]["category"],
) {
  return analysis.coreRequiredCapabilities
    .filter((capability) => capability.category === category)
    .map((capability) => capability.name);
}

function documentationCapabilities(analysis: JobRequirementAnalysis) {
  return analysis.coreRequiredCapabilities
    .filter((capability) =>
      `${capability.name} ${capability.evidence}`.includes("문서"),
    )
    .map((capability) => capability.name);
}

function buildPrompt(input: ReturnType<typeof sanitizeRequest>) {
  return `${buildJobPostingAnalysisPrompt(input.jobPosting)}

회사 인재상:
- 회사명: ${input.companyProfile.companyName ?? "입력 없음"}
- 인재상 원문:
${input.companyProfile.talentProfile}

추가 지시:
- talentKeywords는 회사 인재상 원문에서만 추출한다.
- 공고 원문과 인재상에 없는 내용을 단정하지 않는다.
- 문서화 역량은 공고 또는 인재상에 근거가 있을 때만 coreRequiredCapabilities에 포함한다.`;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = AnalyzeJobPostingRequestSchema.safeParse(json);

    if (!parsed.success) {
      const safeError = validationJobFitError();
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    if (
      !hasMinimumTextLength(
        parsed.data.jobPosting.rawPosting,
        MIN_INPUT_LENGTHS.jobPosting,
      )
    ) {
      const safeError = createSafeJobFitError("JOB_POSTING_TOO_SHORT");
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    if (
      !hasMinimumTextLength(
        parsed.data.companyProfile.talentProfile,
        MIN_INPUT_LENGTHS.companyProfile,
      )
    ) {
      const safeError = createSafeJobFitError(
        "INPUT_TOO_SHORT",
        "회사 인재상 내용이 부족합니다.",
        "핵심 가치, 협업 방식, 일하는 태도 등 인재상 문장을 조금 더 입력해 주세요.",
      );
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    const sanitized = sanitizeRequest(parsed.data);
    const analysis = await generateStructuredResult({
      prompt: buildPrompt(sanitized),
      schema: JobRequirementAnalysisSchema,
      schemaName: "job_requirement_analysis",
      mockResult: mockAnalysis,
    });

    return NextResponse.json({
      responsibilitySummary: analysis.requiredTasks,
      requiredCapabilities: sanitized.jobPosting.requiredQualifications,
      preferredCapabilities: sanitized.jobPosting.preferredQualifications,
      talentKeywords: analysis.talentKeywords,
      technicalCapabilities: capabilitiesByCategory(analysis, "기술"),
      collaborationCapabilities: capabilitiesByCategory(analysis, "협업"),
      documentationCapabilities: documentationCapabilities(analysis),
      domainKnowledge: capabilitiesByCategory(analysis, "도메인"),
      evidence: analysis.aiReasoning,
      analysis,
    });
  } catch (error) {
    const safeError = toSafeJobFitError(error, "공고 분석 중 오류가 발생했습니다.");
    return NextResponse.json(safeError.body, { status: safeError.status });
  }
}
