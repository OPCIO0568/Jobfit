type UserProfileStepProps = {
  techStack: string;
  projectExperience: string;
  experienceNarrative: string;
  onChange: (
    field: "techStack" | "projectExperience" | "experienceNarrative",
    value: string,
  ) => void;
};

const inputClass =
  "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const textareaClass = `${inputClass} min-h-36 resize-y leading-6`;

export function UserProfileStep({
  techStack,
  projectExperience,
  experienceNarrative,
  onChange,
}: UserProfileStepProps) {
  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-sm font-semibold text-slate-900">기술스택</span>
        <input
          className={inputClass}
          value={techStack}
          onChange={(event) => onChange("techStack", event.target.value)}
          placeholder="예: TypeScript, Next.js, Node.js, PostgreSQL"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">프로젝트 경험</span>
        <textarea
          className={textareaClass}
          value={projectExperience}
          onChange={(event) => onChange("projectExperience", event.target.value)}
          placeholder="프로젝트명, 역할, 사용 기술, 구현 내용, 결과물을 적어 주세요."
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">
          자기소개서 또는 경험 서술
        </span>
        <textarea
          className={textareaClass}
          value={experienceNarrative}
          onChange={(event) => onChange("experienceNarrative", event.target.value)}
          placeholder="지원 직무와 관련된 경험을 요약해 주세요. 주민등록번호, 전화번호, 상세 주소는 입력하지 마세요."
        />
      </label>
    </div>
  );
}
