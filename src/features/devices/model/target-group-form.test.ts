import { describe, expect, it } from "vitest";
import {
  selectableTargetGroups,
  type TargetGroup,
} from "@/entities/device/model/types";
import { validateGroupName } from "./target-group-form";

const GROUPS: TargetGroup[] = [
  { id: "a", name: "Main Lobby", deviceCount: 1, isHidden: false },
  { id: "old", name: "옛 도서관", deviceCount: 0, isHidden: true },
];

describe("validateGroupName", () => {
  it("앞뒤 공백을 지운 뒤 1~40자를 받는다", () => {
    expect(validateGroupName("  ", GROUPS)).toBe("그룹 이름을 입력해 주세요.");
    expect(validateGroupName("가".repeat(41), GROUPS)).toContain("40자");
    expect(validateGroupName(` ${"가".repeat(40)} `, GROUPS)).toBeNull();
  });

  it("이모지는 서버처럼 한 글자로 센다", () => {
    // UTF-16으로는 42·80단위지만 서버는 21·40자로 보고 받는다.
    expect(validateGroupName("😀".repeat(21), GROUPS)).toBeNull();
    expect(validateGroupName("😀".repeat(40), GROUPS)).toBeNull();
    expect(validateGroupName("😀".repeat(41), GROUPS)).toContain("40자");
  });

  it("대소문자를 무시하고 겹치는 이름을 막는다. 숨긴 그룹이면 다시 표시하라고 알린다", () => {
    expect(validateGroupName("main lobby", GROUPS)).toBe(
      "같은 이름의 그룹이 이미 있어요.",
    );
    expect(validateGroupName("옛 도서관", GROUPS)).toContain("숨긴 그룹");
    // 이름을 바꾸는 그룹 자신과는 겹쳐도 된다.
    expect(validateGroupName("MAIN LOBBY", GROUPS, "a")).toBeNull();
  });
});

describe("selectableTargetGroups", () => {
  it("숨긴 그룹은 빼되 이미 고른 것은 남긴다", () => {
    expect(selectableTargetGroups(GROUPS).map((group) => group.id)).toEqual([
      "a",
    ]);
    expect(
      selectableTargetGroups(GROUPS, ["old"]).map((group) => group.id),
    ).toEqual(["a", "old"]);
  });
});
