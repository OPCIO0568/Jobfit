import type { GapAnalysis } from "@/lib/types/jobfit";

type GapTableProps = {
  gapAnalysis: GapAnalysis;
};

const levelClass = {
  높음: "bg-red-100 text-red-700",
  중간: "bg-amber-100 text-amber-800",
  낮음: "bg-emerald-100 text-emerald-800",
} satisfies Record<GapAnalysis["missingCapabilities"][number]["gapLevel"], string>;

export function GapTable({ gapAnalysis }: GapTableProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-950">부족 역량</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[220px]" />
            <col className="w-[88px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-3 pr-4 font-semibold">역량</th>
              <th className="py-3 pr-4 text-center font-semibold whitespace-nowrap">
                중요도
              </th>
              <th className="py-3 font-semibold">판단 근거</th>
            </tr>
          </thead>
          <tbody>
            {gapAnalysis.missingCapabilities.map((gap) => (
              <tr key={gap.capability} className="border-b border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-900">
                  {gap.capability}
                </td>
                <td className="py-3 pr-4 text-center">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold whitespace-nowrap ${levelClass[gap.gapLevel]}`}
                  >
                    {gap.gapLevel}
                  </span>
                </td>
                <td className="py-3 leading-6 text-slate-700">{gap.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-4">
          <h4 className="text-sm font-bold text-slate-900">공부로 보완할 항목</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {gapAnalysis.studyItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="font-bold text-emerald-700">□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md bg-slate-50 p-4">
          <h4 className="text-sm font-bold text-slate-900">
            프로젝트로 증명할 항목
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {gapAnalysis.projectProofItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="font-bold text-emerald-700">□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
