import type { ProjectRecommendation } from "@/lib/types/jobfit";

type ProjectRecommendationListProps = {
  projectRecommendation: ProjectRecommendation;
};

export function ProjectRecommendationList({
  projectRecommendation,
}: ProjectRecommendationListProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-950">추천 프로젝트 3개</h3>
      <div className="mt-4 grid gap-4">
        {projectRecommendation.recommendations.map((project) => (
          <details
            key={project.title}
            className="rounded-md border border-slate-200 bg-slate-50 p-4"
          >
            <summary className="cursor-pointer">
              <span className="flex flex-wrap items-center gap-2 pr-2">
                <span className="font-bold text-slate-950">{project.title}</span>
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold whitespace-nowrap text-emerald-800">
                  {project.difficulty}
                </span>
                <span className="text-sm whitespace-nowrap text-slate-600">
                  {project.projectType}
                </span>
              </span>
            </summary>

            <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-700">
              <p>
                <strong className="text-slate-900">목표 직무 연결성:</strong>{" "}
                {project.targetRoleConnection}
              </p>
              <p>
                <strong className="text-slate-900">해결하는 문제:</strong>{" "}
                {project.problemToSolve}
              </p>
              <p>
                <strong className="text-slate-900">사용 기술:</strong>{" "}
                {project.techStack.join(", ")}
              </p>
              <p>
                <strong className="text-slate-900">예상 기간:</strong>{" "}
                {project.estimatedPeriod}
              </p>
              <p>
                <strong className="text-slate-900">축소 버전:</strong>{" "}
                {project.smallerVersion}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Checklist title="필수 산출물" items={project.requiredOutputs} />
                <Checklist
                  title="면접에서 어필할 포인트"
                  items={project.interviewPoints}
                />
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function Checklist({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div className="rounded-md bg-white p-3">
      <h4 className="font-bold text-slate-900">{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
