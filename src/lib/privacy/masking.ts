const DEFAULT_MAX_INPUT_LENGTH = 20_000;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /(^|[^\d])((?:\+82[-.\s]?)?0?1[016789][-\s.]?\d{3,4}[-.\s.]?\d{4}|0\d{1,2}[-.\s.]\d{3,4}[-.\s.]\d{4})(?=$|[^\d])/g;
const RESIDENT_ID_PATTERN = /(^|[^\d])(\d{6}[-\s]?[1-8]\d{6})(?=$|[^\d])/g;
const LONG_NUMBER_PATTERN = /(^|[^\d])(\d{8,12})(?=$|[^\d])/g;

function stripUrlQueryString(url: string) {
  const queryIndex = url.indexOf("?");

  if (queryIndex === -1) {
    return url;
  }

  const hashIndex = url.indexOf("#", queryIndex);
  return hashIndex === -1
    ? url.slice(0, queryIndex)
    : `${url.slice(0, queryIndex)}${url.slice(hashIndex)}`;
}

function withUrlPlaceholders(text: string) {
  const urls: string[] = [];
  const textWithPlaceholders = text.replace(URL_PATTERN, (url) => {
    const token = `__JOBFIT_URL_${urls.length}__`;
    urls.push(stripUrlQueryString(url));
    return token;
  });

  return { textWithPlaceholders, urls };
}

function restoreUrls(text: string, urls: readonly string[]) {
  return urls.reduce(
    (result, url, index) => result.replace(`__JOBFIT_URL_${index}__`, url),
    text,
  );
}

export function maskSensitiveText(text: string): string {
  const { textWithPlaceholders, urls } = withUrlPlaceholders(text);
  const masked = textWithPlaceholders
    .replace(EMAIL_PATTERN, "[이메일 마스킹]")
    .replace(PHONE_PATTERN, "$1[전화번호 마스킹]")
    .replace(RESIDENT_ID_PATTERN, "$1[주민등록번호 마스킹]")
    .replace(LONG_NUMBER_PATTERN, "$1[긴 숫자 마스킹]");

  return restoreUrls(masked, urls);
}

export function truncateInput(text: string, maxLength: number): string {
  const safeMaxLength = Math.max(0, maxLength);
  return Array.from(text).slice(0, safeMaxLength).join("");
}

export function sanitizeUserInput(text: string): string {
  return truncateInput(
    maskSensitiveText(text.replaceAll("\u0000", "").replace(/\r\n?/g, "\n")),
    DEFAULT_MAX_INPUT_LENGTH,
  );
}

/*
테스트 가능한 예시:
- maskSensitiveText("mail me@test.com") -> "mail [이메일 마스킹]"
- maskSensitiveText("010-1234-5678") -> "[전화번호 마스킹]"
- maskSensitiveText("900101-1234567") -> "[주민등록번호 마스킹]"
- maskSensitiveText("학번 2020123456") -> "학번 [긴 숫자 마스킹]"
- maskSensitiveText("https://example.com/a/123?token=secret#top") -> "https://example.com/a/123#top"
- truncateInput("abcdef", 3) -> "abc"
*/
