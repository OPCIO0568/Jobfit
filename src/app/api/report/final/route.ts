import { NextResponse } from "next/server";
import { z } from "zod";
import {
  toSafeJobFitError,
  validationJobFitError,
} from "@/lib/errors/jobfit-errors";
import { renderFinalReportMarkdown } from "@/lib/report/markdown";
import {
  FinalJobFitReportSchema,
  GapAnalysisSchema,
  JobRequirementAnalysisSchema,
  LearningRoadmapSchema,
  ProjectRecommendationSchema,
  UserCapabilityAnalysisSchema,
} from "@/lib/schemas/jobfit";
import type {
  FinalJobFitReport,
  LearningRoadmap,
  ProjectRecommendation,
} from "@/lib/types/jobfit";

const FinalReportRequestSchema = z.object({
  jobRequirementAnalysis: JobRequirementAnalysisSchema,
  userCapabilityAnalysis: UserCapabilityAnalysisSchema,
  gapAnalysis: GapAnalysisSchema,
  projectRecommendation: ProjectRecommendationSchema,
  learningRoadmap: LearningRoadmapSchema,
});

function uniqueText(items: readonly string[], limit: number) {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  ).slice(0, limit);
}

function allRoadmapSteps(roadmap: LearningRoadmap) {
  return [
    ...roadmap.fourWeekRoadmap,
    ...roadmap.eightWeekRoadmap,
    ...roadmap.twelveWeekRoadmap,
  ];
}

function portfolioOutputs(
  projectRecommendation: ProjectRecommendation,
  learningRoadmap: LearningRoadmap,
) {
  return uniqueText(
    [
      ...projectRecommendation.recommendations.flatMap(
        (project) => project.portfolioOutputs,
      ),
      ...allRoadmapSteps(learningRoadmap).flatMap((step) => step.portfolioOutputs),
    ],
    20,
  );
}

function risksAndWarnings(
  input: z.infer<typeof FinalReportRequestSchema>,
) {
  return uniqueText(
    [
      ...input.gapAnalysis.risksAndWarnings,
      ...input.projectRecommendation.recommendations.flatMap(
        (project) => project.risks,
      ),
      ...allRoadmapSteps(input.learningRoadmap).flatMap((step) => step.risks),
    ],
    10,
  );
}

function buildFinalReport(
  input: z.infer<typeof FinalReportRequestSchema>,
): FinalJobFitReport {
  return FinalJobFitReportSchema.parse({
    ...input,
    portfolioOutputs: portfolioOutputs(
      input.projectRecommendation,
      input.learningRoadmap,
    ),
    risksAndWarnings: risksAndWarnings(input),
    aiReasoning: [
      ...input.jobRequirementAnalysis.aiReasoning,
      ...input.userCapabilityAnalysis.aiReasoning,
      ...input.gapAnalysis.aiReasoning,
      ...input.projectRecommendation.aiReasoning,
      ...input.learningRoadmap.aiReasoning,
    ].slice(0, 20),
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = FinalReportRequestSchema.safeParse(json);

    if (!parsed.success) {
      const safeError = validationJobFitError();
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    const report = buildFinalReport(parsed.data);

    return NextResponse.json({
      report,
      markdown: renderFinalReportMarkdown(report),
    });
  } catch (error) {
    const safeError = toSafeJobFitError(
      error,
      "최종 리포트 생성 중 오류가 발생했습니다.",
    );
    return NextResponse.json(safeError.body, { status: safeError.status });
  }
}
