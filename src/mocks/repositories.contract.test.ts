import { beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/features/auth/model/types";
import type {
  CreateSubmissionInput,
  Repositories,
} from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { parseIsoUtc } from "@/shared/lib/datetime";
import { createMemoryHeartbeatLog } from "./heartbeats";
import type { HeartbeatLog } from "./heartbeats";
import { createMockRepositories } from "./repositories";
import { MOCK_USERS } from "./users";

/**
 * mock이 서버 계약(`API-REQUIREMENTS.md`)의 권한·충돌 규칙을 지키는지 확인한다.
 * mock이 서버보다 관대하면 화면의 권한·충돌 처리가 실제 서버에서 처음 깨진다.
 *
 * fixture 기준:
 * - notice-901(반려), notice-905(승인 대기)는 게시자 정하윤의 신청이다.
 * - notice-003(승인 대기, A동 대상)은 다른 학생의 신청이다.
 */
const NOW = parseIsoUtc("2026-06-08T03:00:00.000Z");
const DAY_MS = 86_400_000;

function setup(initial: SessionUser | null = MOCK_USERS.SUBMITTER) {
  let user = initial;
  const heartbeats: HeartbeatLog = createMemoryHeartbeatLog();
  const repos = createMockRepositories({
    clock: createFixedClock(NOW),
    session: () => user,
    heartbeats,
  });
  return {
    repos,
    heartbeats,
    signInAs: (next: SessionUser | null) => {
      user = next;
    },
  };
}

function createInput(
  overrides: Partial<CreateSubmissionInput> = {},
): CreateSubmissionInput {
  return {
    ziggleNoticeId: "notice-1041",
    title: "겨울 정기 공연",
    categoryId: "performance",
    assetId: "asset-new",
    detailUrl: "https://ziggle.gistory.me/notice/notice-1041",
    startAt: new Date(NOW.getTime() + DAY_MS),
    endAt: new Date(NOW.getTime() + 7 * DAY_MS),
    targetGroupIds: [],
    ...overrides,
  };
}

async function statusOf(promise: Promise<unknown>): Promise<number | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { status?: number }).status ?? null;
  }
}

describe("조회 범위와 소유권 (명세 3.2)", () => {
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

  it("게시자는 전체 목록과 남의 신청을 볼 수 없다", async () => {
    expect(await statusOf(repos.submissions.list({ scope: "all" }))).toBe(403);
    expect(await statusOf(repos.submissions.getSummary({ scope: "all" }))).toBe(403);
    expect(await statusOf(repos.submissions.getById("notice-003"))).toBe(403);
    expect(await statusOf(repos.reviews.listHistory("notice-003"))).toBe(403);
  });

  it("하우스 관리자는 전체 목록과 남의 신청을 본다", async () => {
    signInAs(MOCK_USERS.REVIEWER);
    const all = await repos.submissions.list({ scope: "all", limit: 50 });

    expect(
      all.items.some((item) => item.requesterId !== MOCK_USERS.REVIEWER.id),
    ).toBe(true);
    await expect(repos.submissions.getById("notice-003")).resolves.toBeTruthy();
  });

  it("관리자도 남의 신청을 대신 고치거나 취소하지 않는다", async () => {
    signInAs(MOCK_USERS.REVIEWER);
    const target = await repos.submissions.getById("notice-901");

    expect(
      await statusOf(
        repos.submissions.update("notice-901", {
          title: "바꾼 제목",
          version: target.version,
        }),
      ),
    ).toBe(403);
    expect(
      await statusOf(
        repos.submissions.cancel("notice-901", { version: target.version }),
      ),
    ).toBe(403);
  });

  it("세션이 없으면 401이다", async () => {
    signInAs(null);
    expect(await statusOf(repos.submissions.list({}))).toBe(401);
    expect(await statusOf(repos.devices.listTargetGroups())).toBe(401);
  });

  it("게시자는 검토 API와 기기 목록을 쓸 수 없다", async () => {
    expect(await statusOf(repos.reviews.listPending({}))).toBe(403);
    expect(
      await statusOf(repos.reviews.approve({ submissionId: "notice-905", revision: 1 })),
    ).toBe(403);
    expect(await statusOf(repos.devices.list())).toBe(403);
  });
});

describe("신청 규칙", () => {
  let repos: Repositories;
  let signInAs: (user: SessionUser | null) => void;

  beforeEach(() => {
    ({ repos, signInAs } = setup());
  });

  it("만든 사람과 공지의 조직·부제·장소가 채워진다", async () => {
    const created = await repos.submissions.create(createInput());

    expect(created.requesterId).toBe(MOCK_USERS.SUBMITTER.id);
    expect(created.organizationName).toBe("공연동아리 페이드인");
    expect(created.location).toBe("대강당");
  });

  it("같은 공지로 진행 중인 신청이 있으면 새로 만들지 않는다", async () => {
    const first = await repos.submissions.create(createInput());

    expect(await statusOf(repos.submissions.create(createInput()))).toBe(409);

    // 취소하면 같은 공지로 다시 신청할 수 있다.
    await repos.submissions.submit(first.id);
    const submitted = await repos.submissions.getById(first.id);
    await repos.submissions.cancel(first.id, { version: submitted.version });
    await expect(repos.submissions.create(createInput())).resolves.toBeTruthy();
  });

  it("같은 key로 다시 보낸 제출은 409 없이 처음 결과를 돌려준다", async () => {
    const created = await repos.submissions.create(createInput());
    const options = { idempotencyKey: "submit-key-1" };

    const first = await repos.submissions.submit(created.id, options);
    const retried = await repos.submissions.submit(created.id, options);

    expect(retried.status).toBe("PENDING_REVIEW");
    expect(retried.version).toBe(first.version);
  });

  it("본 버전이 최신이 아니면 취소를 409로 막는다", async () => {
    const target = await repos.submissions.getById("notice-905");

    expect(
      await statusOf(
        repos.submissions.cancel("notice-905", { version: target.version - 1 }),
      ),
    ).toBe(409);
  });

  it("반려도 승인처럼 검토한 버전을 확인한다", async () => {
    signInAs(MOCK_USERS.REVIEWER);
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

  it("검토 기록에는 처리한 관리자 본인이 남는다", async () => {
    signInAs(MOCK_USERS.SUPER_ADMIN);
    await repos.reviews.approve({ submissionId: "notice-003", revision: 1 });

    const history = await repos.reviews.listHistory("notice-003");
    expect(history.at(-1)).toMatchObject({
      decision: "APPROVED",
      reviewerId: MOCK_USERS.SUPER_ADMIN.id,
      reviewerName: MOCK_USERS.SUPER_ADMIN.displayName,
    });
  });
});

describe("기기와 편성", () => {
  it("heartbeat가 5분 안에 있으면 온라인, 아니면 오프라인이다", async () => {
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
    expect(after.items.find((device) => device.id === "house-b-lobby")).toMatchObject({
      status: "ONLINE",
      appVersion: "v0.5.0",
    });
  });

  it("기기는 자기 위치가 대상인 게시물만 받는다", async () => {
    const { repos } = setup(MOCK_USERS.REVIEWER);

    const a = await repos.displays.getPlaylist("house-a-lobby");
    const b = await repos.displays.getPlaylist("house-b-lobby");

    // notice-002는 A동만 대상이다.
    expect(a.items.map((item) => item.submissionId)).toContain("notice-002");
    expect(b.items.map((item) => item.submissionId)).not.toContain("notice-002");
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
