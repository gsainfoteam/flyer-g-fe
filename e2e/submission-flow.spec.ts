import { expect, test } from "@playwright/test";
import { gotoInApp, login, switchRole, uploadGeneratedPoster } from "./helpers";

/**
 * AT-01 정상 신청과 예약 게시, AT-02 반려와 재신청 (mock 기반, 백엔드 계약 규칙).
 * mock 상태는 페이지 단위라 한 페이지 안에서 앱 내 이동으로 이어간다.
 */
test("게시자가 게시 정보를 입력해 신청하면 바로 승인 대기가 된다", async ({
  page,
}) => {
  await login(page);
  await switchRole(page, "사용자");
  await gotoInApp(page, "/new/poster");

  // Ziggle 공지 조회가 없어 TV에 나갈 정보를 직접 입력한다.
  await page.getByRole("textbox", { name: /제목/ }).fill("겨울 정기 공연");
  await page.getByRole("combobox", { name: /카테고리/ }).click();
  await page.getByRole("option", { name: "공연" }).click();
  await page.getByRole("textbox", { name: /주최/ }).fill("공연동아리 페이드인");
  await page
    .getByRole("textbox", { name: /상세 링크/ })
    .fill("https://ziggle.gistory.me/notice/1041");

  // 미리보기가 입력을 따라온다.
  await expect(
    page.getByRole("main").getByText("공연동아리 페이드인"),
  ).toBeVisible();

  await uploadGeneratedPoster(page);
  await page.getByRole("button", { name: "제출하기" }).click();

  await expect(
    page.getByRole("heading", { name: "신청 접수 완료" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByText("승인 대기")).toBeVisible();

  // 상세로 이동하면 같은 신청이 승인 대기 상태로 보인다.
  await page.getByRole("button", { name: "신청 상세 보기" }).click();
  await expect(
    page.getByRole("heading", { name: "겨울 정기 공연" }),
  ).toBeVisible();
  await expect(page.getByText(/심사 중 ·/)).toBeVisible();
});

test("관리자 승인 → 미래 시작 건은 예약되고 TV에 나오지 않는다", async ({
  page,
}) => {
  await login(page, "/review/notice-003");

  // fixture notice-003은 시작이 이틀 뒤다.
  await expect(
    page.getByRole("heading", { name: "지스트신문 22기 기자단 모집", level: 2 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "승인" }).click();
  await expect(page.getByText("승인 · 지스트신문 22기 기자단 모집", { exact: true })).toBeVisible();
  // 결정하면 다음으로 오래 기다린 건의 검토 화면으로 넘어간다.
  await expect(page).toHaveURL(/\/review\/notice-005$/);

  // 심사 화면을 떠나면 지연 중인 결정이 전송된다. 상세에서 예약 상태를 확인한다.
  await gotoInApp(page, "/mine/notice-003");
  await expect(page.getByText(/게시 예정/)).toBeVisible();

  // 같은 mock 상태로 TV를 열면(앱 내 이동) 예약 건은 노출되지 않는다.
  await gotoInApp(page, "/display/house-a-lobby");
  await expect(page.getByText("A동 로비")).toBeVisible();
  await expect(page.getByText("지스트신문 22기 기자단 모집")).not.toBeVisible();
});

test("반려 → 게시자가 사유 확인 후 수정 재신청", async ({ page }) => {
  await login(page, "/review/notice-905");

  // fixture notice-905는 게시자(정하윤)가 올린 승인 대기 신청이다.
  // 반려된 신청은 신청한 본인만 고칠 수 있다.
  await expect(
    page.getByRole("heading", { name: /슈퍼-피셜 가을 전시/, level: 2 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "반려" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "정보 불일치" }).click();
  await dialog
    .getByRole("textbox")
    .fill("포스터 마감일이 공지 본문과 다릅니다.");
  await dialog.getByRole("button", { name: "반려" }).click();
  await expect(page.getByText(/반려 · 정보 불일치 · 슈퍼-피셜/)).toBeVisible();

  // 게시자 시점: 상세에서 사유를 확인하고 재신청 화면으로 간다.
  await gotoInApp(page, "/mine/notice-905");
  await switchRole(page, "사용자");
  await gotoInApp(page, "/mine/notice-905");
  await expect(
    page.getByText("포스터 마감일이 공지 본문과 다릅니다.", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "고쳐서 다시 내기" }).click();
  await expect(page.getByText("반려된 신청 수정")).toBeVisible();

  // 그대로 다시 제출하면 승인 대기로 돌아간다.
  await page.getByRole("button", { name: "다시 신청하기" }).click();
  await expect(
    page.getByRole("heading", { name: "재신청 완료" }),
  ).toBeVisible();

  // 닫으면 수정 화면에 남지 않고 그 신청의 상세로 간다.
  await page.getByRole("button", { name: "신청 상세 보기" }).click();
  await expect(page.getByText(/심사 중 ·/)).toBeVisible();
});
