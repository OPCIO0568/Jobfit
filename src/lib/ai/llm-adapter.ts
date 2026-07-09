import "server-only";

import type { z } from "zod";
import {
  OpenAIClientError,
  generateOpenAIStructuredResult,
  generateOpenAITextResult,
} from "@/lib/ai/openai-client";
import {
  MockAdapterError,
  generateMockStructuredResult,
  generateMockTextResult,
} from "@/lib/ai/mock-adapter";

export type LLMAdapterErrorCode =
  | "OPENAI_CONFIG_ERROR"
  | "OPENAI_REQUEST_FAILED"
  | "OPENAI_RESPONSE_INVALID"
  | "MOCK_RESULT_MISSING"
  | "MOCK_RESULT_INVALID"
  | "LLM_ADAPTER_ERROR";

export class LLMAdapterError extends Error {
  constructor(
    readonly code: LLMAdapterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LLMAdapterError";
  }
}

export type StructuredResultInput<TSchema extends z.ZodType> = {
  prompt: string;
  schema: TSchema;
  schemaName: string;
  systemPrompt?: string;
  mockResult?: z.infer<TSchema>;
};

export type TextResultInput = {
  prompt: string;
  systemPrompt?: string;
  mockText?: string;
};

function isMockAI() {
  return process.env.MOCK_AI?.toLowerCase() === "true";
}

function toLLMAdapterError(error: unknown) {
  if (error instanceof OpenAIClientError || error instanceof MockAdapterError) {
    return new LLMAdapterError(error.code, error.message);
  }

  return new LLMAdapterError(
    "LLM_ADAPTER_ERROR",
    "AI 처리 중 오류가 발생했습니다.",
  );
}

export async function generateStructuredResult<TSchema extends z.ZodType>(
  input: StructuredResultInput<TSchema>,
): Promise<z.infer<TSchema>> {
  try {
    if (isMockAI()) {
      return await generateMockStructuredResult(input);
    }

    return await generateOpenAIStructuredResult(input);
  } catch (error) {
    throw toLLMAdapterError(error);
  }
}

export async function generateTextResult(input: TextResultInput): Promise<string> {
  try {
    if (isMockAI()) {
      return await generateMockTextResult(input);
    }

    return await generateOpenAITextResult(input);
  } catch (error) {
    throw toLLMAdapterError(error);
  }
}
