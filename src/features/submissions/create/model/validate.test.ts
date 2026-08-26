import { describe, expect, it } from "vitest";
import { fromSeoulInput } from "@/shared/lib/datetime";
import { createEmptyDraft, draftFromNotice } from "./draft";
import { summarizeErrors, validateSubmissionForm } from "./validate";
import type { SubmissionFormValues } from "./validate";

/** 2026-06-08 12:00 Asia/Seoul */
const NOW = fromSeoulInput("2026-06-08T12:00");

const validValues = (
  overrides: Partial<SubmissionFormValues> = {},
): SubmissionFormValues => ({
  ziggleNoticeId: "notice-1041",
  title: "겨울 정기 공연",
  categoryId: "performance",
  startAt: "2026-06-09T09:00",
  endAt: "2026-06-16T18:00",
  detailUrl: "https://ziggle.gistory.me/notice/1041",
  assetId: "asset-mock-1",
  ...overrides,
});

describe("validateSubmissionForm", () => {
  it("모두 유효하면 오류가 없다", () => {
    expect(validateSubmissionForm(validValues(), { now: NOW })).toEqual({});
  });

  it("공지가 연결되지 않으면 막는다", () => {
    const errors = validateSubmissionForm(
      validValues({ ziggleNoticeId: null }),
      { now: NOW },
    );
    expect(errors.notice).toBeDefined();
  });

  it("포스터가 없으면 막는다", () => {
    const errors = validateSubmissionForm(validValues({ assetId: null }), {
      now: NOW,
    });
    expect(errors.asset).toBeDefined();
  });

  describe("제목", () => {
    it("공백만 있으면 비어 있는 것으로 본다", () => {
      const errors = validateSubmissionForm(validValues({ title: "   " }), {
        now: NOW,
      });
      expect(errors.title).toBeDefined();
    });

    it("공백 제거 후 80자는 통과하고 81자는 막는다", () => {
      const at80 = validateSubmissionForm(
        validValues({ title: `${"가".repeat(80)}  ` }),
        { now: NOW },
      );
      const at81 = validateSubmissionForm(
        validValues({ title: "가".repeat(81) }),
        { now: NOW },
      );
      expect(at80.title).toBeUndefined();
      expect(at81.title).toBeDefined();
    });
  });

  describe("카테고리", () => {
    it("목록에 없는 값은 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ categoryId: "unknown-category" }),
        { now: NOW },
      );
      expect(errors.categoryId).toBeDefined();
    });
  });

  describe("게시 기간", () => {
    it("종료가 시작보다 앞서면 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ startAt: "2026-06-20T09:00", endAt: "2026-06-19T09:00" }),
        { now: NOW },
      );
      expect(errors.endAt).toBeDefined();
    });

    it("시작과 종료가 같으면 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ startAt: "2026-06-20T09:00", endAt: "2026-06-20T09:00" }),
        { now: NOW },
      );
      expect(errors.endAt).toBeDefined();
    });

    it("이미 지난 종료 시각은 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ startAt: "2026-06-01T09:00", endAt: "2026-06-07T18:00" }),
        { now: NOW },
      );
      expect(errors.endAt).toBeDefined();
    });

    it("시작이 과거여도 종료가 미래면 통과한다", () => {
      const errors = validateSubmissionForm(
        validValues({ startAt: "2026-06-01T09:00", endAt: "2026-06-30T18:00" }),
        { now: NOW },
      );
      expect(errors.startAt).toBeUndefined();
      expect(errors.endAt).toBeUndefined();
    });

    it("Asia/Seoul 자정 직전과 직후를 구분한다", () => {
      // 서울 6/8 12:00 = UTC 6/8 03:00. 서울 6/8 23:59는 아직 미래다.
      const justBeforeMidnight = validateSubmissionForm(
        validValues({ startAt: "2026-06-08T13:00", endAt: "2026-06-08T23:59" }),
        { now: NOW },
      );
      expect(justBeforeMidnight.endAt).toBeUndefined();

      // 서울 6/8 11:59는 이미 지났다. UTC로만 비교하면 실수하기 쉬운 지점이다.
      const justBeforeNow = validateSubmissionForm(
        validValues({ startAt: "2026-06-08T09:00", endAt: "2026-06-08T11:59" }),
        { now: NOW },
      );
      expect(justBeforeNow.endAt).toBeDefined();
    });

    it("비어 있으면 각각 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ startAt: "", endAt: "" }),
        { now: NOW },
      );
      expect(errors.startAt).toBeDefined();
      expect(errors.endAt).toBeDefined();
    });
  });

  describe("상세 링크", () => {
    it("허용되지 않은 도메인은 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ detailUrl: "https://evil.example.com/notice/1" }),
        { now: NOW },
      );
      expect(errors.detailUrl).toBeDefined();
    });

    it("구 Ziggle 도메인은 새 입력으로 허용하지 않는다", () => {
      const errors = validateSubmissionForm(
        validValues({ detailUrl: "https://ziggle.gist.ac.kr/notice/1" }),
        { now: NOW },
      );
      expect(errors.detailUrl).toBeDefined();
    });

    it("HTTP는 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ detailUrl: "http://ziggle.gistory.me/notice/1" }),
        { now: NOW },
      );
      expect(errors.detailUrl).toBeDefined();
    });
  });
});

describe("summarizeErrors", () => {
  it("오류가 없으면 null이다", () => {
    expect(summarizeErrors({})).toBeNull();
  });

  it("오류 개수를 알려준다", () => {
    expect(summarizeErrors({ title: "a", asset: "b" })).toContain("2개");
  });
});

describe("createEmptyDraft / draftFromNotice", () => {
  it("기본 기간은 미래이고 종료가 시작보다 뒤다", () => {
    const draft = createEmptyDraft(NOW);
    const errors = validateSubmissionForm(
      { ...draft, ziggleNoticeId: "n", assetId: "a", title: "t", categoryId: "notice", detailUrl: "https://ziggle.gistory.me/notice/1" },
      { now: NOW },
    );
    expect(errors.startAt).toBeUndefined();
    expect(errors.endAt).toBeUndefined();
  });

  it("기본 시작은 다음 날 09:00 (Asia/Seoul)이다", () => {
    expect(createEmptyDraft(NOW).startAt).toBe("2026-06-09T09:00");
  });

  it("공지에서 제목·카테고리·상세 링크를 채운다", () => {
    const draft = draftFromNotice(
      {
        id: "notice-1041",
        title: "겨울 정기 공연",
        categoryId: "performance",
        organizationName: "가상 공연동아리",
        detailUrl: "https://ziggle.gistory.me/notice/notice-1041",
        summary: null,
        location: null,
        publishedAt: NOW,
      },
      NOW,
    );
    expect(draft).toMatchObject({
      title: "겨울 정기 공연",
      categoryId: "performance",
      detailUrl: "https://ziggle.gistory.me/notice/notice-1041",
    });
  });

  it("모르는 카테고리는 비워 두고 사용자가 고르게 한다", () => {
    const draft = draftFromNotice(
      {
        id: "notice-1",
        title: "제목",
        categoryId: "ziggle-only-category",
        organizationName: null,
        detailUrl: "https://ziggle.gistory.me/notice/1",
        summary: null,
        location: null,
        publishedAt: NOW,
      },
      NOW,
    );
    expect(draft.categoryId).toBe("");
  });
});
