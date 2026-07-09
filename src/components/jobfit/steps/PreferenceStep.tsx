type PreferenceStepProps = {
  preparationPeriod: string;
  preferredProjectStyle: string;
  currentLevel: string;
  onChange: (
    field: "preparationPeriod" | "preferredProjectStyle" | "currentLevel",
    value: string,
  ) => void;
};

const inputClass =
  "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export function PreferenceStep({
  preparationPeriod,
  preferredProjectStyle,
  currentLevel,
  onChange,
}: PreferenceStepProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm font-semibold text-slate-900">준비 가능 기간</span>
        <input
          className={inputClass}
          value={preparationPeriod}
          onChange={(event) => onChange("preparationPeriod", event.target.value)}
          placeholder="예: 4주, 8주, 12주"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">
          선호 프로젝트 방식
        </span>
        <select
          className={inputClass}
          value={preferredProjectStyle}
          onChange={(event) => onChange("preferredProjectStyle", event.target.value)}
        >
          <option value="">선택해 주세요</option>
          <option value="개인">개인</option>
          <option value="팀">팀</option>
          <option value="상관없음">상관없음</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">현재 수준</span>
        <select
          className={inputClass}
          value={currentLevel}
          onChange={(event) => onChange("currentLevel", event.target.value)}
        >
          <option value="">선택해 주세요</option>
          <option value="입문">입문</option>
          <option value="중급">중급</option>
          <option value="고급">고급</option>
        </select>
      </label>
    </div>
  );
}
