import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import {
  generateMockStructuredResult,
  generateMockTextResult,
} from "./mock-adapter";

describe("mock AI adapter", () => {
  it("returns schema-validated structured mock results", async () => {
    const schema = z.object({
      title: z.string(),
      items: z.array(z.string()).min(1),
    });

    await expect(
      generateMockStructuredResult({
        schema,
        mockResult: { title: "Mock", items: ["구조화 응답"] },
      }),
    ).resolves.toEqual({ title: "Mock", items: ["구조화 응답"] });
  });

  it("rejects invalid mock result structures", async () => {
    const schema = z.object({ title: z.string() });
    const invalidMock = { title: 1 } as unknown as z.infer<typeof schema>;

    await expect(
      generateMockStructuredResult({ schema, mockResult: invalidMock }),
    ).rejects.toMatchObject({ code: "MOCK_RESULT_INVALID" });
  });

  it("returns fallback mock text without calling OpenAI", async () => {
    await expect(generateMockTextResult({})).resolves.toContain("MOCK_AI=true");
  });
});
