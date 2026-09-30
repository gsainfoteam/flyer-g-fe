import { describe, expect, it } from "vitest";
import { josa } from "./josa";

describe("josa", () => {
  it("받침이 있으면 앞 형태, 없으면 뒤 형태를 고른다", () => {
    expect(josa("정기공연", "을/를")).toBe("을");
    expect(josa("할로윈 파티", "을/를")).toBe("를");
    expect(josa("신입 모집", "이/가")).toBe("이");
    expect(josa("플리마켓 안내", "이/가")).toBe("가");
  });

  it("마지막 글자가 한글이 아니면 두 형태를 함께 쓴다", () => {
    expect(josa("전시 〈선 긋기〉", "을/를")).toBe("을(를)");
    expect(josa("VESPER", "이/가")).toBe("이(가)");
  });
});
