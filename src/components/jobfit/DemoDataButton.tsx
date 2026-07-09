"use client";

import { demoSamples, type DemoJobFitForm } from "@/lib/demo/sample-data";

type DemoDataButtonProps = {
  onSelect: (form: DemoJobFitForm) => void;
};

export function DemoDataButton({ onSelect }: DemoDataButtonProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-slate-950">발표용 샘플 데이터</h2>
        <p className="text-sm leading-6 text-slate-600">
          공개 공고를 복사하지 않은 데모용 예시입니다. 버튼을 누르면 입력값이 채워집니다.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {demoSamples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className="rounded-md border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={() => onSelect(sample.form)}
          >
            <span className="block text-sm font-bold text-slate-950">
              {sample.label}
            </span>
            <span className="mt-2 block text-sm leading-6 text-slate-600">
              {sample.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
