import type { LearningRoadmap } from "@/lib/types/jobfit";

type RoadmapViewProps = {
  learningRoadmap: LearningRoadmap;
};

type RoadmapStep = LearningRoadmap["fourWeekRoadmap"][number];

export function RoadmapView({ learningRoadmap }: RoadmapViewProps) {
  const groups = [
    { title: "4주 로드맵", steps: learningRoadmap.fourWeekRoadmap },
    { title: "8주 로드맵", steps: learningRoadmap.eightWeekRoadmap },
    { title: "12주 로드맵", steps: learningRoadmap.twelveWeekRoadmap },
  ].filter((group) => group.steps.length > 0);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-950">학습 로드맵</h3>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <RoadmapGroup
            key={group.title}
            title={group.title}
            steps={group.steps}
          />
        ))}
      </div>
    </section>
  );
}

function RoadmapGroup({
  title,
  steps,
}: {
  title: string;
  steps: readonly RoadmapStep[];
}) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer font-bold text-slate-950">{title}</summary>
      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <details key={`${title}-${step.period}`} className="rounded-md bg-white p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-900">
              {step.period}
            </summary>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
              <BulletList title="목표" items={step.goals} />
              <BulletList title="학습 주제" items={step.studyItems} />
              <BulletList title="실습 과제" items={step.practiceTasks} />
              <BulletList title="프로젝트 진행 단계" items={step.projectTasks} />
              <BulletList title="산출물" items={step.portfolioOutputs} />
              <BulletList title="완료 기준" items={step.completionCriteria} />
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}

function BulletList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div>
      <h4 className="font-bold text-slate-900">{title}</h4>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
