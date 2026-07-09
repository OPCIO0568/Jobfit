import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredResult } from "@/lib/ai/llm-adapter";
import {
  toSafeJobFitError,
  validationJobFitError,
} from "@/lib/errors/jobfit-errors";
import { buildProjectRecommendationPrompt } from "@/lib/prompts/jobfit-prompts";
import { sanitizeUserInput } from "@/lib/privacy/masking";
import {
  CompanyProfileInputSchema,
  CurrentLevelSchema,
  GapAnalysisSchema,
  JobPostingInputSchema,
  PreferredProjectStyleSchema,
  ProjectRecommendationSchema,
  UserProfileInputSchema,
} from "@/lib/schemas/jobfit";
import type { ProjectRecommendation } from "@/lib/types/jobfit";

const RecommendProjectsRequestSchema = z.object({
  gapAnalysis: GapAnalysisSchema,
  targetRole: z.string().trim().min(1).max(200).optional(),
  techStack: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  existingExperienceSummary: z.string().trim().min(1).max(3000).optional(),
  preferredProjectStyle: PreferredProjectStyleSchema.optional(),
  currentLevel: CurrentLevelSchema.optional(),
  jobPosting: JobPostingInputSchema.optional(),
  companyProfile: CompanyProfileInputSchema.optional(),
  userProfile: UserProfileInputSchema.optional(),
});

type SanitizedProjectRequest = ReturnType<typeof sanitizeRequest>;

type ProjectTheme = {
  shortTitle: string;
  portfolioTitle: string;
  advancedTitle: string;
  problem: string;
  stack: string[];
  scopes: string[];
  outputs: string[];
  interviewPoints: string[];
};

function sanitizeList(items: readonly string[]) {
  return items.map(sanitizeUserInput).filter(Boolean);
}

function sanitizeRequest(input: z.infer<typeof RecommendProjectsRequestSchema>) {
  return {
    gapAnalysis: input.gapAnalysis,
    targetRole: input.targetRole ? sanitizeUserInput(input.targetRole) : undefined,
    techStack: sanitizeList(input.techStack),
    existingExperienceSummary: input.existingExperienceSummary
      ? sanitizeUserInput(input.existingExperienceSummary)
      : undefined,
    preferredProjectStyle: input.preferredProjectStyle,
    currentLevel: input.currentLevel,
    jobPosting: input.jobPosting
      ? {
          rawPosting: sanitizeUserInput(input.jobPosting.rawPosting),
          targetRole: sanitizeUserInput(input.jobPosting.targetRole),
          responsibilities: sanitizeList(input.jobPosting.responsibilities),
          requiredQualifications: sanitizeList(
            input.jobPosting.requiredQualifications,
          ),
          preferredQualifications: sanitizeList(
            input.jobPosting.preferredQualifications,
          ),
        }
      : undefined,
    companyProfile: input.companyProfile
      ? {
          companyName: input.companyProfile.companyName
            ? sanitizeUserInput(input.companyProfile.companyName)
            : undefined,
          talentProfile: sanitizeUserInput(input.companyProfile.talentProfile),
        }
      : undefined,
    userProfile: input.userProfile
      ? {
          techStack: sanitizeList(input.userProfile.techStack),
          projectExperiences: input.userProfile.projectExperiences.map(
            (project) => ({
              title: sanitizeUserInput(project.title),
              summary: sanitizeUserInput(project.summary),
              role: sanitizeUserInput(project.role),
              techStack: sanitizeList(project.techStack),
              outcome: sanitizeUserInput(project.outcome),
            }),
          ),
          personalStatement: input.userProfile.personalStatement
            ? sanitizeUserInput(input.userProfile.personalStatement)
            : undefined,
          preparationPeriod: sanitizeUserInput(input.userProfile.preparationPeriod),
          preferredProjectStyle: input.userProfile.preferredProjectStyle,
          currentLevel: input.userProfile.currentLevel,
        }
      : undefined,
  };
}

