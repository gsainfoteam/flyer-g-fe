import { describe, expect, it } from "vitest";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { fromSeoulInput, parseIsoUtc } from "@/shared/lib/datetime";
import { CATEGORY_FIXTURES, SIGNAGE_CONFIG_FIXTURE } from "@/mocks/reference";
import { createEmptyDraft, draftFromSubmission } from "./draft";
import {
  summarizeErrors,
  toFormFieldErrors,
  validateSubmissionForm,
} from "./validate";
import type { SubmissionFormValues, ValidateOptions } from "./validate";

/** 2026-06-08 12:00 Asia/Seoul */
const NOW = fromSeoulInput("2026-06-08T12:00");

const OPTIONS: ValidateOptions = {
  now: NOW,
  config: SIGNAGE_CONFIG_FIXTURE,
  categories: CATEGORY_FIXTURES,
};

const validValues = (
  overrides: Partial<SubmissionFormValues> = {},
): SubmissionFormValues => ({
  title: "겨울 정기 공연",
  categoryId: "performance",
  startAt: "2026-06-10T09:00",
  endAt: "2026-06-16T18:00",
  detailUrl: "https://ziggle.gistory.me/notice/1041",
  organizerName: "공연동아리 페이드인",
  subtitle: "12월 셋째 주 금요일 저녁",
  location: "대강당",
  description: "",
  assetId: "asset-mock-1",
  ...overrides,
});

describe("validateSubmissionForm", () => {
  it("모두 유효하면 오류가 없다", () => {
    expect(validateSubmissionForm(validValues(), OPTIONS)).toEqual({});
  });

  it("선택 입력은 비워도 된다. 상세 링크가 없으면 QR 없이 게시한다", () => {
    expect(
      validateSubmissionForm(
        validValues({
          detailUrl: "",
          organizerName: "",
          subtitle: " ",
          location: "",
        }),
        OPTIONS,
      ),
    ).toEqual({});
  });

  it("포스터가 없으면 막는다", () => {
    expect(
      validateSubmissionForm(validValues({ assetId: null }), OPTIONS).asset,
    ).toBeDefined();
  });

  describe("제목", () => {
    it("공백만 있으면 비어 있는 것으로 본다", () => {
      expect(
        validateSubmissionForm(validValues({ title: "   " }), OPTIONS).title,
      ).toBe("제목을 입력해 주세요.");
    });

    it("서버 설정의 최대 글자 수로 막는다", () => {
      const max = SIGNAGE_CONFIG_FIXTURE.titleMaxLength;
      expect(
        validateSubmissionForm(
          validValues({ title: ` ${"가".repeat(max)} ` }),
          OPTIONS,
        ).title,
      ).toBeUndefined();
      expect(
        validateSubmissionForm(
          validValues({ title: "가".repeat(max + 1) }),
          OPTIONS,
        ).title,
      ).toContain(`${max}자`);
    });
  });

  describe("카테고리", () => {
    it("서버 목록에 없는 값은 막는다", () => {
      expect(
        validateSubmissionForm(validValues({ categoryId: "unknown" }), OPTIONS)
          .categoryId,
      ).toBeDefined();
    });

    it("목록을 아직 받지 못했으면 비어 있는지만 본다", () => {
      const options = { ...OPTIONS, categories: null };
      expect(
        validateSubmissionForm(validValues({ categoryId: "unknown" }), options)
          .categoryId,
      ).toBeUndefined();
      expect(
        validateSubmissionForm(validValues({ categoryId: "" }), options)
          .categoryId,
      ).toBeDefined();
    });
  });

  describe("게시 기간 (서버 설정: 24시간 전 신청, 최대 3개월)", () => {
    it("종료가 시작보다 앞서거나 같으면 막는다", () => {
      expect(
        validateSubmissionForm(
          validValues({
            startAt: "2026-06-12T09:00",
            endAt: "2026-06-11T09:00",
          }),
          OPTIONS,
        ).endAt,
      ).toBeDefined();
      expect(
        validateSubmissionForm(
          validValues({
            startAt: "2026-06-12T09:00",
            endAt: "2026-06-12T09:00",
          }),
          OPTIONS,
        ).endAt,
      ).toBeDefined();
    });

    it("시작은 신청 시각에서 24시간 이후여야 한다", () => {
      // 지금은 6/8 12:00. 6/9 12:00은 통과하고 11:59는 막는다.
      expect(
        validateSubmissionForm(
          validValues({ startAt: "2026-06-09T12:00" }),
          OPTIONS,
        ).startAt,
      ).toBeUndefined();
      expect(
        validateSubmissionForm(
          validValues({ startAt: "2026-06-09T11:59" }),
          OPTIONS,
        ).startAt,
      ).toContain("24시간");
    });

    it("기간은 서울 달력 기준 3개월까지다", () => {
      expect(
        validateSubmissionForm(
          validValues({
            startAt: "2026-06-10T09:00",
            endAt: "2026-09-10T09:00",
          }),
          OPTIONS,
        ).endAt,
      ).toBeUndefined();
      expect(
        validateSubmissionForm(
          validValues({
            startAt: "2026-06-10T09:00",
            endAt: "2026-09-10T09:01",
          }),
          OPTIONS,
        ).endAt,
      ).toContain("3개월");
    });

    it("서버 시각이나 설정을 아직 모르면 지금과 비교하는 판정을 서버에 맡긴다", () => {
      const past = validValues({
        startAt: "2020-01-01T09:00",
        endAt: "2020-01-02T09:00",
      });
      expect(
        validateSubmissionForm(past, { ...OPTIONS, now: null }),
      ).not.toHaveProperty("startAt");
      expect(
        validateSubmissionForm(past, { ...OPTIONS, config: null }),
      ).not.toHaveProperty("endAt");
    });

    it("수정은 기간을 바꿨거나 다시 검토·승인을 받을 때만 기간 규칙을 다시 본다", () => {
      // 시작까지 1시간. 새 신청이면 24시간 규칙에 걸린다.
      const soon = { startAt: "2026-06-08T13:00", endAt: "2026-06-09T13:00" };
      const values = validValues(soon);
      const editing = (
        status: "PENDING_REVIEW" | "REJECTED" | "SCHEDULED",
      ) => ({
        ...OPTIONS,
        editing: { status, schedule: soon },
      });

      expect(validateSubmissionForm(values, OPTIONS).startAt).toBeDefined();
      expect(
        validateSubmissionForm(values, editing("PENDING_REVIEW")),
      ).not.toHaveProperty("startAt");
      // 재검토 요청과 재승인은 서버가 기간을 다시 본다.
      expect(
        validateSubmissionForm(values, editing("REJECTED")).startAt,
      ).toBeDefined();
      expect(
        validateSubmissionForm(values, editing("SCHEDULED")).startAt,
      ).toBeDefined();
      // 기간을 바꾸면 다시 본다.
      expect(
        validateSubmissionForm(
          validValues({ ...soon, startAt: "2026-06-08T14:00" }),
          editing("PENDING_REVIEW"),
        ).startAt,
      ).toBeDefined();
    });

    it("비어 있으면 각각 막는다", () => {
      const errors = validateSubmissionForm(
        validValues({ startAt: "", endAt: "" }),
        OPTIONS,
      );
      expect(errors.startAt).toBeDefined();
      expect(errors.endAt).toBeDefined();
    });
  });

  describe("상세 링크", () => {
    it("허용되지 않은 도메인은 막는다", () => {
      expect(
        validateSubmissionForm(
          validValues({ detailUrl: "https://evil.example.com/notice/1" }),
          OPTIONS,
        ).detailUrl,
      ).toBeDefined();
    });

    it("HTTP는 막는다", () => {
      expect(
        validateSubmissionForm(
          validValues({ detailUrl: "http://ziggle.gistory.me/notice/1" }),
          OPTIONS,
        ).detailUrl,
      ).toBeDefined();
    });
  });

  it("선택 입력이 서버 제한보다 길면 막는다", () => {
    const errors = validateSubmissionForm(
      validValues({
        organizerName: "가".repeat(101),
        description: "가".repeat(1001),
      }),
      OPTIONS,
    );
    expect(errors.organizerName).toContain("100자");
    expect(errors.description).toContain("1000자");
  });
});

