import { GapTable } from "@/components/jobfit/results/GapTable";
import { MarkdownExportButton } from "@/components/jobfit/MarkdownExportButton";
import { PortfolioChecklist } from "@/components/jobfit/results/PortfolioChecklist";
import { ProjectRecommendationList } from "@/components/jobfit/results/ProjectRecommendationList";
import { RequirementCard } from "@/components/jobfit/results/RequirementCard";
import { RoadmapView } from "@/components/jobfit/results/RoadmapView";
import type {
  FinalJobFitReport,
  GapAnalysis,
  JobRequirementAnalysis,
  LearningRoadmap,
  ProjectRecommendation,
  UserCapabilityAnalysis,
} from "@/lib/types/jobfit";

export type ResultDashboardData = {
  jobRequirementAnalysis: JobRequirementAnalysis;
  userCapabilityAnalysis: UserCapabilityAnalysis;
  gapAnalysis: GapAnalysis;
  projectRecommendation: ProjectRecommendation;
  learningRoadmap: LearningRoadmap;
  finalReport: FinalJobFitReport;
  markdown: string;
};

type ResultDashboardProps = {
  result: ResultDashboardData;
};

function roadmapSummary(roadmap: LearningRoadmap) {
  if (roadmap.fourWeekRoadmap.length > 0) {
    return "4주";
  }
  if (roadmap.eightWeekRoadmap.length > 0) {
    return "8주";
  }
  if (roadmap.twelveWeekRoadmap.length > 0) {
    return "12주";
  }

  return "미생성";
}

export function ResultDashboard({ result }: ResultDashboardProps) {
  const summaries = [
    {
      label: "부족 역량",
      value: `${result.gapAnalysis.missingCapabilities.length}개`,
    },
    {
      label: "추천 프로젝트",
      value: `${result.projectRecommendation.recommendations.length}개`,
    },
    {
      label: "학습 로드맵",
      value: roadmapSummary(result.learningRoadmap),
    },
    {
      label: "Markdown",
      value: `${result.markdown.length.toLocaleString()}자`,
    },
  ];

  return (
    <section className="mt-8 space-y-4">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-xl font-bold text-emerald-950">분석 결과</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          추천 프로젝트 {result.projectRecommendation.recommendations.length}개와
          Markdown 리포트 {result.markdown.length.toLocaleString()}자가 생성되었습니다.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaries.map((summary) => (
            <div
              key={summary.label}
              className="rounded-md border border-emerald-200 bg-white px-4 py-3"
            >
              <dt className="text-xs font-semibold text-emerald-700">
                {summary.label}
              </dt>
              <dd className="mt-1 text-lg font-bold text-slate-950">
                {summary.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RequirementCard
          title="채용공고 핵심 요구역량"
          description="공고와 인재상 입력에서 확인된 핵심 요구역량입니다."
          capabilities={result.jobRequirementAnalysis.coreRequiredCapabilities}
        />
        <RequirementCard
          title="사용자 보유 역량"
          description="프로젝트 경험과 자기소개서에서 근거가 확인된 역량입니다."
          capabilities={result.userCapabilityAnalysis.ownedCapabilities}
        />
      </div>

      <GapTable gapAnalysis={result.gapAnalysis} />
      <ProjectRecommendationList
        projectRecommendation={result.projectRecommendation}
      />
      <RoadmapView learningRoadmap={result.learningRoadmap} />
      <PortfolioChecklist
        outputs={result.finalReport.portfolioOutputs}
        warnings={result.finalReport.risksAndWarnings}
      />
      <MarkdownExportButton markdown={result.markdown} />
    </section>
  );
}
