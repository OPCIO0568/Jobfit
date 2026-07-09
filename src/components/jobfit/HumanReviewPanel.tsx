"use client";

import { useState } from "react";
import type {
  CurrentLevel,
  LearningRoadmap,
  PreferredProjectStyle,
  ProjectRecommendation,
} from "@/lib/types/jobfit";

export type HumanReviewValues = {
  preparationPeriod: string;
  preferredProjectStyle: PreferredProjectStyle;
  currentLevel: CurrentLevel;
  selectedProjectTitle: string;
  feedback: string;
};

type HumanReviewPanelProps = {
  preparationPeriod: string;
  preferredProjectStyle: PreferredProjectStyle;
  currentLevel: CurrentLevel;
  projectRecommendation: ProjectRecommendation;
  learningRoadmap: LearningRoadmap;
  isRegenerating: boolean;
  isApproving: boolean;
  onRegenerateRoadmap: (values: HumanReviewValues) => void;
  onApproveFinalReport: () => void;
};

const inputClass =
  "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function activeRoadmap(learningRoadmap: LearningRoadmap) {
  if (learningRoadmap.fourWeekRoadmap.length > 0) {
    return learningRoadmap.fourWeekRoadmap;
  }
  if (learningRoadmap.eightWeekRoadmap.length > 0) {
    return learningRoadmap.eightWeekRoadmap;
  }

  return learningRoadmap.twelveWeekRoadmap;
}

export function HumanReviewPanel({
  preparationPeriod,
  preferredProjectStyle,
  currentLevel,
  projectRecommendation,
  learningRoadmap,
  isRegenerating,
  isApproving,
  onRegenerateRoadmap,
  onApproveFinalReport,
}: HumanReviewPanelProps) {
  const [values, setValues] = useState<HumanReviewValues>({
    preparationPeriod,
    preferredProjectStyle,
    currentLevel,
    selectedProjectTitle: projectRecommendation.recommendations[0]?.title ?? "",
    feedback: "",
  });
  const isBusy = isRegenerating || isApproving;
  const previewRoadmap = activeRoadmap(learningRoadmap).slice(0, 2);

  function updateValue<TField extends keyof HumanReviewValues>(
    field: TField,
    value: HumanReviewValues[TField],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-emerald-800">
          Human-in-the-loop 검토
        </p>
        <h2 className="text-xl font-bold text-emerald-950">
          추천 결과를 검토한 뒤 최종 리포트를 생성하세요
        </h2>
        <p className="text-sm leading-6 text-emerald-900">
          AI는 결정을 대신하지 않습니다. 추천 프로젝트와 로드맵은 참고 자료이며,
          최종 선택과 실행 범위는 사용자가 승인해야 합니다.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-slate-900">
            목표 준비 기간
          </span>
          <input
            className={inputClass}
            value={values.preparationPeriod}
            onChange={(event) =>
              updateValue("preparationPeriod", event.target.value)
            }
            placeholder="예: 4주, 8주, 12주"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-900">
            프로젝트 선호 방식
          </span>
          <select
            className={inputClass}
            value={values.preferredProjectStyle}
            onChange={(event) =>
              updateValue(
                "preferredProjectStyle",
                event.target.value as PreferredProjectStyle,
              )
            }
          >
            <option value="개인">개인</option>
            <option value="팀">팀</option>
            <option value="상관없음">상관없음</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-900">현재 수준</span>
          <select
            className={inputClass}
            value={values.currentLevel}
            onChange={(event) =>
              updateValue("currentLevel", event.target.value as CurrentLevel)
            }
          >
            <option value="입문">입문</option>
            <option value="중급">중급</option>
            <option value="고급">고급</option>
          </select>
        </label>
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-slate-900">
          기준으로 삼을 추천 프로젝트
        </span>
        <select
          className={inputClass}
          value={values.selectedProjectTitle}
          onChange={(event) =>
            updateValue("selectedProjectTitle", event.target.value)
          }
        >
          {projectRecommendation.recommendations.map((project) => (
            <option key={project.title} value={project.title}>
              {project.title} - {project.difficulty}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-slate-900">피드백</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y leading-6`}
          value={values.feedback}
          onChange={(event) => updateValue("feedback", event.target.value)}
          placeholder="예: 이 추천은 너무 어려움, 더 실무적으로, 기간을 줄여서 다시 구성"
        />
      </label>

      <details className="mt-5 rounded-md bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-950">
          현재 로드맵 미리보기
        </summary>
        <div className="mt-3 space-y-4 text-sm text-slate-700">
          {learningRoadmap.aiReasoning[0] ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900">
              {learningRoadmap.aiReasoning[0].reason}
            </p>
          ) : null}
          {previewRoadmap.map((step) => (
            <div key={step.period} className="rounded-md border border-slate-200 p-3">
              <p className="font-bold text-slate-950">{step.period}</p>
              <p className="mt-2 font-semibold text-slate-900">목표</p>
              <ul className="mt-1 space-y-1">
                {step.goals.map((goal) => (
                  <li key={goal}>- {goal}</li>
                ))}
              </ul>
              <p className="mt-2 font-semibold text-slate-900">프로젝트 작업</p>
              <ul className="mt-1 space-y-1">
                {step.projectTasks.map((task) => (
                  <li key={task}>- {task}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-md border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onRegenerateRoadmap(values)}
          disabled={isBusy}
        >
          선택 프로젝트 기준으로 로드맵 재생성
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onApproveFinalReport}
          disabled={isBusy}
        >
          사용자 승인 후 최종 리포트 생성
        </button>
      </div>
    </section>
  );
}