describe("summarizeErrors", () => {
  it("오류가 없으면 null이다", () => {
    expect(summarizeErrors({})).toBeNull();
  });

  it("오류 개수를 알려준다", () => {
    expect(summarizeErrors({ title: "x", endAt: "y" })).toContain("2개");
  });
});

describe("createEmptyDraft / draftFromSubmission", () => {
  it("기본 시작은 모레 09:00이라 24시간 전 신청 규칙을 늘 지킨다", () => {
    // 밤 11시에 열어도 모레 아침이면 24시간이 넘는다.
    for (const now of ["2026-06-08T00:00", "2026-06-08T23:59"]) {
      const draft = createEmptyDraft(fromSeoulInput(now));
      expect(draft.startAt).toBe("2026-06-10T09:00");
      expect(
        validateSubmissionForm(
          validValues({ startAt: draft.startAt, endAt: draft.endAt }),
          {
            ...OPTIONS,
            now: fromSeoulInput(now),
          },
        ),
      ).toEqual({});
    }
  });

  it("기존 신청의 선택 입력은 빈 문자열로 채운다", () => {
    const submission = {
      title: "겨울 정기 공연",
      categoryId: "performance",
      startAt: parseIsoUtc("2026-06-10T00:00:00.000Z"),
      endAt: parseIsoUtc("2026-06-16T09:00:00.000Z"),
      detailUrl: null,
      organizerName: null,
      subtitle: "부제",
      location: null,
      description: null,
    } as SignageSubmissionExpanded;

    expect(draftFromSubmission(submission)).toEqual({
      title: "겨울 정기 공연",
      categoryId: "performance",
      startAt: "2026-06-10T09:00",
      endAt: "2026-06-16T18:00",
      detailUrl: "",
      organizerName: "",
      subtitle: "부제",
      location: "",
      description: "",
    });
  });
});

describe("toFormFieldErrors", () => {
  it("서버 필드 이름을 폼 항목으로 옮기고 모르는 항목은 따로 모은다", () => {
    expect(
      toFormFieldErrors({
        assetId: "포스터가 손상되었어요.",
        detailUrl: "이 공지로 이미 신청한 게시물이 있습니다.",
        organizerName: "주최는 100자 이하여야 합니다.",
        endAt: "기간이 너무 길어요.",
        priority: "우선순위를 정할 수 없어요.",
      }),
    ).toEqual({
      fieldErrors: {
        asset: "포스터가 손상되었어요.",
        detailUrl: "이 공지로 이미 신청한 게시물이 있습니다.",
        organizerName: "주최는 100자 이하여야 합니다.",
        endAt: "기간이 너무 길어요.",
      },
      other: ["우선순위를 정할 수 없어요."],
    });
  });
});
