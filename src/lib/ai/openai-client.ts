import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

const DEFAULT_OPENAI_MODEL = "gpt-5.5";

export type OpenAIClientErrorCode =
  | "OPENAI_CONFIG_ERROR"
  | "OPENAI_REQUEST_FAILED"
  | "OPENAI_RESPONSE_INVALID";

export class OpenAIClientError extends Error {
  constructor(
    readonly code: OpenAIClientErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OpenAIClientError";
  }
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new OpenAIClientError(
      "OPENAI_CONFIG_ERROR",
      "AI 서버 설정이 완료되지 않았습니다.",
    );
  }

  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export async function generateOpenAIStructuredResult<TSchema extends z.ZodType>(
  input: {
    prompt: string;
    schema: TSchema;
    schemaName: string;
    systemPrompt?: string;
  },
): Promise<z.infer<TSchema>> {
  try {
    const response = await getOpenAIClient().responses.parse({
      model: getOpenAIModel(),
      input: input.systemPrompt
        ? `시스템 지침:\n${input.systemPrompt}\n\n사용자 요청:\n${input.prompt}`
        : input.prompt,
      text: {
        format: zodTextFormat(input.schema, input.schemaName),
      },
    });

    if (response.output_parsed === null) {
      throw new OpenAIClientError(
        "OPENAI_RESPONSE_INVALID",
        "AI 응답 구조가 올바르지 않습니다.",
      );
    }

    return input.schema.parse(response.output_parsed);
  } catch (error) {
    if (error instanceof OpenAIClientError) {
      throw error;
    }

    throw new OpenAIClientError(
      "OPENAI_REQUEST_FAILED",
      "AI 응답 생성에 실패했습니다.",
    );
  }
}

export async function generateOpenAITextResult(input: {
  prompt: string;
  systemPrompt?: string;
}): Promise<string> {
  try {
    const response = await getOpenAIClient().responses.create({
      model: getOpenAIModel(),
      instructions: input.systemPrompt,
      input: input.prompt,
    });

    return response.output_text;
  } catch (error) {
    if (error instanceof OpenAIClientError) {
      throw error;
    }

    throw new OpenAIClientError(
      "OPENAI_REQUEST_FAILED",
      "AI 응답 생성에 실패했습니다.",
    );
  }
}
