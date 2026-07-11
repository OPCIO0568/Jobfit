import { NextResponse } from "next/server";
import { fetchPythonBackend } from "../backend";

export const maxDuration = 300;

const BACKEND_TIMEOUT_MS = 300_000;

function backendUnavailableResponse() {
  return NextResponse.json(
    {
      error: {
        code: "PYTHON_BACKEND_UNAVAILABLE",
        message: "Python backend가 실행 중인지 확인하세요.",
        action:
          "루트 폴더에서 .\\scripts\\dev.ps1 backend 명령으로 실행한 뒤 다시 시도하세요.",
      },
    },
    { status: 502 },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "요청 JSON 형식이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const response = await fetchPythonBackend("/agent/jobfit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: {
            code: "PYTHON_BACKEND_TIMEOUT",
            message: "Python LangGraph Agent 응답이 5분 안에 완료되지 않았습니다.",
            action: "입력 내용을 조금 줄이거나 Python backend 로그를 확인한 뒤 다시 시도하세요.",
          },
        },
        { status: 504 },
      );
    }

    return backendUnavailableResponse();
  } finally {
    clearTimeout(timeoutId);
  }
}
