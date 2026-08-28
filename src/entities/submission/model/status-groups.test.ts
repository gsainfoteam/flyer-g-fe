import { describe, expect, it } from "vitest";
import {
  STATUS_GROUPS,
  findStatusGroup,
  groupOfStatus,
} from "./status-groups";
import { SUBMISSION_STATUSES } from "./types";

describe("STATUS_GROUPS", () => {
  it("ARCHIVED를 제외한 모든 상태가 정확히 한 그룹에 속한다", () => {
    for (const status of SUBMISSION_STATUSES) {
      const owners = STATUS_GROUPS.filter((group) =>
        group.statuses.includes(status),
      );
      if (status === "ARCHIVED") {
        expect(owners).toHaveLength(0);
      } else {
        expect(owners, status).toHaveLength(1);
      }
    }
  });

  it("전체 탭은 statuses가 비어 있다", () => {
    expect(findStatusGroup("all").statuses).toHaveLength(0);
  });
});

describe("findStatusGroup", () => {
  it("key로 그룹을 찾는다", () => {
    expect(findStatusGroup("approved").statuses).toEqual([
      "APPROVED",
      "SCHEDULED",
    ]);
  });

  it("알 수 없는 key는 전체 탭으로 돌아간다", () => {
    expect(findStatusGroup("no-such-tab").key).toBe("all");
    expect(findStatusGroup(null).key).toBe("all");
    expect(findStatusGroup(undefined).key).toBe("all");
  });
});

describe("groupOfStatus", () => {
  it("묶인 상태는 같은 그룹을 가리킨다", () => {
    expect(groupOfStatus("SUSPENDED").key).toBe("stopped");
    expect(groupOfStatus("CANCELED").key).toBe("stopped");
  });
});
