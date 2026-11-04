import { describe, expect, it } from "vitest";
import type { DisplayDevice, TargetGroup } from "@/entities/device/model/types";
import {
  draftFromDevice,
  groupOptionsFor,
  toDeviceFieldErrors,
  toDeviceInput,
  toUpdateDeviceInput,
  validateDeviceDraft,
} from "./device-form";

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

const device: DisplayDevice = {
  id: "dev_01",
  name: "A동 로비",
  location: null,
  groupIds: ["grp_a", "grp_b"],
  programGroupId: "grp_a",
  overrides: { settings: { refreshAfterSeconds: 30 }, blocks: { blk_1: {} } },
  orientation: "LANDSCAPE",
  resolution: null,
  lastSeenAt: null,
  appVersion: null,
  status: "ONLINE",
  layout: { type: "WALL", rotationSeconds: 10 },
  refreshAfterSeconds: 30,
  lastPlaylistVersion: null,
  lastRenderOkAt: null,
  tokenIssuedAt: null,
};

describe("기기 저장 (배포 ⑤)", () => {
  it("등록에는 화면 설정을 보내지 않는다", () => {
    expect(toDeviceInput(draftFromDevice(device))).toEqual({
      name: "A동 로비",
      location: null,
      groupIds: ["grp_a", "grp_b"],
      orientation: "LANDSCAPE",
    });
  });

  it("화면 설정을 그대로 두면 기기 예외를 건드리지 않는다", () => {
    const input = toUpdateDeviceInput(draftFromDevice(device), device);

    expect(input).not.toHaveProperty("overrides");
    expect(input).not.toHaveProperty("layout");
    expect(input).not.toHaveProperty("rotationSeconds");
    expect(input).not.toHaveProperty("programGroupId");
  });

  it("바꾼 설정만 기기 예외에 합치고 있던 예외는 지킨다", () => {
    const input = toUpdateDeviceInput(
      { ...draftFromDevice(device), layout: "STRIP", rotationSeconds: "20" },
      device,
    );

    expect(input.overrides).toEqual({
      settings: {
        refreshAfterSeconds: 30,
        posterLayout: "STRIP",
        rotationSeconds: 20,
      },
      blocks: { blk_1: {} },
    });
  });

  it("편성 그룹을 위치 그룹에서 빼면 남은 첫 그룹으로 옮긴다", () => {
    const input = toUpdateDeviceInput(
      { ...draftFromDevice(device), groupIds: ["grp_b"] },
      device,
    );

    expect(input.programGroupId).toBe("grp_b");
  });

  it("그룹 편성을 모르는 서버에는 지금까지처럼 기기 필드로 보낸다", () => {
    const legacy = { ...device, programGroupId: null, overrides: null };
    const input = toUpdateDeviceInput(
      { ...draftFromDevice(legacy), rotationSeconds: "20" },
      legacy,
    );

    expect(input).toMatchObject({
      layout: "WALL",
      rotationSeconds: 20,
      refreshAfterSeconds: 30,
    });
    expect(input).not.toHaveProperty("overrides");
  });

  it("위치 그룹이 없으면 저장할 수 없다", () => {
    expect(
      validateDeviceDraft({ ...draftFromDevice(device), groupIds: [] })
        .groupIds,
    ).toContain("위치 그룹");
  });

  it("기기 예외의 점 경로 오류를 그 칸에 붙인다", () => {
    expect(
      toDeviceFieldErrors({
        "overrides.settings.rotationSeconds": "전환 간격이 올바르지 않습니다.",
      }),
    ).toEqual({ rotationSeconds: "전환 간격이 올바르지 않습니다." });
  });
});
