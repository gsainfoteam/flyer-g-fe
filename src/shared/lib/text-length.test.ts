import { describe, expect, it } from "vitest";
import { serverTextLength } from "./text-length";

describe("serverTextLength", () => {
  it("서로게이트 쌍과 이모지 표현 선택자는 한 글자로 센다(validator.js isLength와 같다)", () => {
    expect(serverTextLength("학사기숙사 A동")).toBe(8);
    expect(serverTextLength("😀")).toBe(1);
    expect(serverTextLength("❤️")).toBe(1);
    expect(serverTextLength("😀".repeat(21))).toBe(21);
  });
});
