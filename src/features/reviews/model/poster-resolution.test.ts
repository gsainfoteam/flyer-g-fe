import { describe, expect, it } from "vitest";
import { isLowResolution } from "./poster-resolution";

describe("isLowResolution", () => {
  it("긴 변이 1080px보다 짧으면 낮은 해상도로 본다", () => {
    expect(isLowResolution({ width: 800, height: 600 })).toBe(true);
    expect(isLowResolution({ width: 1079, height: 1079 })).toBe(true);
  });

  it("비율과 상관없이 긴 변만 본다", () => {
    // 세로 포스터, 정방형, 가로 배너
    expect(isLowResolution({ width: 1080, height: 1440 })).toBe(false);
    expect(isLowResolution({ width: 1080, height: 1080 })).toBe(false);
    expect(isLowResolution({ width: 2400, height: 400 })).toBe(false);
  });

  it("크기를 모르면 경고하지 않는다", () => {
    expect(isLowResolution({ width: 0, height: 0 })).toBe(false);
  });
});
