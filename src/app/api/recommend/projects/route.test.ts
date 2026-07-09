import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const generateStructuredResultMock = vi.hoisted(() =>
  vi.fn((input: { mockResult?: unknown }) => Promise.resolve(input.mockResult)),
);

vi.mock("@/lib/ai/llm-adapter", () => ({
  generateStructuredResult: generateStructuredResultMock,
}));

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
  projectProofItems: ["운영 README", "테스트 결과", "배포 URL"],
  risksAndWarnings: ["입력 정보만으로 합격 가능성은 판단할 수 없습니다."],
  aiReasoning: [{ item: "갭", reason: "운영 근거가 약합니다." }],
} as const;

async function recommend(body: Record<string, unknown>) {
  vi.stubEnv("MOCK_AI", "true");

  const response = await POST(
    new Request("http://localhost/api/recommend/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gapAnalysis, ...body }),
    }),
  );

  expect(response.ok).toBe(true);
  return response.json() as Promise<{
    recommendations: Array<{ title: string; techStack: string[] }>;
  }>;
}

describe("project recommendation route", () => {
  beforeEach(() => {
    generateStructuredResultMock.mockImplementation(
      (input: { mockResult?: unknown }) => Promise.resolve(input.mockResult),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    generateStructuredResultMock.mockReset();
  });

  it("returns different mock projects for different target roles", async () => {
    const backend = await recommend({
      targetRole: "백엔드 개발자",
      techStack: ["TypeScript", "Node.js", "PostgreSQL", "Zod"],
      existingExperienceSummary: "API 입력 검증과 에러 응답을 구현했습니다.",
      preferredProjectStyle: "개인",
      currentLevel: "중급",
    });
    const embedded = await recommend({
      targetRole: "임베디드 소프트웨어 개발자",
      techStack: ["C", "ESP32", "UART", "FreeRTOS"],
      existingExperienceSummary: "GPIO 입력과 UART 로그 기반 디버깅을 했습니다.",
      preferredProjectStyle: "개인",
      currentLevel: "중급",
    });

    expect(backend.recommendations[0].title).toContain("API");
    expect(embedded.recommendations[0].title).toContain("센서");
    expect(backend.recommendations[0].title).not.toBe(
      embedded.recommendations[0].title,
    );
    expect(backend.recommendations[1].techStack).toContain("TypeScript");
    expect(embedded.recommendations[1].techStack).toContain("ESP32");
  });

  it("uses changed job posting context even when target role text is similar", async () => {
    const infra = await recommend({
      targetRole: "개발자",
      techStack: ["Python", "Docker"],
      existingExperienceSummary: "자동화 스크립트를 작성했습니다.",
      preferredProjectStyle: "개인",
      currentLevel: "중급",
      jobPosting: {
        rawPosting:
          "Linux 서버 운영, Docker 배포, Nginx 로그 분석, Grafana 모니터링을 담당합니다.",
        targetRole: "개발자",
        responsibilities: ["Linux 서버 운영"],
        requiredQualifications: ["Docker 배포"],
        preferredQualifications: ["Grafana 모니터링"],
      },
    });
    const embedded = await recommend({
      targetRole: "개발자",
      techStack: ["C", "FreeRTOS"],
      existingExperienceSummary: "상태 머신을 작성했습니다.",
      preferredProjectStyle: "개인",
      currentLevel: "중급",
      jobPosting: {
        rawPosting:
          "MCU 펌웨어, UART 디버깅, GPIO 입력 처리, 센서 상태 머신 구현을 담당합니다.",
        targetRole: "개발자",
        responsibilities: ["MCU 펌웨어 개발"],
        requiredQualifications: ["UART 디버깅"],
        preferredQualifications: ["FreeRTOS 경험"],
      },
    });

    expect(infra.recommendations[0].title).toContain("Linux");
    expect(embedded.recommendations[0].title).toContain("센서");
  });

  it("returns a fallback recommendation when AI structured output fails", async () => {
    vi.stubEnv("MOCK_AI", "false");
    generateStructuredResultMock.mockRejectedValueOnce({
      code: "OPENAI_RESPONSE_INVALID",
    });

    const response = await POST(
      new Request("http://localhost/api/recommend/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gapAnalysis,
          targetRole: "백엔드 개발자",
          techStack: ["TypeScript", "Node.js", "PostgreSQL"],
          existingExperienceSummary: "API 입력 검증과 에러 응답을 구현했습니다.",
          preferredProjectStyle: "개인",
          currentLevel: "중급",
        }),
      }),
    );

    expect(response.ok).toBe(true);

    const body = (await response.json()) as {
      recommendations: Array<{ title: string }>;
      evidence: Array<{ item: string }>;
    };

    expect(body.recommendations[0].title).toContain("API");
    expect(body.evidence[0].item).toContain("fallback");
  });
});
