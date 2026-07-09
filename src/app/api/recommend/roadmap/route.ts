import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredResult } from "@/lib/ai/llm-adapter";
import {
  toSafeJobFitError,
  validationJobFitError,
} from "@/lib/errors/jobfit-errors";
import { buildLearningRoadmapPrompt } from "@/lib/prompts/jobfit-prompts";
import { sanitizeUserInput } from "@/lib/privacy/masking";
import {
  CurrentLevelSchema,
  GapAnalysisSchema,
  LearningRoadmapSchema,
  PreferredProjectStyleSchema,
  ProjectRecommendationSchema,
} from "@/lib/schemas/jobfit";
import type { LearningRoadmap } from "@/lib/types/jobfit";

type RoadmapWeeks = 4 | 8 | 12;

const RecommendRoadmapRequestSchema = z.object({
  gapAnalysis: GapAnalysisSchema,
  projectRecommendation: ProjectRecommendationSchema,
  preparationPeriod: z.string().trim().min(1).max(200).optional(),
  preferredProjectStyle: PreferredProjectStyleSchema.optional(),
  currentLevel: CurrentLevelSchema.optional(),
  selectedProjectTitle: z.string().trim().min(1).max(200).optional(),
  feedback: z.string().trim().max(1000).optional(),
});

type RoadmapRequest = z.infer<typeof RecommendRoadmapRequestSchema>;

function targetWeeksFromPeriod(preparationPeriod?: string): RoadmapWeeks {
  if (!preparationPeriod) {
    return 8;
  }

  if (/12|3개월/.test(preparationPeriod)) {
    return 12;
  }

  if (/4|1개월/.test(preparationPeriod)) {
    return 4;
  }

  return 8;
}

function selectedProject(input: RoadmapRequest) {
  const byTitle = input.projectRecommendation.recommendations.find(
    (project) => project.title === input.selectedProjectTitle,
  );

  if (byTitle) {
    return byTitle;
  }

  return (
    input.projectRecommendation.recommendations.find(
      (project) => project.difficulty === input.currentLevel,
    ) ?? input.projectRecommendation.recommendations[0]
  );
}

function buildMockStep(
  week: number,
  totalWeeks: 4 | 8 | 12,
  input: RoadmapRequest,
) {
  const phase =
    week === totalWeeks
      ? "마무리 및 포트폴리오 정리"
      : week <= Math.ceil(totalWeeks / 3)
        ? "핵심 개념 학습"
        : week <= Math.ceil((totalWeeks / 3) * 2)
          ? "프로젝트 구현"
          : "검증 및 개선";
  const projectTitle = input.selectedProjectTitle ?? "추천 프로젝트";
  const feedbackFocus = input.feedback
    ? `사용자 피드백 반영: ${input.feedback}`
    : `${input.currentLevel ?? "현재 수준"} 기준 ${input.preparationPeriod ?? `${totalWeeks}주`} 실행`;

  return {
    period: `${week}주차`,
    goals: [`${phase} 단계에서 ${projectTitle} 산출물 1개 만들기`, feedbackFocus],
    studyItems: ["역량 갭 분석의 우선순위 항목 복습", `${projectTitle}에 필요한 핵심 기술 정리`],
    practiceTasks: [`${feedbackFocus} 기준으로 작은 예제 검증`, "실패 케이스 1개 기록"],
    projectTasks: [`${projectTitle} ${phase} 작업 진행`, `${feedbackFocus}에 맞게 범위 조정`],
    portfolioOutputs: [`${week}주차 진행 기록`, `${projectTitle} README 업데이트`],
    checklist: ["학습 내용이 프로젝트 작업에 반영됨", "주차별 산출물이 저장됨"],
    risks: ["학습만 하고 구현 산출물이 남지 않을 수 있음"],
    completionCriteria: [`${projectTitle}의 작동 결과물 또는 문서 산출물 1개 이상 완료`],
  };
}

function sanitizeRequest(input: z.infer<typeof RecommendRoadmapRequestSchema>) {
  return {
    ...input,
    preparationPeriod: input.preparationPeriod
      ? sanitizeUserInput(input.preparationPeriod)
      : undefined,
    selectedProjectTitle: input.selectedProjectTitle
      ? sanitizeUserInput(input.selectedProjectTitle)
      : undefined,
    feedback: input.feedback ? sanitizeUserInput(input.feedback) : undefined,
  };
}

function keepTargetRoadmap(roadmap: LearningRoadmap, targetWeeks: RoadmapWeeks) {
  return {
    ...roadmap,
    fourWeekRoadmap:
      targetWeeks === 4 ? roadmap.fourWeekRoadmap.slice(0, targetWeeks) : [],
    eightWeekRoadmap:
      targetWeeks === 8 ? roadmap.eightWeekRoadmap.slice(0, targetWeeks) : [],
    twelveWeekRoadmap:
      targetWeeks === 12 ? roadmap.twelveWeekRoadmap.slice(0, targetWeeks) : [],
  };
}

function buildMockRoadmap(input: RoadmapRequest): LearningRoadmap {
  const targetWeeks = targetWeeksFromPeriod(input.preparationPeriod);
  const roadmap = {
    fourWeekRoadmap:
      targetWeeks === 4
        ? Array.from({ length: 4 }, (_, index) => buildMockStep(index + 1, 4, input))
        : [],
    eightWeekRoadmap:
      targetWeeks === 8
        ? Array.from({ length: 8 }, (_, index) => buildMockStep(index + 1, 8, input))
        : [],
    twelveWeekRoadmap:
      targetWeeks === 12
        ? Array.from({ length: 12 }, (_, index) =>
            buildMockStep(index + 1, 12, input),
          )
        : [],
    aiReasoning: [
      {
        item: "MOCK_AI",
        reason: input.feedback
          ? `사용자 피드백을 반영한 Mock 로드맵입니다: ${input.feedback}`
          : `MOCK_AI=true 상태에서 ${targetWeeks}주 로드맵만 반환했습니다.`,
      },
    ],
  };

  return keepTargetRoadmap(roadmap, targetWeeks);
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = RecommendRoadmapRequestSchema.safeParse(json);

    if (!parsed.success) {
      const safeError = validationJobFitError();
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    const sanitized = sanitizeRequest(parsed.data);
    const targetWeeks = targetWeeksFromPeriod(sanitized.preparationPeriod);
    const roadmap = await generateStructuredResult({
      prompt: buildLearningRoadmapPrompt({
        ...sanitized,
        targetWeeks,
        selectedProject: selectedProject(sanitized),
      }),
      schema: LearningRoadmapSchema,
      schemaName: "learning_roadmap",
      mockResult: buildMockRoadmap(sanitized),
    });
    const targetRoadmap = keepTargetRoadmap(roadmap, targetWeeks);

    return NextResponse.json({
      fourWeekRoadmap: targetRoadmap.fourWeekRoadmap,
      eightWeekRoadmap: targetRoadmap.eightWeekRoadmap,
      twelveWeekRoadmap: targetRoadmap.twelveWeekRoadmap,
      evidence: targetRoadmap.aiReasoning,
      roadmap: targetRoadmap,
    });
  } catch (error) {
    const safeError = toSafeJobFitError(
      error,
      "학습 로드맵 생성 중 오류가 발생했습니다.",
    );
    return NextResponse.json(safeError.body, { status: safeError.status });
  }
}
