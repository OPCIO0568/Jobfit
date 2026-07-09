type CompanyStepProps = {
  companyName: string;
  talentProfile: string;
  onChange: (field: "companyName" | "talentProfile", value: string) => void;
};

const inputClass =
  "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const textareaClass = `${inputClass} min-h-64 resize-y leading-6`;

export function CompanyStep({
  companyName,
  talentProfile,
  onChange,
}: CompanyStepProps) {
  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-sm font-semibold text-slate-900">회사명</span>
        <input
          className={inputClass}
          value={companyName}
          onChange={(event) => onChange("companyName", event.target.value)}
          placeholder="예: JobFit Labs"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">회사 인재상</span>
        <textarea
          className={textareaClass}
          value={talentProfile}
          onChange={(event) => onChange("talentProfile", event.target.value)}
          placeholder="회사 홈페이지, 채용 페이지의 인재상 또는 핵심 가치를 붙여넣어 주세요."
        />
      </label>
    </div>
  );
}
