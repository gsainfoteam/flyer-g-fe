import { describe, expect, it } from "vitest";
import { safeReturnTo, to } from "./routes";

describe("safeReturnTo", () => {
  it("앱 내부 경로는 그대로 쓴다", () => {
    expect(safeReturnTo("/reviews")).toBe("/reviews");
    expect(safeReturnTo("/submissions/abc?tab=history")).toBe(
      "/submissions/abc?tab=history",
    );
  });

  it("외부 주소로 넘어가지 않는다", () => {
    // 열린 리다이렉트 방지. 로그인 뒤 낯선 사이트로 보내지지 않아야 한다. (명세 9.4)
    expect(safeReturnTo("https://evil.example.com")).toBe("/");
    expect(safeReturnTo("//evil.example.com")).toBe("/");
    expect(safeReturnTo("/\\evil.example.com")).toBe("/");
    expect(safeReturnTo("javascript:alert(1)")).toBe("/");
  });

  it("값이 없으면 기본 경로로 둔다", () => {
    expect(safeReturnTo(null)).toBe("/");
    expect(safeReturnTo(undefined)).toBe("/");
    expect(safeReturnTo("")).toBe("/");
    expect(safeReturnTo(null, "/studio")).toBe("/studio");
  });
});

describe("to", () => {
  it("경로 조각을 안전하게 인코딩한다", () => {
    expect(to.submissionDetail("a b/c")).toBe("/submissions/a%20b%2Fc");
    expect(to.display("device 1")).toBe("/display/device%201");
  });

  it("복귀 경로가 홈이면 query를 붙이지 않는다", () => {
    expect(to.login("/")).toBe("/login");
    expect(to.login()).toBe("/login");
    expect(to.login("/reviews")).toBe("/login?returnTo=%2Freviews");
  });
});
