import { NextResponse } from "next/server";

const DEFAULT_BACKEND_HOST = "127.0.0.1";
const DEFAULT_BACKEND_PORT = "8001";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "요청 JSON 형식이 올바르지 않습니다." } },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${getBackendUrl()}/agent/jobfit/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "PYTHON_BACKEND_UNAVAILABLE",
          message: "Python backend가 실행 중인지 확인하세요.",
        },
      },
      { status: 502 },
    );
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
