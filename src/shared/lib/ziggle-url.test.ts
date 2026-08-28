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

  it("allowlist 우회 시도를 막는다 (명세 9.4)", () => {
    // userinfo 트릭: 브라우저는 @ 뒤를 host로 읽는다.
    expect(
      isAllowedZiggleUrl("https://ziggle.gistory.me@evil.example.com/x"),
    ).toBe(false);
    // 하위 도메인 위장
    expect(isAllowedZiggleUrl("https://evil.ziggle.gistory.me/x")).toBe(false);
    expect(isAllowedZiggleUrl("https://ziggle.gistory.me.evil.com")).toBe(false);
    // 스킴 변형. URL 파서가 같은 안전한 목적지로 정규화하는 형태는 허용된다.
    expect(isAllowedZiggleUrl("HTTPS://ziggle.gistory.me/x")).toBe(true);
    expect(isAllowedZiggleUrl("https:ziggle.gistory.me/x")).toBe(true);
    expect(isAllowedZiggleUrl(" https://ziggle.gistory.me/x")).toBe(true);
    // 스킴 상대·비HTTP 스킴은 막는다.
    expect(isAllowedZiggleUrl("//ziggle.gistory.me/x")).toBe(false);
    expect(isAllowedZiggleUrl("data:text/html,hi")).toBe(false);
    // 포트가 붙어도 hostname은 같다 — 허용 여부를 명시적으로 고정한다.
    expect(isAllowedZiggleUrl("https://ziggle.gistory.me:8443/x")).toBe(true);
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
