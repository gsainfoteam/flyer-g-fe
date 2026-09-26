import { beforeEach, describe, expect, it } from "vitest";
import { resolveEffectiveStatus } from "@/entities/submission";
import { isApiError } from "@/shared/api/error";
import type { Repositories } from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { parseIsoUtc } from "@/shared/lib/datetime";
import { createMockRepositories } from "./repositories";

const NOW = parseIsoUtc("2026-06-08T03:00:00.000Z");

describe("mock repositories", () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepositories({ clock: createFixedClock(NOW) });
  });

  it("repository 인터페이스를 만족한다", () => {
    expect(typeof repos.submissions.list).toBe("function");
    expect(typeof repos.reviews.approve).toBe("function");
    expect(typeof repos.displays.getPlaylist).toBe("function");
  });

  it("목록을 pagination으로 모두 접근할 수 있다", async () => {
    const first = await repos.submissions.list({ limit: 4 });
    expect(first.items).toHaveLength(4);
    expect(first.nextCursor).not.toBeNull();

    const second = await repos.submissions.list({ limit: 4, cursor: first.nextCursor });
    expect(second.items.length).toBeGreaterThan(0);
    expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
    expect(first.totalCount).toBe(second.totalCount);
  });

  it("목록 응답이 서버 시각을 함께 주고, 표시 상태를 그 시각으로 판정한다", async () => {
    // 클라이언트 시계로 판정하면 같은 건이 화면마다 다른 상태로 보인다. (명세 6.3)
    const page = await repos.submissions.list({ limit: 100 });
    expect(page.serverTime).toEqual(NOW);

    const published = page.items.filter(
      (item) => resolveEffectiveStatus(item, page.serverTime) === "PUBLISHED",
    );
    expect(published.length).toBeGreaterThan(0);
    for (const item of published) {
      expect(item.startAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(item.endAt.getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("복수 상태 필터가 묶인 상태를 함께 준다", async () => {
    // 목록 탭 하나가 상태 여러 개를 묶는다("승인/예약", "중단/취소").
    const page = await repos.submissions.list({
      statuses: ["SUSPENDED", "CANCELED"],
      limit: 100,
    });
    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) {
      expect(["SUSPENDED", "CANCELED"]).toContain(
        resolveEffectiveStatus(item, page.serverTime),
      );
    }
  });

  it("승인 대기 목록은 오래 기다린 순으로 준다", async () => {
    const pending = await repos.reviews.listPending({ limit: 10 });
    const created = pending.items.map((item) => item.createdAt.getTime());
    expect(created).toEqual([...created].sort((a, b) => a - b));
  });

  it("요약 통계가 목록과 같은 기준 시각을 쓴다", async () => {
    const summary = await repos.submissions.getSummary({});
    const all = await repos.submissions.list({ limit: 100 });
    expect(summary.calculatedAt).toEqual(NOW);
    expect(summary.total).toBe(all.totalCount);
  });

  it("없는 신청은 NOT_FOUND로 실패한다", async () => {
    const error = await repos.submissions.getById("nope").catch((cause) => cause);
    expect(isApiError(error)).toBe(true);
    expect(error.status).toBe(404);
  });

  it("같은 idempotency key로 두 번 만들어도 하나만 생긴다", async () => {
    const input = {
      ziggleNoticeId: "notice-x",
      title: "새 신청",
      categoryId: "동아리",
      assetId: "asset-x",
      detailUrl: "https://ziggle.gistory.me/notices/x",
      startAt: parseIsoUtc("2026-06-10T00:00:00.000Z"),
      endAt: parseIsoUtc("2026-06-20T00:00:00.000Z"),
      targetGroupIds: ["group-house-a"],
    };

    const before = await repos.submissions.list({ limit: 100 });
    const first = await repos.submissions.create(input, { idempotencyKey: "key-1" });
    const second = await repos.submissions.create(input, { idempotencyKey: "key-1" });
    const after = await repos.submissions.list({ limit: 100 });

    expect(second.id).toBe(first.id);
    expect(after.totalCount).toBe(before.totalCount + 1);
  });

  it("종료가 시작보다 빠르면 만들지 않는다", async () => {
    const error = await repos.submissions
      .create({
        ziggleNoticeId: "notice-y",
        title: "잘못된 기간",
        categoryId: "공지",
        assetId: "asset-y",
        detailUrl: "https://ziggle.gistory.me/notices/y",
        startAt: parseIsoUtc("2026-06-20T00:00:00.000Z"),
        endAt: parseIsoUtc("2026-06-10T00:00:00.000Z"),
        targetGroupIds: [],
      })
      .catch((cause) => cause);
    expect(error.status).toBe(422);
  });

  it("승인은 시작 시각에 따라 예약 또는 게시 중이 된다", async () => {
    const pending = await repos.reviews.listPending({});
    const target = pending.items[0]!;

    const approved = await repos.reviews.approve({
      submissionId: target.id,
      revision: target.version,
    });
    expect(["SCHEDULED", "PUBLISHED"]).toContain(approved.status);

    const history = await repos.reviews.listHistory(target.id);
    expect(history.at(-1)?.type).toBe("APPROVED");
  });

  it("이미 처리된 건을 다시 승인하면 409로 막는다", async () => {
    const pending = await repos.reviews.listPending({});
    const target = pending.items[0]!;

    await repos.reviews.approve({ submissionId: target.id, revision: target.version });
    const error = await repos.reviews
      .approve({ submissionId: target.id, revision: target.version })
      .catch((cause) => cause);
    expect(error.status).toBe(409);
  });

  it("사유 없는 반려와 중단을 거부한다", async () => {
    const pending = await repos.reviews.listPending({});
    const target = pending.items[0]!;

    const rejectError = await repos.reviews
      .reject({
        submissionId: target.id,
        revision: target.version,
        reasonCode: "OTHER",
        comment: "   ",
      })
      .catch((cause) => cause);
    expect(rejectError.status).toBe(422);

    const suspendError = await repos.reviews
      .suspend({ submissionId: "notice-001", reason: "" })
      .catch((cause) => cause);
    expect(suspendError.status).toBe(422);
  });

  it("반려하면 사유가 이력에 남는다", async () => {
    const pending = await repos.reviews.listPending({});
    const target = pending.items[0]!;

    const rejected = await repos.reviews.reject({
      submissionId: target.id,
      revision: target.version,
      reasonCode: "INFO_MISMATCH",
      comment: "포스터와 공지의 마감일이 다릅니다.",
    });
    expect(rejected.status).toBe("REJECTED");

    const history = await repos.reviews.listHistory(target.id);
    expect(history.at(-1)?.comment).toContain("마감일");
  });

  it("편성에는 기준 시각에 유효한 항목만 담긴다", async () => {
    const playlist = await repos.displays.getPlaylist("device-1");
    expect(playlist.serverTime).toEqual(NOW);
    for (const item of playlist.items) {
      expect(item.startsAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(item.endsAt.getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("중단한 콘텐츠는 다음 편성에서 빠진다", async () => {
    const before = await repos.displays.getPlaylist("device-1");
    const target = before.items[0];
    if (!target) return;

    await repos.reviews.suspend({
      submissionId: target.submissionId,
      reason: "행사 취소",
    });

    const after = await repos.displays.getPlaylist("device-1");
    expect(after.items.map((item) => item.submissionId)).not.toContain(
      target.submissionId,
    );
  });

  it("이미 취소할 수 없는 상태는 409로 막는다", async () => {
    const playlist = await repos.displays.getPlaylist("device-1");
    const published = playlist.items[0];
    if (!published) return;

    const error = await repos.submissions
      .cancel(published.submissionId, { version: published.revision })
      .catch((cause) => cause);
    expect(error.status).toBe(409);
  });

  it("AbortSignal이 이미 취소되었으면 요청하지 않는다", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      repos.submissions.list({}, controller.signal),
    ).rejects.toThrow();
  });
});
