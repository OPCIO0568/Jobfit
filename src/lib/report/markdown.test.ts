import { describe, expect, it } from "vitest";
import type { FinalJobFitReport } from "../types/jobfit";
import { renderFinalReportMarkdown } from "./markdown";

function roadmapStep(period: string) {
  return {
    period,
    goals: ["API 검증 완성"],
    studyItems: ["Zod Schema"],
    practiceTasks: ["실패 케이스 작성"],
    projectTasks: ["리포트 API 구현"],
    portfolioOutputs: ["README 업데이트"],
    checklist: ["테스트 통과"],
    risks: ["학습만 하고 산출물이 없을 수 있음"],
    completionCriteria: ["샘플 리포트 생성"],
  };
}

const baseProject = {
  targetRoleConnection: "백엔드 요구역량과 연결됩니다.",
  problemToSolve: "분석 결과를 실행 가능한 계획으로 바꿉니다.",
  techStack: ["TypeScript", "Zod"],
  style: "개인",
  estimatedPeriod: "2주",
  targetCapabilities: ["API 설계"],
  description: "구조화 리포트를 생성합니다.",
  implementationScope: ["입력 검증", "Markdown 생성"],
  requiredOutputs: ["README", "샘플 리포트"],
  readmeContents: ["문제 정의", "검증 방식"],
  interviewPoints: ["검증 실패 대응"],
  risks: ["범위가 커질 수 있음"],
  smallerVersion: "Mock 데이터만 사용합니다.",
  portfolioOutputs: ["Markdown 리포트"],
  reason: "부족 역량을 증명할 수 있습니다.",
} as const;

const report: FinalJobFitReport = {
  jobRequirementAnalysis: {
    coreRequiredCapabilities: [
      {
        name: "API 설계",
        category: "기술",
        evidence: "공고에서 API 개발을 요구합니다.",
      },
    ],
    talentKeywords: ["협업"],
    requiredTasks: ["API 개발"],
    aiReasoning: [{ item: "공고", reason: "담당업무 기반입니다." }],
  },
  userCapabilityAnalysis: {
    ownedCapabilities: [
      {
        name: "입력 검증",
        category: "기술",
        evidence: "프로젝트에서 Zod를 사용했습니다.",
      },
    ],
    projectEvidence: [{ item: "프로젝트", reason: "검증 구현 경험" }],
    statementEvidence: [],
    aiReasoning: [{ item: "사용자", reason: "입력 경험 기반입니다." }],
  },
  gapAnalysis: {
    missingCapabilities: [
      {
        capability: "운영 경험",
        gapLevel: "중간",
        reason: "운영 근거가 부족합니다.",
      },
    ],
    studyItems: ["배포와 모니터링"],
    projectProofItems: ["운영 문서"],
    risksAndWarnings: ["취업 성공을 보장하지 않습니다."],
    aiReasoning: [{ item: "갭", reason: "공고 대비 부족합니다." }],
  },
  projectRecommendation: {
    recommendations: [
      {
        ...baseProject,
        title: "단기 체크리스트",
        projectType: "단기 프로젝트",
        difficulty: "입문",
      },
      {
        ...baseProject,
        title: "리포트 생성기",
        projectType: "중급 포트폴리오 프로젝트",
        difficulty: "중급",
      },
      {
        ...baseProject,
        title: "운영 대시보드",
        projectType: "고급 확장 프로젝트",
        difficulty: "고급",
      },
    ],
    aiReasoning: [{ item: "추천", reason: "갭 보완 목적입니다." }],
  },
  learningRoadmap: {
    fourWeekRoadmap: Array.from({ length: 4 }, (_, index) =>
      roadmapStep(`${index + 1}주차`),
    ),
    eightWeekRoadmap: Array.from({ length: 8 }, (_, index) =>
      roadmapStep(`${index + 1}주차`),
    ),
    twelveWeekRoadmap: Array.from({ length: 12 }, (_, index) =>
      roadmapStep(`${index + 1}주차`),
    ),
    aiReasoning: [{ item: "로드맵", reason: "주차별 산출물을 연결했습니다." }],
  },
  portfolioOutputs: ["README", "Markdown 리포트"],
  risksAndWarnings: ["취업 성공을 보장하지 않습니다."],
  aiReasoning: [{ item: "최종", reason: "입력 결과를 병합했습니다." }],
};

describe("renderFinalReportMarkdown", () => {
  it("renders the main report sections and checklist", () => {
    const markdown = renderFinalReportMarkdown(report);

    expect(markdown).toContain("# JobFit Agent 최종 리포트");
    expect(markdown).toContain("## 4. 역량 갭 분석");
    expect(markdown).toContain("## 8. 학습 로드맵");
    expect(markdown).toContain("[ ] README");
    expect(markdown).toContain("취업 성공, 합격 가능성, 평가 결과를 보장하지 않습니다.");
  });

  it("renders only generated roadmap periods", () => {
    const markdown = renderFinalReportMarkdown({
      ...report,
      learningRoadmap: {
        ...report.learningRoadmap,
        fourWeekRoadmap: [],
        twelveWeekRoadmap: [],
      },
    });

    expect(markdown).not.toContain("### 4주 로드맵");
    expect(markdown).toContain("### 8주 로드맵");
    expect(markdown).not.toContain("### 12주 로드맵");
  });
});
