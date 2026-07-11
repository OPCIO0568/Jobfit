import { NextResponse } from "next/server";
import { fetchPythonBackend } from "../../backend";

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
    const response = await fetchPythonBackend("/agent/jobfit/jobs", {
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
