import { NextResponse } from "next/server";

const DEFAULT_BACKEND_HOST = "127.0.0.1";
const DEFAULT_BACKEND_PORT = "8001";

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
  const backendUrl = getBackendUrl();

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

  try {
    const response = await fetch(`${backendUrl}/agent/jobfit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    return NextResponse.json(data, { status: response.status });
  } catch {
    return backendUnavailableResponse();
  }
}

function getBackendUrl() {
  const explicitUrl =
    process.env.AGENT_BACKEND_URL ??
    process.env.NEXT_PUBLIC_AGENT_BACKEND_URL;

  if (explicitUrl?.trim()) {
    return explicitUrl.trim().replace(/\/$/, "");
  }

  const host = process.env.BACKEND_HOST?.trim() || DEFAULT_BACKEND_HOST;
  const port = process.env.BACKEND_PORT?.trim() || DEFAULT_BACKEND_PORT;
  return `http://${host}:${port}`;
}