function firstItems(items: readonly string[], fallback: string[]) {
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered.slice(0, 4) : fallback;
}

function projectTheme(input: SanitizedProjectRequest): ProjectTheme {
  const context = [
    input.targetRole,
    input.techStack.join(" "),
    input.existingExperienceSummary,
    input.jobPosting?.rawPosting,
    input.companyProfile?.talentProfile,
    input.userProfile?.projectExperiences
      .map((project) => `${project.title} ${project.summary} ${project.outcome}`)
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  if (/인프라|운영|Linux|Docker|Nginx|모니터링|Grafana/i.test(context)) {
    return {
      shortTitle: "Linux 운영 점검 자동화 스크립트",
      portfolioTitle: "배포 로그 기반 장애 대응 런북 포털",
      advancedTitle: "서비스 모니터링과 재발 방지 운영 대시보드",
      problem: "수동 점검과 장애 기록이 흩어져 운영 근거를 포트폴리오로 보여주기 어렵습니다.",
      stack: firstItems(input.techStack, ["Linux", "Bash", "Python", "Docker"]),
      scopes: ["서버 상태 점검", "로그 수집", "장애 대응 체크리스트", "운영 README"],
      outputs: ["점검 스크립트", "운영 런북", "장애 재현 기록", "모니터링 화면 캡처"],
      interviewPoints: ["장애 원인 좁히기", "운영 자동화", "재발 방지 문서화"],
    };
  }

  if (/임베디드|MCU|ESP32|STM32|UART|CAN|GPIO|FreeRTOS|펌웨어/i.test(context)) {
    return {
      shortTitle: "센서 입력 디버깅 로그 뷰어",
      portfolioTitle: "MCU 상태 머신 테스트 하네스",
      advancedTitle: "통신 오류 재현과 복구 시나리오 검증 펌웨어",
      problem: "보드 동작, 통신 로그, 재현 절차가 따로 있어 디버깅 역량을 증명하기 어렵습니다.",
      stack: firstItems(input.techStack, ["C", "ESP32", "UART", "FreeRTOS"]),
      scopes: ["핀맵 문서화", "상태 머신 구현", "시리얼 로그 수집", "재현 테스트 절차"],
      outputs: ["펌웨어 코드", "핀맵 문서", "시리얼 로그", "테스트 절차 README"],
      interviewPoints: ["하드웨어/소프트웨어 경계 디버깅", "로그 기반 원인 분석", "재현 가능한 테스트"],
    };
  }

  if (/백엔드|API|Node|Express|PostgreSQL|Prisma|FastAPI|Nest|인증|DB/i.test(context)) {
    return {
      shortTitle: "API 입력 검증과 에러 응답 미니 서비스",
      portfolioTitle: "인증 포함 포트폴리오 API 서버",
      advancedTitle: "배포/테스트/모니터링을 갖춘 백엔드 운영 샘플",
      problem: "API 구현 경험은 있지만 인증, 테스트, 배포 후 로그 추적 근거가 부족합니다.",
      stack: firstItems(input.techStack, ["TypeScript", "Node.js", "PostgreSQL", "Zod"]),
      scopes: ["입력 검증", "인증/인가", "테스트 코드", "API 문서", "배포 로그"],
      outputs: ["API 명세", "테스트 결과", "DB schema", "배포 URL", "장애 대응 메모"],
      interviewPoints: ["요구사항을 API와 데이터 모델로 바꾼 경험", "에러 처리 정책", "테스트와 문서화"],
    };
  }

  const roleName = input.targetRole ?? input.jobPosting?.targetRole ?? "직무";

  return {
    shortTitle: `${roleName} 핵심 역량 증명 미니 프로젝트`,
    portfolioTitle: `${roleName} 포트폴리오 산출물 개선 프로젝트`,
    advancedTitle: `${roleName} 실무 운영 확장 프로젝트`,
    problem: "공고 요구역량과 기존 경험이 포트폴리오 산출물로 명확히 연결되지 않았습니다.",
    stack: firstItems(input.techStack, ["TypeScript", "Next.js", "Zod", "Markdown"]),
    scopes: ["핵심 기능 1개", "입력 검증", "결과 문서화", "README 정리"],
    outputs: ["README", "데모 화면", "테스트 결과", "회고 문서"],
    interviewPoints: ["공고 기반 문제 정의", "구현 범위 조절", "산출물 중심 설명"],
  };
}

function buildMockRecommendation(input: SanitizedProjectRequest): ProjectRecommendation {
  const theme = projectTheme(input);
  const targetRole = input.targetRole ?? "목표 직무";
  const style = input.preferredProjectStyle ?? "개인";
  const gaps = firstItems(
    input.gapAnalysis.missingCapabilities.map((gap) => gap.capability),
    ["증거가 약한 핵심 역량"],
  );
  const proofItems = firstItems(input.gapAnalysis.projectProofItems, theme.outputs);

  return {
    recommendations: [
      {
        title: theme.shortTitle,
        projectType: "단기 프로젝트",
        targetRoleConnection: `${targetRole}에서 바로 설명할 수 있는 ${gaps[0]} 보완 프로젝트입니다.`,
        problemToSolve: theme.problem,
        techStack: theme.stack.slice(0, 3),
        style,
        difficulty: "입문",
        estimatedPeriod: "1~2주",
        targetCapabilities: gaps.slice(0, 3),
        description: `기존 경험을 바탕으로 ${proofItems[0]}를 빠르게 남기는 작은 프로젝트입니다.`,
        implementationScope: theme.scopes.slice(0, 3),
        requiredOutputs: proofItems.slice(0, 3),
        readmeContents: ["문제 정의", "구현 범위", "실행 방법", "공고 요구역량 연결"],
        interviewPoints: theme.interviewPoints.slice(0, 2),
        risks: ["범위를 넓히면 2주 안에 완성하기 어렵습니다."],
        smallerVersion: "핵심 기능 1개와 README, 실행 캡처만 먼저 완성합니다.",
        portfolioOutputs: proofItems.slice(0, 3),
        reason: `갭 분석에서 ${gaps[0]} 보완이 필요해 단기간 증명용으로 추천합니다.`,
      },
      {
        title: theme.portfolioTitle,
        projectType: "중급 포트폴리오 프로젝트",
        targetRoleConnection: `${targetRole} 공고의 필수 역량을 API/문서/검증 산출물로 연결합니다.`,
        problemToSolve: theme.problem,
        techStack: theme.stack,
        style,
        difficulty: "중급",
        estimatedPeriod: "3~6주",
        targetCapabilities: gaps,
        description: `기존 프로젝트 경험을 확장해 ${theme.scopes.join(", ")}를 한 흐름으로 보여주는 포트폴리오입니다.`,
        implementationScope: theme.scopes,
        requiredOutputs: theme.outputs,
        readmeContents: ["공고 요구역량 매핑", "아키텍처", "실행 방법", "테스트/검증 결과", "한계와 개선점"],
        interviewPoints: theme.interviewPoints,
        risks: ["기능보다 산출물과 검증 근거가 약해질 수 있습니다."],
        smallerVersion: "저장/배포를 제외하고 핵심 분석 또는 검증 흐름만 완성합니다.",
        portfolioOutputs: theme.outputs,
        reason: `사용자의 기존 경험과 ${targetRole} 공고의 부족 역량을 가장 직접적으로 연결합니다.`,
      },
      {
        title: theme.advancedTitle,
        projectType: "고급 확장 프로젝트",
        targetRoleConnection: `${targetRole}에서 우대사항으로 보는 운영, 테스트, 협업 근거를 강화합니다.`,
        problemToSolve: `${theme.problem} 특히 배포 이후 검증과 운영 근거가 부족합니다.`,
        techStack: [...theme.stack, "CI/CD"].slice(0, 6),
        style: style === "개인" ? "상관없음" : style,
        difficulty: "고급",
        estimatedPeriod: "6~12주",
        targetCapabilities: [...gaps, "배포/운영", "테스트 자동화"].slice(0, 5),
        description: `중급 프로젝트에 배포, 테스트, 운영 기록을 붙여 실무형 근거를 만드는 확장 프로젝트입니다.`,
        implementationScope: [...theme.scopes, "배포 파이프라인", "운영 로그", "테스트 자동화"].slice(0, 7),
        requiredOutputs: [...theme.outputs, "배포 URL", "테스트 리포트"].slice(0, 7),
        readmeContents: ["운영 시나리오", "테스트 전략", "배포 방식", "장애/실패 케이스", "협업 또는 이슈 관리"],
        interviewPoints: [...theme.interviewPoints, "운영 가능한 수준으로 확장한 판단 근거"].slice(0, 4),
        risks: ["범위가 커져 완성도가 떨어질 수 있습니다.", "시간이 부족하면 중급 버전 완성도를 우선해야 합니다."],
        smallerVersion: "배포와 테스트 자동화 중 하나만 선택해 완성도를 높입니다.",
        portfolioOutputs: [...theme.outputs, "배포 URL", "테스트 리포트"].slice(0, 7),
        reason: `고급 버전은 ${targetRole} 우대사항을 보여주되, 일정이 부족하면 축소 버전으로 줄일 수 있습니다.`,
      },
    ],
    aiReasoning: [
      {
        item: "MOCK_AI",
        reason: `${targetRole}, 기술스택, 역량 갭을 반영해 직무별 mock 프로젝트를 생성했습니다.`,
      },
    ],
  };
}

function isRecoverableProjectAIError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === "OPENAI_REQUEST_FAILED" || code === "OPENAI_RESPONSE_INVALID";
}

