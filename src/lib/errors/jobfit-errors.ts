export type JobFitErrorCode =
  | "VALIDATION_ERROR"
  | "INPUT_TOO_SHORT"
  | "JOB_POSTING_TOO_SHORT"
  | "USER_EXPERIENCE_TOO_SHORT"
  | "OPENAI_CONFIG_ERROR"
  | "OPENAI_REQUEST_FAILED"
  | "OPENAI_RESPONSE_INVALID"
  | "NETWORK_ERROR"
  | "MOCK_RESULT_MISSING"
  | "MOCK_RESULT_INVALID"
  | "LLM_ADAPTER_ERROR"
  | "UNKNOWN_ERROR";

export type JobFitErrorResponse = {
  error: {
    code: JobFitErrorCode | string;
    message: string;
    action?: string;
  };
};

export type SafeJobFitError = {
  status: number;
  body: JobFitErrorResponse;
};

type ErrorLike = {
  code?: unknown;
  message?: unknown;
};

type ErrorCopy = {
  message: string;
  action: string;
  status: number;
};

export const MIN_INPUT_LENGTHS = {
  jobPosting: 80,
  companyProfile: 20,
  userExperience: 40,
} as const;

const ERROR_COPY: Record<string, ErrorCopy> = {
  VALIDATION_ERROR: {
    status: 400,
    message: "입력값이 올바르지 않습니다.",
    action: "필수 입력값과 선택 항목 형식을 확인한 뒤 다시 시도해 주세요.",
  },
  INPUT_TOO_SHORT: {
    status: 400,
    message: "입력 내용이 너무 짧습니다.",
    action: "분석 근거가 될 문장을 조금 더 구체적으로 입력해 주세요.",
  },
  JOB_POSTING_TOO_SHORT: {
    status: 400,
    message: "채용공고 내용이 부족합니다.",
    action:
      "담당업무, 필수사항, 우대사항이 드러나도록 공고 내용을 더 붙여넣어 주세요.",
  },
  USER_EXPERIENCE_TOO_SHORT: {
    status: 400,
    message: "사용자 경험 내용이 부족합니다.",
    action:
      "프로젝트 역할, 사용 기술, 구현 내용, 결과물을 더 구체적으로 입력해 주세요.",
  },
  OPENAI_CONFIG_ERROR: {
    status: 500,
    message: "AI 서버 설정이 완료되지 않았습니다.",
    action:
      "OPENAI_API_KEY를 서버 환경변수로 설정하거나, 데모 확인은 MOCK_AI=true로 실행해 주세요.",
  },
  OPENAI_REQUEST_FAILED: {
    status: 502,
    message: "AI 호출에 실패했습니다.",
    action:
      "잠시 후 다시 시도해 주세요. 문제가 계속되면 네트워크 상태와 OPENAI_MODEL 설정을 확인해 주세요.",
  },
  OPENAI_RESPONSE_INVALID: {
    status: 502,
    message: "AI 응답 구조가 예상과 다릅니다.",
    action:
      "다시 시도해 주세요. 반복되면 입력을 더 구체적으로 보완한 뒤 분석을 실행해 주세요.",
  },
  MOCK_RESULT_MISSING: {
    status: 500,
    message: "Mock AI 응답이 준비되지 않았습니다.",
    action: "MOCK_AI 설정 또는 해당 API의 mockResult 구성을 확인해 주세요.",
  },
  MOCK_RESULT_INVALID: {
    status: 500,
    message: "Mock AI 응답 구조가 예상과 다릅니다.",
    action: "Mock 데이터가 Zod Schema와 일치하는지 확인해 주세요.",
  },
  LLM_ADAPTER_ERROR: {
    status: 502,
    message: "AI 처리 중 오류가 발생했습니다.",
    action: "잠시 후 다시 시도해 주세요.",
  },
  NETWORK_ERROR: {
    status: 0,
    message: "네트워크 오류가 발생했습니다.",
    action: "인터넷 연결 또는 로컬 개발 서버 상태를 확인한 뒤 다시 시도해 주세요.",
  },
  UNKNOWN_ERROR: {
    status: 500,
    message: "요청 처리 중 오류가 발생했습니다.",
    action: "잠시 후 다시 시도해 주세요.",
  },
};

export function hasMinimumTextLength(text: string, minLength: number) {
  return text.trim().length >= minLength;
}

export function createJobFitErrorResponse(
  code: JobFitErrorCode | string,
  message?: string,
  action?: string,
): JobFitErrorResponse {
  const copy = ERROR_COPY[code] ?? ERROR_COPY.UNKNOWN_ERROR;

  return {
    error: {
      code,
      message: message ?? copy.message,
      action: action ?? copy.action,
    },
  };
}

export function createSafeJobFitError(
  code: JobFitErrorCode | string,
  message?: string,
  action?: string,
): SafeJobFitError {
  const copy = ERROR_COPY[code] ?? ERROR_COPY.UNKNOWN_ERROR;

  return {
    status: copy.status,
    body: createJobFitErrorResponse(code, message, action),
  };
}

export function validationJobFitError(): SafeJobFitError {
  return createSafeJobFitError("VALIDATION_ERROR");
}

export function toSafeJobFitError(
  error: unknown,
  fallbackMessage: string,
): SafeJobFitError {
  const errorLike = error as ErrorLike;
  const code = typeof errorLike.code === "string" ? errorLike.code : undefined;

  if (code && ERROR_COPY[code]) {
    return createSafeJobFitError(code);
  }

  return createSafeJobFitError("UNKNOWN_ERROR", fallbackMessage);
}

export function getJobFitClientErrorMessage(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
  ) {
    const message = body.error.message;

    if ("action" in body.error && typeof body.error.action === "string") {
      return `${message} ${body.error.action}`;
    }

    return message;
  }

  return ERROR_COPY.UNKNOWN_ERROR.message;
}

export function networkJobFitErrorMessage() {
  const body = createJobFitErrorResponse("NETWORK_ERROR");

  return getJobFitClientErrorMessage(body);
}
