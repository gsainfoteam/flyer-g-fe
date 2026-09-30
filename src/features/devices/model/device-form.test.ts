import { describe, expect, it } from "vitest";
import type { TargetGroup } from "@/entities/device/model/types";
import { groupOptionsFor } from "./device-form";

const GROUPS: TargetGroup[] = [
  { id: "a", name: "A동", deviceCount: 1, isHidden: false },
  { id: "b", name: "B동", deviceCount: 1, isHidden: true },
  { id: "old", name: "옛 도서관", deviceCount: 0, isHidden: true },
];

describe("groupOptionsFor", () => {
  it("숨기지 않은 그룹만 새로 고를 수 있다", () => {
    expect(groupOptionsFor(GROUPS, [])).toEqual([
      { id: "a", label: "A동", unavailable: false },
    ]);
  });

  it("원래 연결된 숨긴 그룹은 풀어도 남기고, 그대로 둘 수 있다", () => {
    expect(groupOptionsFor(GROUPS, [], ["b"])).toContainEqual({
      id: "b",
      label: "B동 (숨김)",
      unavailable: false,
    });
  });

  it("고른 뒤 숨겨지거나 지워진 그룹도 보여 줘서 선택을 풀 수 있게 한다", () => {
    expect(groupOptionsFor(GROUPS, ["a", "old", "gone"])).toEqual([
      { id: "a", label: "A동", unavailable: false },
      { id: "old", label: "옛 도서관 (숨김)", unavailable: true },
      { id: "gone", label: "삭제된 그룹", unavailable: true },
    ]);
  });
});
