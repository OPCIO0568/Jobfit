import { NextResponse } from "next/server";
import { generateStructuredResult } from "@/lib/ai/llm-adapter";
import {
  createSafeJobFitError,
  hasMinimumTextLength,
  MIN_INPUT_LENGTHS,
  toSafeJobFitError,
  validationJobFitError,
} from "@/lib/errors/jobfit-errors";
import { buildUserCapabilityAnalysisPrompt } from "@/lib/prompts/jobfit-prompts";
import { sanitizeUserInput } from "@/lib/privacy/masking";
import {
  UserCapabilityAnalysisSchema,
  UserProfileInputSchema,
} from "@/lib/schemas/jobfit";
import type { UserCapabilityAnalysis, UserProfileInput } from "@/lib/types/jobfit";

const EXPERIENCE_KEYWORDS = {
  documentation: ["문서", "문서화", "README", "readme", "기록", "설계서"],
  operation: ["운영", "배포", "모니터링", "장애", "CI/CD", "Docker", "AWS", "Vercel"],
};

const mockAnalysis: UserCapabilityAnalysis = {
  ownedCapabilities: [
    {
      name: "TypeScript 기반 구현 경험",
      category: "기술",
      evidence: "사용자 기술스택과 프로젝트 경험을 바탕으로 한 Mock 분석입니다.",
    },
    {
      name: "프로젝트 문제 해결 경험",
      category: "문제해결",
      evidence: "프로젝트에서 기능 구현과 결과물을 만든 경험이 있다는 가정의 Mock 분석입니다.",
    },
    {
      name: "협업 커뮤니케이션",
      category: "협업",
      evidence: "프로젝트 역할 설명에서 협업 가능성을 확인했다는 가정의 Mock 분석입니다.",
    },
  ],
  projectEvidence: [
    {
      item: "프로젝트 산출물",
      reason: "MOCK_AI=true 상태에서 실제 OpenAI API 호출 없이 반환한 프로젝트 근거입니다.",
    },
  ],
  statementEvidence: [
    {
      item: "자기소개서 요약 근거",
      reason: "자기소개서 원문은 재출력하지 않고 짧은 근거만 제공하는 Mock 결과입니다.",
    },
  ],
  aiReasoning: [
    {
      item: "확인된 경험",
      reason: "기술스택과 프로젝트 경험에 직접 입력된 내용만 확인된 경험으로 분류합니다.",
    },
    {
      item: "근거 약한 역량",
      reason: "운영/배포 경험은 입력 정보만으로 판단 불가합니다.",
    },
  ],
};

function sanitizeList(items: readonly string[]) {
  return items.map(sanitizeUserInput).filter(Boolean);
}

function sanitizeUserProfile(input: UserProfileInput): UserProfileInput {
  return {
    techStack: sanitizeList(input.techStack),
    projectExperiences: input.projectExperiences.map((project) => ({
      title: sanitizeUserInput(project.title),
      summary: sanitizeUserInput(project.summary),
      role: sanitizeUserInput(project.role),
      techStack: sanitizeList(project.techStack),
      outcome: sanitizeUserInput(project.outcome),
    })),
    personalStatement: input.personalStatement
      ? sanitizeUserInput(input.personalStatement)
      : undefined,
    preparationPeriod: sanitizeUserInput(input.preparationPeriod),
    preferredProjectStyle: input.preferredProjectStyle,
    currentLevel: input.currentLevel,
  };
}

function capabilitiesByCategory(
  analysis: UserCapabilityAnalysis,
  category: UserCapabilityAnalysis["ownedCapabilities"][number]["category"],
) {
  return analysis.ownedCapabilities
    .filter((capability) => capability.category === category)
    .map((capability) => ({
      name: capability.name,
      evidence: capability.evidence,
    }));
}

function evidenceByKeyword(
  analysis: UserCapabilityAnalysis,
  keywords: readonly string[],
) {
  return analysis.projectEvidence.filter((evidence) =>
    keywords.some((keyword) => `${evidence.item} ${evidence.reason}`.includes(keyword)),
  );
}

function weakCapabilities(analysis: UserCapabilityAnalysis) {
  return analysis.aiReasoning.filter((reasoning) =>
    `${reasoning.item} ${reasoning.reason}`.includes("근거"),
  );
}

function buildPrompt(input: UserProfileInput) {
  return `${buildUserCapabilityAnalysisPrompt(input)}

추가 지시:
- 기술 역량, 프로젝트 경험, 협업 경험, 문제해결 경험, 문서화 경험, 운영/배포 경험, 도메인 경험을 구분한다.
- "확인된 경험"은 기술스택과 프로젝트 경험에 직접 적힌 내용만 사용한다.
- "추정 가능한 경험"은 자기소개서 또는 경험 서술에서 간접적으로 보이는 내용만 짧게 요약한다.
- 아직 근거가 약한 역량은 aiReasoning에 item 값을 "근거 약한 역량"으로 포함한다.
- 자기소개서 문장을 그대로 길게 재출력하지 않는다.
- 사용자가 실제로 하지 않은 일을 했다고 표현하지 않는다.`;
}

function experienceText(input: UserProfileInput) {
  return [
    input.personalStatement ?? "",
    ...input.projectExperiences.flatMap((project) => [
      project.summary,
      project.role,
      project.outcome,
    ]),
  ].join(" ");
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = UserProfileInputSchema.safeParse(json);

    if (!parsed.success) {
      const safeError = validationJobFitError();
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    if (
      !hasMinimumTextLength(experienceText(parsed.data), MIN_INPUT_LENGTHS.userExperience)
    ) {
      const safeError = createSafeJobFitError(
        "USER_EXPERIENCE_TOO_SHORT",
        "사용자 경험 내용이 부족해 분석 한계가 큽니다.",
        "프로젝트에서 맡은 역할, 구현한 기능, 사용 기술, 결과물 또는 배운 점을 더 입력해 주세요.",
      );
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    const sanitized = sanitizeUserProfile(parsed.data);
    const analysis = await generateStructuredResult({
      prompt: buildPrompt(sanitized),
      schema: UserCapabilityAnalysisSchema,
      schemaName: "user_capability_analysis",
      mockResult: mockAnalysis,
    });

    return NextResponse.json({
      technicalCapabilities: capabilitiesByCategory(analysis, "기술"),
      projectExperiences: analysis.projectEvidence,
      collaborationExperiences: capabilitiesByCategory(analysis, "협업"),
      problemSolvingExperiences: capabilitiesByCategory(analysis, "문제해결"),
      documentationExperiences: evidenceByKeyword(
        analysis,
        EXPERIENCE_KEYWORDS.documentation,
      ),
      operationDeploymentExperiences: evidenceByKeyword(
        analysis,
        EXPERIENCE_KEYWORDS.operation,
      ),
      domainExperiences: capabilitiesByCategory(analysis, "도메인"),
      provableOutputs: sanitized.projectExperiences.map((project) => ({
        project: project.title,
        output: project.outcome,
      })),
      confirmedExperiences: analysis.projectEvidence,
      inferredExperiences: analysis.statementEvidence,
      weakCapabilities: weakCapabilities(analysis),
      analysis,
    });
  } catch (error) {
    const safeError = toSafeJobFitError(
      error,
      "사용자 역량 분석 중 오류가 발생했습니다.",
    );
    return NextResponse.json(safeError.body, { status: safeError.status });
  }
}
