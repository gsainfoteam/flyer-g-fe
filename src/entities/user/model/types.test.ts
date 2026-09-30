import { describe, expect, it } from "vitest";
import { planRoleChange, roleLevelOf } from "./types";

describe("roleLevelOf", () => {
  it("가진 역할 중 가장 높은 것을 고른다", () => {
    expect(roleLevelOf([])).toBe("SUBMITTER");
    expect(roleLevelOf(["REVIEWER"])).toBe("REVIEWER");
    expect(roleLevelOf(["SUPER_ADMIN"])).toBe("SUPER_ADMIN");
    expect(roleLevelOf(["REVIEWER", "SUPER_ADMIN"])).toBe("SUPER_ADMIN");
  });
});

describe("planRoleChange", () => {
  it("올릴 때는 없는 역할만 준다", () => {
    expect(planRoleChange([], "REVIEWER")).toEqual([
      { type: "grant", role: "REVIEWER" },
    ]);
    expect(planRoleChange(["REVIEWER"], "SUPER_ADMIN")).toEqual([
      { type: "grant", role: "SUPER_ADMIN" },
    ]);
  });

  it("운영자만 가진 사람을 하우스 관리자로 내리면 REVIEWER를 먼저 준다", () => {
    expect(planRoleChange(["SUPER_ADMIN"], "REVIEWER")).toEqual([
      { type: "grant", role: "REVIEWER" },
      { type: "revoke", role: "SUPER_ADMIN" },
    ]);
    expect(planRoleChange(["REVIEWER", "SUPER_ADMIN"], "REVIEWER")).toEqual([
      { type: "revoke", role: "SUPER_ADMIN" },
    ]);
  });

  it("게시자로 내릴 때는 SUPER_ADMIN부터 뺀다", () => {
    expect(planRoleChange(["REVIEWER", "SUPER_ADMIN"], "SUBMITTER")).toEqual([
      { type: "revoke", role: "SUPER_ADMIN" },
      { type: "revoke", role: "REVIEWER" },
    ]);
  });

  it("이미 그 역할이면 보낼 것이 없다", () => {
    expect(planRoleChange(["SUPER_ADMIN"], "SUPER_ADMIN")).toEqual([]);
    expect(planRoleChange([], "SUBMITTER")).toEqual([]);
  });
});
