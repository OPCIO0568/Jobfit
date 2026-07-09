import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredResult } from "@/lib/ai/llm-adapter";
import {
  toSafeJobFitError,
  validationJobFitError,
} from "@/lib/errors/jobfit-errors";
import { buildGapAnalysisPrompt } from "@/lib/prompts/jobfit-prompts";
import {
  GapAnalysisSchema,
  JobRequirementAnalysisSchema,
  UserCapabilityAnalysisSchema,
} from "@/lib/schemas/jobfit";
import type { GapAnalysis } from "@/lib/types/jobfit";

const AnalyzeGapRequestSchema = z.object({
  jobRequirementAnalysis: JobRequirementAnalysisSchema,
  userCapabilityAnalysis: UserCapabilityAnalysisSchema,
});

const mockAnalysis: GapAnalysis = {
  missingCapabilities: [
    {
      capability: "배포 및 운영 경험",
      gapLevel: "중간",
      reason: "사용자 경험에서 운영 산출물 근거가 충분히 확인되지 않는다는 Mock 분석입니다.",
    },
    {
      capability: "채용공고 기반 문서화",
      gapLevel: "낮음",
      reason: "프로젝트 산출물을 공고 요구역량과 연결해 설명하는 근거가 더 필요합니다.",
    },
  ],
  studyItems: ["배포 흐름", "테스트 전략", "README 기반 포트폴리오 문서화"],
  projectProofItems: ["배포 URL", "테스트 결과", "공고 요구역량 매핑 README"],
  risksAndWarnings: ["입력 정보만으로 실제 합격 가능성은 판단할 수 없습니다."],
  aiReasoning: [
    {
      item: "MOCK_AI",
      reason: "MOCK_AI=true 상태에서 실제 OpenAI API 호출 없이 반환한 역량 갭 분석입니다.",
    },
  ],
};

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = AnalyzeGapRequestSchema.safeParse(json);

    if (!parsed.success) {
      const safeError = validationJobFitError();
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    const analysis = await generateStructuredResult({
      prompt: buildGapAnalysisPrompt(parsed.data),
      schema: GapAnalysisSchema,
      schemaName: "gap_analysis",
      mockResult: mockAnalysis,
    });

    return NextResponse.json({
      missingCapabilities: analysis.missingCapabilities,
      studyItems: analysis.studyItems,
      projectProofItems: analysis.projectProofItems,
      risksAndWarnings: analysis.risksAndWarnings,
      evidence: analysis.aiReasoning,
      analysis,
    });
  } catch (error) {
    const safeError = toSafeJobFitError(error, "역량 갭 분석 중 오류가 발생했습니다.");
    return NextResponse.json(safeError.body, { status: safeError.status });
  }
}
