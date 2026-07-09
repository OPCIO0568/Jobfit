"use client";

import { useState } from "react";
import {
  buildJobFitReportFilename,
  copyMarkdownToClipboard,
  downloadMarkdownFile,
} from "@/lib/report/download";

type MarkdownExportButtonProps = {
  markdown: string;
};

export function MarkdownExportButton({ markdown }: MarkdownExportButtonProps) {
  const [message, setMessage] = useState("");
  const filename = buildJobFitReportFilename();

  async function handleCopy() {
    try {
      await copyMarkdownToClipboard(markdown);
      setMessage("Markdown을 클립보드에 복사했습니다.");
    } catch {
      setMessage("클립보드 복사에 실패했습니다.");
    }
  }

  function handleDownload() {
    const confirmed = window.confirm(
      "리포트에 자기소개서, 프로젝트 경험 등 민감정보가 포함될 수 있습니다. 다운로드 전에 내용을 확인했습니까?",
    );

    if (!confirmed) {
      return;
    }

    downloadMarkdownFile(markdown);
    setMessage(`${filename} 다운로드를 시작했습니다.`);
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Markdown 내보내기</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            다운로드 파일명은 <span className="font-semibold">{filename}</span> 입니다.
          </p>
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            다운로드 전 리포트에 개인정보, 연락처, 자기소개서 원문, 민감한 프로젝트
            정보가 포함되어 있지 않은지 확인하세요.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={handleCopy}
          >
            클립보드 복사
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={handleDownload}
          >
            .md 다운로드
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>
      ) : null}

      <details className="mt-4 rounded-md bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-950">
          최종 리포트 Markdown 미리보기
        </summary>
        <textarea
          className="mt-3 min-h-72 w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800"
          readOnly
          value={markdown}
        />
      </details>
    </section>
  );
}
