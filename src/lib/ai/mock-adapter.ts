import "server-only";

import type { z } from "zod";

export type MockAdapterErrorCode = "MOCK_RESULT_MISSING" | "MOCK_RESULT_INVALID";

export class MockAdapterError extends Error {
  constructor(
    readonly code: MockAdapterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MockAdapterError";
  }
}

export async function generateMockStructuredResult<TSchema extends z.ZodType>(
  input: {
    schema: TSchema;
    mockResult?: z.infer<TSchema>;
  },
): Promise<z.infer<TSchema>> {
  if (input.mockResult === undefined) {
    throw new MockAdapterError(
      "MOCK_RESULT_MISSING",
      "Mock AI 결과가 설정되지 않았습니다.",
    );
  }

  try {
    return input.schema.parse(input.mockResult);
  } catch {
    throw new MockAdapterError(
      "MOCK_RESULT_INVALID",
      "Mock AI 결과 구조가 올바르지 않습니다.",
    );
  }
}

export async function generateMockTextResult(input: {
  mockText?: string;
}): Promise<string> {
  return input.mockText ?? "MOCK_AI=true: 아직 Mock 텍스트 결과가 설정되지 않았습니다.";
}
