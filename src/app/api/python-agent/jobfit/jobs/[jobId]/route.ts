import { NextResponse } from "next/server";

const DEFAULT_BACKEND_HOST = "127.0.0.1";
const DEFAULT_BACKEND_PORT = "8001";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const response = await fetch(
      `${getBackendUrl()}/agent/jobfit/jobs/${encodeURIComponent(jobId)}`,
      { cache: "no-store" },
    );
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
