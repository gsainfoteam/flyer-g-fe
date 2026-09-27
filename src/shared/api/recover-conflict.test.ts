import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./error";
import { runWithConflictRecovery } from "./recover-conflict";

const conflict = () =>
  new ApiError({
    kind: "http",
    code: "CONFLICT",
    message: "conflict",
    status: 409,
  });
const timeout = () =>
  new ApiError({ kind: "timeout", code: "TIMEOUT", message: "timeout" });

function attempt() {
  let unknown = false;
  return {
    hadUnknownOutcome: () => unknown,
    markOutcomeUnknown: () => {
      unknown = true;
    },
  };
}

describe("runWithConflictRecovery", () => {
  it("응답을 못 받고 다시 보냈는데 이미 처리됐으면 최신 상태를 성공으로 준다", async () => {
    const key = attempt();
    const reload = vi.fn(async () => ({ status: "REJECTED" }));
    const recovery = {
      ...key,
      reload,
      succeeded: (latest: { status: string }) => latest.status === "REJECTED",
    };

    await expect(
      runWithConflictRecovery(async () => {
        throw timeout();
      }, recovery),
    ).rejects.toMatchObject({ code: "TIMEOUT" });

    await expect(
      runWithConflictRecovery(async () => {
        throw conflict();
      }, recovery),
    ).resolves.toEqual({ status: "REJECTED" });
  });

  it("처음 보낸 요청의 409는 진짜 충돌이라 그대로 던진다", async () => {
    const reload = vi.fn();

    await expect(
      runWithConflictRecovery(
        async () => {
          throw conflict();
        },
        { ...attempt(), reload, succeeded: () => true },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(reload).not.toHaveBeenCalled();
  });

  it("다른 사람이 다른 결정을 했으면 409를 그대로 던진다", async () => {
    const key = attempt();
    key.markOutcomeUnknown();

    await expect(
      runWithConflictRecovery(
        async () => {
          throw conflict();
        },
        {
          ...key,
          reload: async () => ({ status: "APPROVED" }),
          succeeded: (latest) => latest.status === "REJECTED",
        },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
