type JobPostingStepProps = {
  targetRole: string;
  rawPosting: string;
  onChange: (field: "targetRole" | "rawPosting", value: string) => void;
};

const inputClass =
  "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const textareaClass = `${inputClass} min-h-64 resize-y leading-6`;

export function JobPostingStep({
  targetRole,
  rawPosting,
  onChange,
}: JobPostingStepProps) {
  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-sm font-semibold text-slate-900">목표 직무</span>
        <input
          className={inputClass}
          value={targetRole}
          onChange={(event) => onChange("targetRole", event.target.value)}
          placeholder="예: 프론트엔드 개발자, 백엔드 개발자, AI 서비스 개발자"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">채용공고 원문</span>
        <textarea
          className={textareaClass}
          value={rawPosting}
          onChange={(event) => onChange("rawPosting", event.target.value)}
          placeholder="담당업무, 자격요건, 우대사항이 보이도록 채용공고 내용을 붙여넣어 주세요."
        />
      </label>
    </div>
  );
}
