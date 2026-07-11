const DEFAULT_BACKEND_HOST = "127.0.0.1";
const DEFAULT_BACKEND_PORT = "8001";
const LOCAL_UVICORN_PORT = "8000";

export class PythonBackendUnavailableError extends Error {
  constructor() {
    super("Python backend가 실행 중인지 확인하세요.");
    this.name = "PythonBackendUnavailableError";
  }
}

function backendUrls() {
  const explicitUrl =
    process.env.AGENT_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_AGENT_BACKEND_URL?.trim();

  if (explicitUrl) {
    return [explicitUrl.replace(/\/$/, "")];
  }

  const host = process.env.BACKEND_HOST?.trim() || DEFAULT_BACKEND_HOST;
  const port = process.env.BACKEND_PORT?.trim() || DEFAULT_BACKEND_PORT;
  const urls = [`http://${host}:${port}`];

  // uvicorn 기본 포트로 직접 실행한 경우도 지원합니다.
  if (host === DEFAULT_BACKEND_HOST && port !== LOCAL_UVICORN_PORT) {
    urls.push(`http://${host}:${LOCAL_UVICORN_PORT}`);
  }

  return urls;
}

export async function fetchPythonBackend(path: string, init?: RequestInit) {
  for (const baseUrl of backendUrls()) {
    try {
      return await fetch(`${baseUrl}${path}`, init);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
    }
  }

  throw new PythonBackendUnavailableError();
}
