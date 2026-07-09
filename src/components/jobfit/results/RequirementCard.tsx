import type {
  JobRequirementAnalysis,
  UserCapabilityAnalysis,
} from "@/lib/types/jobfit";

type Capability =
  | JobRequirementAnalysis["coreRequiredCapabilities"][number]
  | UserCapabilityAnalysis["ownedCapabilities"][number];

type RequirementCardProps = {
  title: string;
  description: string;
  capabilities: readonly Capability[];
};

export function RequirementCard({
  title,
  description,
  capabilities,
}: RequirementCardProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {capabilities.map((capability) => (
          <details
            key={`${capability.name}-${capability.category}`}
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              {capability.name}
              <span className="ml-2 rounded-md bg-slate-200 px-2 py-1 text-xs text-slate-700">
                {capability.category}
              </span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              근거: {capability.evidence}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