function buildFallbackRecommendation(
  input: SanitizedProjectRequest,
): ProjectRecommendation {
  const recommendation = buildMockRecommendation(input);

  return {
    ...recommendation,
    aiReasoning: [
      {
        item: "프로젝트 추천 fallback",
        reason:
          "AI 프로젝트 추천 응답이 불안정해 입력값과 역량 갭을 기반으로 안전한 대체 추천을 생성했습니다. 다시 시도하면 실제 AI 추천을 받을 수 있습니다.",
      },
      ...recommendation.aiReasoning,
    ].slice(0, 10),
  };
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = RecommendProjectsRequestSchema.safeParse(json);

    if (!parsed.success) {
      const safeError = validationJobFitError();
      return NextResponse.json(safeError.body, { status: safeError.status });
    }

    const sanitized = sanitizeRequest(parsed.data);
    const mockRecommendation = buildMockRecommendation(sanitized);
    let recommendation: ProjectRecommendation;

    try {
      recommendation = await generateStructuredResult({
        prompt: buildProjectRecommendationPrompt(sanitized),
        schema: ProjectRecommendationSchema,
        schemaName: "project_recommendation",
        mockResult: mockRecommendation,
      });
    } catch (error) {
      if (!isRecoverableProjectAIError(error)) {
        throw error;
      }

      recommendation = buildFallbackRecommendation(sanitized);
    }

    return NextResponse.json({
      shortTermProject: recommendation.recommendations[0],
      portfolioProject: recommendation.recommendations[1],
      advancedProject: recommendation.recommendations[2],
      recommendations: recommendation.recommendations,
      evidence: recommendation.aiReasoning,
    });
  } catch (error) {
    const safeError = toSafeJobFitError(error, "프로젝트 추천 중 오류가 발생했습니다.");
    return NextResponse.json(safeError.body, { status: safeError.status });
  }
}
