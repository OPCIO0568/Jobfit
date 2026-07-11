import { NextResponse } from "next/server";
import { fetchPythonBackend } from "../../../backend";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const response = await fetchPythonBackend(
      `/agent/jobfit/jobs/${encodeURIComponent(jobId)}`,
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
