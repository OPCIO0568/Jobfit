import { describe, expect, it } from "vitest";
import { maskSensitiveText, sanitizeUserInput, truncateInput } from "./masking";

describe("privacy masking", () => {
  it("masks common sensitive identifiers without masking normal Korean names", () => {
    const masked = maskSensitiveText(
      "홍길동 email test@example.com phone 010-1234-5678 rrn 900101-1234567 학번 2020123456",
    );

    expect(masked).toContain("홍길동");
    expect(masked).toContain("[이메일 마스킹]");
    expect(masked).toContain("[전화번호 마스킹]");
    expect(masked).toContain("[주민등록번호 마스킹]");
    expect(masked).toContain("[긴 숫자 마스킹]");
  });

  it("keeps URLs but strips query strings", () => {
    expect(
      sanitizeUserInput("https://example.com/report/123?token=secret#top"),
    ).toBe("https://example.com/report/123#top");
  });

  it("truncates by character length", () => {
    expect(truncateInput("abcdef", 3)).toBe("abc");
  });
});
