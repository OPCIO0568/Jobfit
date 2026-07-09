import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const gapAnalysis = {
  missingCapabilities: [
    {
      capability: "운영 로그 분석",
      gapLevel: "중간",
      reason: "운영 근거가 부족합니다.",
    },
  ],
  studyItems: ["배포 로그", "테스트 자동화"],
  projectProofItems: ["운영 README", "테스트 결과"],
  risksAndWarnings: ["입력 정보만으로 합격 가능성은 판단할 수 없습니다."],
  aiReasoning: [{ item: "갭", reason: "운영 근거가 약합니다." }],
} as const;

const projectRecommendation = {
  recommendations: [
    {
      title: "인증 포함 포트폴리오 API 서버",
      projectType: "단기 프로젝트",
      targetRoleConnection: "백엔드 직무와 연결됩니다.",
      problemToSolve: "인증과 운영 근거가 부족합니다.",
      techStack: ["TypeScript", "Node.js", "Zod"],
      style: "개인",
      difficulty: "입문",
      estimatedPeriod: "1~2주",
      targetCapabilities: ["운영 로그 분석"],
      description: "작은 API 서버입니다.",
      implementationScope: ["입력 검증"],
      requiredOutputs: ["README"],
      readmeContents: ["실행 방법"],
      interviewPoints: ["에러 처리"],
      risks: ["범위 증가"],
      smallerVersion: "검증 API만 구현",
      portfolioOutputs: ["README"],
      reason: "갭 보완",
    },
    {
      title: "백엔드 운영 샘플",
      projectType: "중급 포트폴리오 프로젝트",
      targetRoleConnection: "백엔드 직무와 연결됩니다.",
      problemToSolve: "운영 근거가 부족합니다.",
      techStack: ["TypeScript", "Node.js", "PostgreSQL"],
      style: "개인",
      difficulty: "중급",
      estimatedPeriod: "3~6주",
      targetCapabilities: ["운영 로그 분석"],
      description: "운영 샘플입니다.",
      implementationScope: ["로그 수집"],
      requiredOutputs: ["테스트 결과"],
      readmeContents: ["테스트 전략"],
      interviewPoints: ["운영 로그"],
      risks: ["범위 증가"],
      smallerVersion: "로그 문서만 작성",
      portfolioOutputs: ["테스트 결과"],
      reason: "갭 보완",
    },
    {
      title: "고급 백엔드 운영 샘플",
      projectType: "고급 확장 프로젝트",
      targetRoleConnection: "백엔드 직무와 연결됩니다.",
      problemToSolve: "배포 근거가 부족합니다.",
      techStack: ["TypeScript", "Node.js", "CI/CD"],
      style: "상관없음",
      difficulty: "고급",
      estimatedPeriod: "6~12주",
      targetCapabilities: ["운영 로그 분석"],
      description: "고급 운영 샘플입니다.",
      implementationScope: ["배포 파이프라인"],
      requiredOutputs: ["배포 URL"],
      readmeContents: ["배포 방식"],
      interviewPoints: ["배포 자동화"],
      risks: ["범위 증가"],
      smallerVersion: "CI만 구성",
      portfolioOutputs: ["배포 URL"],
      reason: "갭 보완",
    },
  ],
  aiReasoning: [{ item: "추천", reason: "갭 기반 추천" }],
} as const;

async function roadmap(feedback: string) {
  vi.stubEnv("MOCK_AI", "true");

  const response = await POST(
    new Request("http://localhost/api/recommend/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gapAnalysis,
        projectRecommendation,
        selectedProjectTitle: "인증 포함 포트폴리오 API 서버",
        preparationPeriod: "8주",
        preferredProjectStyle: "개인",
        currentLevel: "중급",
        feedback,
      }),
    }),
  );

  expect(response.ok).toBe(true);
  return response.json() as Promise<{
    roadmap: {
      fourWeekRoadmap: Array<{ goals: string[]; projectTasks: string[] }>;
      eightWeekRoadmap: Array<{ goals: string[]; projectTasks: string[] }>;
      twelveWeekRoadmap: Array<{ goals: string[]; projectTasks: string[] }>;
    };
  }>;
}

describe("roadmap recommendation route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reflects HITL feedback in regenerated mock roadmap content", async () => {
    const easier = await roadmap("너무 어려움. 범위를 줄여줘.");
    const practical = await roadmap("더 실무적으로 로그와 테스트를 강조해줘.");

    expect(easier.roadmap.fourWeekRoadmap).toHaveLength(0);
    expect(easier.roadmap.eightWeekRoadmap).toHaveLength(8);
    expect(easier.roadmap.twelveWeekRoadmap).toHaveLength(0);
    expect(easier.roadmap.eightWeekRoadmap[0].goals.join(" ")).toContain(
      "너무 어려움",
    );
    expect(practical.roadmap.eightWeekRoadmap[0].projectTasks.join(" ")).toContain(
      "로그와 테스트",
    );
    expect(easier.roadmap.eightWeekRoadmap[0].goals).not.toEqual(
      practical.roadmap.eightWeekRoadmap[0].goals,
    );
  });
});
