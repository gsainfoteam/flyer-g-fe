import { beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/features/auth/model/types";
import type {
  CreateSubmissionInput,
  Repositories,
} from "@/shared/api/repositories";
import { parseIsoUtc } from "@/shared/lib/datetime";
import { createMemoryHeartbeatLog } from "./heartbeats";
import type { HeartbeatLog } from "./heartbeats";
import { createMockRepositories } from "./repositories";
import { MOCK_USERS } from "./users";

/**
 * mock이 백엔드(`flyer-g-be`)의 권한·충돌 규칙을 지키는지 확인한다.
 * mock이 서버보다 관대하면 화면의 권한·충돌 처리가 실제 서버에서 처음 깨진다.
 * (`API-CHANGES-BACKEND.md`)
 *
 * fixture 기준:
 * - notice-901(반려), notice-905(승인 대기), notice-903(중단)은 게시자 정하윤의 신청이다.
 * - notice-003(승인 대기, A동 대상)은 다른 학생의 신청이다.
 * - notice-007(종료)은 Ziggle 공지 earth-club으로 신청한 다른 학생의 신청이다.
 */
const NOW = parseIsoUtc("2026-06-08T03:00:00.000Z");
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function setup(initial: SessionUser | null = MOCK_USERS.SUBMITTER) {
  let user = initial;
  let now = NOW.getTime();
  const heartbeats: HeartbeatLog = createMemoryHeartbeatLog();
  const repos = createMockRepositories({
    clock: { now: () => new Date(now) },
    session: () => user,
    heartbeats,
  });
  return {
    repos,
    heartbeats,
    signInAs: (next: SessionUser | null) => {
      user = next;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function createInput(
  overrides: Partial<CreateSubmissionInput> = {},
): CreateSubmissionInput {
  return {
    title: "겨울 정기 공연",
    categoryId: "performance",
    assetId: "asset-new",
    detailUrl: "https://ziggle.gistory.me/notice/1041",
    organizerName: "공연동아리 페이드인",
    subtitle: null,
    location: "대강당",
    description: null,
    startAt: new Date(NOW.getTime() + 2 * DAY_MS),
    endAt: new Date(NOW.getTime() + 9 * DAY_MS),
    targetGroupIds: [],
    ...overrides,
  };
}

async function errorOf(promise: Promise<unknown>): Promise<{
  status?: number;
  code?: string;
  fields?: Record<string, string> | null;
} | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error as { status?: number; code?: string };
  }
}

async function statusOf(promise: Promise<unknown>): Promise<number | null> {
  return (await errorOf(promise))?.status ?? null;
}

describe("조회 범위와 소유권", () => {
  let repos: Repositories;
  let signInAs: (user: SessionUser | null) => void;

  beforeEach(() => {
    ({ repos, signInAs } = setup());
  });

  it("내 신청 목록과 요약에는 본인 신청만 담긴다", async () => {
    const page = await repos.submissions.list({ scope: "me", limit: 50 });
    const summary = await repos.submissions.getSummary({ scope: "me" });

    expect(page.items.length).toBeGreaterThan(0);
    expect(
      page.items.every((item) => item.requesterId === MOCK_USERS.SUBMITTER.id),
    ).toBe(true);
    expect(summary.total).toBe(page.totalCount);
  });

  it("게시자에게 전체 목록은 403, 남의 신청은 있는지도 알리지 않는다(404)", async () => {
    expect(await statusOf(repos.submissions.list({ scope: "all" }))).toBe(403);
    expect(await statusOf(repos.submissions.getSummary({ scope: "all" }))).toBe(
      403,
    );
    expect(await statusOf(repos.submissions.getById("notice-003"))).toBe(404);
    expect(await statusOf(repos.reviews.listHistory("notice-003"))).toBe(404);
  });

  it("하우스 관리자는 전체 목록과 남의 신청을 본다", async () => {
    signInAs(MOCK_USERS.REVIEWER);
    const all = await repos.submissions.list({ scope: "all", limit: 50 });

    expect(
      all.items.some((item) => item.requesterId !== MOCK_USERS.REVIEWER.id),
    ).toBe(true);
    await expect(repos.submissions.getById("notice-003")).resolves.toBeTruthy();
  });

  it("관리자도 남의 신청은 고치거나 취소하지 않는다(404)", async () => {
    signInAs(MOCK_USERS.REVIEWER);
    const target = await repos.submissions.getById("notice-901");

    expect(
      await statusOf(
        repos.submissions.update("notice-901", {
          title: "바꾼 제목",
          version: target.version,
        }),
      ),
    ).toBe(404);
    expect(
      await statusOf(
        repos.submissions.cancel("notice-901", { version: target.version }),
      ),
    ).toBe(404);
  });

  it("세션이 없으면 401이다", async () => {
    signInAs(null);
    expect(await statusOf(repos.submissions.list({}))).toBe(401);
    expect(await statusOf(repos.reference.listTargetGroups())).toBe(401);
  });

  it("게시자는 검토 API와 기기 목록을 쓸 수 없다", async () => {
    expect(await statusOf(repos.reviews.listPending({}))).toBe(403);
    expect(
      await statusOf(
        repos.reviews.approve({ submissionId: "notice-905", revision: 1 }),
      ),
    ).toBe(403);
    expect(await statusOf(repos.devices.list())).toBe(403);
  });
});

describe("신청 생성 (생성과 제출이 한 번)", () => {
  let repos: Repositories;

  beforeEach(() => {
    ({ repos } = setup());
  });

  it("만들면 바로 검토 대기이고, 입력한 주최·장소와 신청자가 담긴다", async () => {
    const created = await repos.submissions.create(createInput());

    expect(created).toMatchObject({
      status: "PENDING_REVIEW",
      requesterId: MOCK_USERS.SUBMITTER.id,
      requesterName: MOCK_USERS.SUBMITTER.displayName,
      organizerName: "공연동아리 페이드인",
      location: "대강당",
      subtitle: null,
      ziggleNoticeId: "1041",
    });
    expect(created.submittedAt?.getTime()).toBe(NOW.getTime());
    expect(
      (await repos.reviews.listHistory(created.id)).map((event) => event.type),
    ).toEqual(["SUBMITTED"]);
  });

  it("상세 링크 없이도 신청할 수 있다", async () => {
    const created = await repos.submissions.create(
      createInput({ detailUrl: null }),
    );
    expect(created.detailUrl).toBeNull();
    expect(created.ziggleNoticeId).toBeNull();
  });

  it("기간·링크 규칙은 필드 단위 422로 알린다", async () => {
    const error = await errorOf(
      repos.submissions.create(
        createInput({
          // 24시간이 안 남았고, 3개월을 넘기고, 허용하지 않는 주소다.
          startAt: new Date(NOW.getTime() + 23 * HOUR_MS),
          endAt: new Date(NOW.getTime() + 120 * DAY_MS),
          detailUrl: "https://evil.example.com/notice/1",
        }),
      ),
    );
    expect(error).toMatchObject({ status: 422, code: "VALIDATION_FAILED" });
    expect(Object.keys(error?.fields ?? {}).sort()).toEqual([
      "detailUrl",
      "endAt",
      "startAt",
    ]);
  });

  it("같은 공지로 낸 신청이 있으면 409 ALREADY_SUBMITTED이고, 취소하면 다시 낼 수 있다", async () => {
    const first = await repos.submissions.create(createInput());

    const duplicate = await errorOf(repos.submissions.create(createInput()));
    expect(duplicate).toMatchObject({ status: 409, code: "ALREADY_SUBMITTED" });
    expect(duplicate?.fields).toHaveProperty("detailUrl");

    await repos.submissions.cancel(first.id, { version: first.version });
    await expect(repos.submissions.create(createInput())).resolves.toBeTruthy();
  });

  it("끝난 신청(종료)의 공지로는 다시 신청할 수 있다", async () => {
    await expect(
      repos.submissions.create(
        createInput({
          detailUrl: "https://ziggle.gistory.me/notice/earth-club",
        }),
      ),
    ).resolves.toMatchObject({ status: "PENDING_REVIEW" });
  });

  it("공지 주소가 아닌 링크는 중복을 따지지 않는다", async () => {
    const detailUrl = "https://ziggle.gistory.me/";
    await repos.submissions.create(createInput({ detailUrl }));
    await expect(
      repos.submissions.create(createInput({ detailUrl })),
    ).resolves.toBeTruthy();
  });

  it("같은 key로 다시 보낸 생성은 처음 결과를 돌려준다", async () => {
    const options = { idempotencyKey: "create-key-1" };
    const [first, again] = await Promise.all([
      repos.submissions.create(createInput(), options),
      repos.submissions.create(createInput(), options),
    ]);
    expect(again.id).toBe(first.id);
  });
});

describe("수정·재검토·취소", () => {
  it("반려 건은 고친 뒤 재검토를 요청한다. 대기 시간은 다시 낸 때부터 센다", async () => {
    const { repos, signInAs } = setup(MOCK_USERS.SUBMITTER);
    const rejected = await repos.submissions.getById("notice-901");

    const updated = await repos.submissions.update("notice-901", {
      title: "슈퍼-피셜 신입 부원 모집 (수정)",
      startAt: new Date(NOW.getTime() + 2 * DAY_MS),
      endAt: new Date(NOW.getTime() + 9 * DAY_MS),
      version: rejected.version,
    });
    // 반려 건은 고쳐도 반려 상태다. 재검토 요청이 따로 있다.
    expect(updated.status).toBe("REJECTED");

    const resubmitted = await repos.submissions.submit(
      "notice-901",
      { version: updated.version },
      { idempotencyKey: "resubmit-1" },
    );
    expect(resubmitted.status).toBe("PENDING_REVIEW");
    expect(resubmitted.submittedAt?.getTime()).toBe(NOW.getTime());

    // 응답을 못 받고 같은 key로 다시 보내도 409가 아니라 처음 결과다.
    const retried = await repos.submissions.submit(
      "notice-901",
      { version: updated.version },
      { idempotencyKey: "resubmit-1" },
    );
    expect(retried.version).toBe(resubmitted.version);

    const history = await repos.reviews.listHistory("notice-901");
    expect(history.map((event) => event.type)).toEqual([
      "SUBMITTED",
      "REJECTED",
      "RESUBMITTED",
    ]);

    signInAs(MOCK_USERS.REVIEWER);
    const pending = await repos.reviews.listPending({ limit: 50 });
    expect(pending.items.at(-1)?.id).toBe("notice-901");
  });

  it("재검토 요청은 기간 규칙을 지금 시각으로 다시 본다", async () => {
    const { repos } = setup(MOCK_USERS.SUBMITTER);
    const rejected = await repos.submissions.getById("notice-901");

    // fixture의 시작은 3일 뒤라 통과하지만, 이틀 반을 지나면 24시간이 안 남는다.
    const { repos: later, advance } = setup(MOCK_USERS.SUBMITTER);
    advance(2.5 * DAY_MS);
    expect(
      await errorOf(
        later.submissions.submit("notice-901", { version: rejected.version }),
      ),
    ).toMatchObject({ status: 422 });
    await expect(
      repos.submissions.submit("notice-901", { version: rejected.version }),
    ).resolves.toMatchObject({ status: "PENDING_REVIEW" });
  });

  it("검토 대기 중에 고쳐도 대기 그대로이고, 바뀐 것이 없으면 버전도 그대로다", async () => {
    const { repos } = setup(MOCK_USERS.SUBMITTER);
    const pending = await repos.submissions.getById("notice-905");

    const same = await repos.submissions.update("notice-905", {
      title: pending.title,
      version: pending.version,
    });
    expect(same.version).toBe(pending.version);

    const changed = await repos.submissions.update("notice-905", {
      location: "학생회관 2층",
      version: pending.version,
    });
    expect(changed).toMatchObject({
      status: "PENDING_REVIEW",
      location: "학생회관 2층",
      version: pending.version + 1,
    });
  });

  it("게시 시작 전 승인 건을 고치면 다시 승인을 받는다", async () => {
    const { repos, signInAs } = setup(MOCK_USERS.SUBMITTER);
    const created = await repos.submissions.create(createInput());
    signInAs(MOCK_USERS.REVIEWER);
    const approved = await repos.reviews.approve({
      submissionId: created.id,
      revision: created.version,
    });
    expect(approved.status).toBe("SCHEDULED");

    signInAs(MOCK_USERS.SUBMITTER);
    const edited = await repos.submissions.update(created.id, {
      subtitle: "시간이 바뀌었어요",
      version: approved.version,
    });
    expect(edited.status).toBe("PENDING_REVIEW");
    expect(
      (await repos.reviews.listHistory(created.id)).map((event) => event.type),
    ).toEqual(["SUBMITTED", "APPROVED", "RESUBMITTED"]);
  });

  it("게시가 시작되면 고치거나 취소할 수 없다", async () => {
    const { repos } = setup(MOCK_USERS.SUBMITTER);
    const published = await repos.submissions.getById("notice-001");

    expect(
      await statusOf(
        repos.submissions.update("notice-001", {
          title: "바꾼 제목",
          version: published.version,
        }),
      ),
    ).toBe(409);
    expect(
      await statusOf(
        repos.submissions.cancel("notice-001", { version: published.version }),
      ),
    ).toBe(409);
  });

  it("게시 중단된 신청은 고쳐도 중단 상태이고, 다시 내면 검토 대기로 돌아간다", async () => {
    const { repos } = setup(MOCK_USERS.SUBMITTER);
    const suspended = await repos.submissions.getById("notice-903");

    const edited = await repos.submissions.update("notice-903", {
      startAt: new Date(NOW.getTime() + 2 * DAY_MS),
      endAt: new Date(NOW.getTime() + 9 * DAY_MS),
      version: suspended.version,
    });
    expect(edited.status).toBe("SUSPENDED");

    const resubmitted = await repos.submissions.submit("notice-903", {
      version: edited.version,
    });
    expect(resubmitted.status).toBe("PENDING_REVIEW");
  });

  it("본 버전이 최신이 아니면 취소를 409로 막고, 취소도 이력에 남는다", async () => {
    const { repos } = setup(MOCK_USERS.SUBMITTER);
    const target = await repos.submissions.getById("notice-905");

    expect(
      await statusOf(
        repos.submissions.cancel("notice-905", { version: target.version - 1 }),
      ),
    ).toBe(409);

    await repos.submissions.cancel("notice-905", { version: target.version });
    const history = await repos.reviews.listHistory("notice-905");
    expect(history.at(-1)).toMatchObject({
      type: "CANCELED",
      actorName: MOCK_USERS.SUBMITTER.displayName,
    });
  });
});

describe("검토", () => {
  it("같은 key로 다시 보낸 반려·취소는 처리하지 않고 처음 결과를 돌려준다", async () => {
    const { repos, signInAs } = setup(MOCK_USERS.REVIEWER);
    const target = await repos.submissions.getById("notice-003");
    const reject = () =>
      repos.reviews.reject(
        {
          submissionId: "notice-003",
          revision: target.version,
          reasonCode: "OTHER",
          comment: "다시 확인해 주세요.",
        },
        { idempotencyKey: "reject-key" },
      );
    const first = await reject();
    await expect(reject()).resolves.toMatchObject({
      status: "REJECTED",
      version: first.version,
    });
    const rejections = (await repos.reviews.listHistory("notice-003")).filter(
      (event) => event.type === "REJECTED",
    );
    expect(rejections).toHaveLength(1);

    signInAs(MOCK_USERS.SUBMITTER);
    const pending = await repos.submissions.getById("notice-905");
    const cancel = () =>
      repos.submissions.cancel(
        "notice-905",
        { version: pending.version },
        { idempotencyKey: "cancel-key" },
      );
    const canceled = await cancel();
    await expect(cancel()).resolves.toMatchObject({
      status: "CANCELED",
      version: canceled.version,
    });
  });

  it("반려도 승인처럼 검토한 버전을 확인한다", async () => {
    const { repos } = setup(MOCK_USERS.REVIEWER);
    const target = await repos.submissions.getById("notice-003");

    expect(
      await statusOf(
        repos.reviews.reject({
          submissionId: "notice-003",
          revision: target.version + 1,
          reasonCode: "OTHER",
          comment: "다시 확인해 주세요.",
        }),
      ),
    ).toBe(409);
  });

  it("게시 기간이 이미 끝난 신청은 승인하지 않는다", async () => {
    const { repos, advance } = setup(MOCK_USERS.REVIEWER);
    const target = await repos.submissions.getById("notice-003");
    advance(30 * DAY_MS);

    expect(
      await statusOf(
        repos.reviews.approve({
          submissionId: "notice-003",
          revision: target.version,
        }),
      ),
    ).toBe(409);
  });

  it("승인 대기 목록을 카테고리로 거른다", async () => {
    const { repos } = setup(MOCK_USERS.REVIEWER);
    const clubs = await repos.reviews.listPending({ categoryId: "club" });

    expect(clubs.items.length).toBeGreaterThan(0);
    expect(clubs.items.every((item) => item.categoryId === "club")).toBe(true);
  });

  it("검토 기록에는 처리한 관리자 본인이 남는다", async () => {
    const { repos } = setup(MOCK_USERS.SUPER_ADMIN);
    await repos.reviews.approve({ submissionId: "notice-003", revision: 1 });

    const history = await repos.reviews.listHistory("notice-003");
    expect(history.at(-1)).toMatchObject({
      type: "APPROVED",
      actorId: MOCK_USERS.SUPER_ADMIN.id,
      actorName: MOCK_USERS.SUPER_ADMIN.displayName,
    });
  });
});

describe("기기와 편성", () => {
  it("heartbeat가 3분 안에 있으면 온라인, 아니면 오프라인이다", async () => {
    const { repos, heartbeats } = setup(MOCK_USERS.REVIEWER);

    const before = await repos.devices.list();
    expect(before.items.map((device) => [device.id, device.status])).toEqual([
      ["house-a-lobby", "ONLINE"],
      ["house-b-lobby", "OFFLINE"],
    ]);

    // B동 TV를 다시 켜면 heartbeat가 들어와 온라인이 된다.
    heartbeats.record("house-b-lobby", {
      at: new Date(NOW.getTime() - 10_000).toISOString(),
      appVersion: "v0.5.0",
      resolution: { width: 3840, height: 2160 },
    });
    const after = await repos.devices.list();
    expect(
      after.items.find((device) => device.id === "house-b-lobby"),
    ).toMatchObject({
      status: "ONLINE",
      appVersion: "v0.5.0",
    });
  });

  it("기기는 자기 위치가 대상인 게시물만 받고, 링크 없는 게시물은 QR 없이 받는다", async () => {
    const { repos } = setup(MOCK_USERS.REVIEWER);

    const a = await repos.displays.getPlaylist("house-a-lobby");
    const b = await repos.displays.getPlaylist("house-b-lobby");

    // notice-002는 A동만 대상이고 상세 링크가 없다.
    const item = a.items.find((entry) => entry.submissionId === "notice-002");
    expect(item?.detailUrl).toBeNull();
    expect(b.items.map((entry) => entry.submissionId)).not.toContain(
      "notice-002",
    );
  });

  it("편성 버전은 내용이 같으면 그대로고, 바뀌면 달라진다", async () => {
    const { repos } = setup(MOCK_USERS.REVIEWER);
    const first = await repos.displays.getPlaylist("house-a-lobby");
    const again = await repos.displays.getPlaylist("house-a-lobby");
    expect(again.playlistVersion).toBe(first.playlistVersion);

    await repos.reviews.suspend({ submissionId: "notice-001", reason: "교체" });

    const after = await repos.displays.getPlaylist("house-a-lobby");
    expect(after.playlistVersion).not.toBe(first.playlistVersion);
  });
});

describe("요약과 참조 데이터", () => {
  it("요약은 상태별 건수를 함께 준다", async () => {
    const { repos } = setup(MOCK_USERS.SUBMITTER);

    const summary = await repos.submissions.getSummary({ scope: "me" });

    // 정하윤의 fixture: 게시 중·승인 대기·반려·취소·중단·종료 한 건씩
    expect(summary.byStatus).toMatchObject({
      PUBLISHED: 1,
      PENDING_REVIEW: 1,
      REJECTED: 1,
      CANCELED: 1,
      SUSPENDED: 1,
      ENDED: 1,
      DRAFT: 0,
    });
    expect(summary.total).toBe(6);
  });

  it("운영 설정과 카테고리를 준다", async () => {
    const { repos } = setup(MOCK_USERS.SUBMITTER);

    await expect(repos.reference.getConfig()).resolves.toMatchObject({
      maxPublishMonths: 3,
      minLeadTimeHours: 24,
    });
    const categories = await repos.reference.listCategories();
    expect(categories.map((category) => category.id)).toContain("performance");
  });
});

describe("노출 통계", () => {
  let repos: Repositories;
  let signInAs: (user: SessionUser | null) => void;

  beforeEach(() => {
    ({ repos, signInAs } = setup());
  });

  it("게시자는 기본 범위(me)로 자기 게시물의 노출만 받는다. 노출이 많은 순이다", async () => {
    const stats = await repos.stats.getImpressions({});
    const own = await repos.submissions.list({ scope: "me", limit: 50 });
    const ownIds = new Set(own.items.map((item) => item.id));

    expect(stats.items.length).toBeGreaterThan(0);
    expect(stats.items.every((item) => ownIds.has(item.submissionId))).toBe(
      true,
    );
    const counts = stats.items.map((item) => item.impressions);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    // 기간을 비우면 오늘(2026-06-08 서울)까지 30일이다.
    expect(stats).toMatchObject({ from: "2026-05-10", to: "2026-06-08" });
  });

  it("게시되지 않은 신청(승인 대기·반려·취소)은 노출이 없다", async () => {
    const stats = await repos.stats.getImpressions({});
    const ids = stats.items.map((item) => item.submissionId);

    expect(ids).not.toContain("notice-905");
    expect(ids).not.toContain("notice-901");
    expect(ids).not.toContain("notice-902");
  });

  it("전체 범위(all)는 검토자만 쓴다", async () => {
    expect(await statusOf(repos.stats.getImpressions({ scope: "all" }))).toBe(
      403,
    );

    signInAs(MOCK_USERS.REVIEWER);
    const all = await repos.stats.getImpressions({ scope: "all" });
    expect(all.items.some((item) => item.submissionId === "notice-002")).toBe(
      true,
    );
  });

  it("끝까지 나온 횟수는 노출 수를 넘지 않는다", async () => {
    signInAs(MOCK_USERS.REVIEWER);
    const all = await repos.stats.getImpressions({ scope: "all" });

    for (const item of all.items) {
      expect(item.completedImpressions).toBeLessThanOrEqual(item.impressions);
      expect(item.deviceCount).toBeGreaterThan(0);
    }
  });

  it("시작 날짜가 끝 날짜보다 늦으면 422다", async () => {
    expect(
      await statusOf(
        repos.stats.getImpressions({ from: "2026-06-08", to: "2026-06-01" }),
      ),
    ).toBe(422);
  });
});
