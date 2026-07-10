type PortfolioChecklistProps = {
  outputs: readonly string[];
  warnings: readonly string[];
};

export function PortfolioChecklist({
  outputs,
  warnings,
}: PortfolioChecklistProps) {
  const uniqueWarnings = Array.from(new Set(warnings));

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-950">
        포트폴리오 산출물 체크리스트
      </h3>
      <ul className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        {outputs.map((output) => (
          <li key={output} className="flex gap-2 rounded-md bg-slate-50 p-3">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>{output}</span>
          </li>
        ))}
      </ul>

      <details className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
        <summary className="cursor-pointer font-bold text-amber-950">
          AI 분석 한계와 주의사항
        </summary>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
          {uniqueWarnings.map((warning, index) => (
            <li key={`${warning}-${index}`}>- {warning}</li>
          ))}
          <li>- 이 결과는 입력된 정보 기반의 참고 자료이며 취업 성공을 보장하지 않습니다.</li>
          <li>- 사용자가 실제 수행하지 않은 경험을 이미 수행한 것처럼 표현하지 마세요.</li>
        </ul>
      </details>
    </section>
  );
}
