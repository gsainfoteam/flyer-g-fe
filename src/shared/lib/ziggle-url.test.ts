import { describe, expect, it } from "vitest";
import { isAllowedZiggleUrl, normalizeLegacyZiggleUrl } from "./ziggle-url";

describe("isAllowedZiggleUrl", () => {
  it("공식 Ziggle HTTPS 주소만 허용한다", () => {
    expect(isAllowedZiggleUrl("https://ziggle.gistory.me/notice/1")).toBe(true);
  });

  it("HTTP, 다른 도메인, 유사 도메인, 잘못된 형식을 막는다", () => {
    expect(isAllowedZiggleUrl("http://ziggle.gistory.me/notice/1")).toBe(false);
    expect(isAllowedZiggleUrl("https://evil.example.com/notice/1")).toBe(false);
    expect(isAllowedZiggleUrl("https://ziggle.gistory.me.evil.com/x")).toBe(false);
    expect(isAllowedZiggleUrl("https://ziggle.gist.ac.kr/notice/1")).toBe(false);
    expect(isAllowedZiggleUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedZiggleUrl("")).toBe(false);
  });
});

describe("normalizeLegacyZiggleUrl", () => {
  it("구 host만 공식 host로 바꾼다", () => {
    expect(normalizeLegacyZiggleUrl("https://ziggle.gist.ac.kr/notices/a")).toBe(
      "https://ziggle.gistory.me/notices/a",
    );
  });

  it("이미 공식 주소이거나 대상이 아니면 그대로 둔다", () => {
    expect(normalizeLegacyZiggleUrl("https://ziggle.gistory.me/x")).toBe(
      "https://ziggle.gistory.me/x",
    );
    expect(normalizeLegacyZiggleUrl("not-a-url")).toBe("not-a-url");
  });
});
