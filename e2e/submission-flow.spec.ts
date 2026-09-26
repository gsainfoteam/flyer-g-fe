import { expect, test } from "@playwright/test";
import { gotoInApp, login, switchRole, uploadGeneratedPoster } from "./helpers";

/**
 * AT-01 정상 신청과 예약 게시, AT-02 반려와 재신청 (mock 기반).
 * mock 상태는 페이지 단위라 한 페이지 안에서 앱 내 이동으로 이어간다.
 */
test("게시자가 공지를 연결해 신청하면 승인 대기가 된다", async ({ page }) => {
  await login(page, "/studio?noticeId=notice-1041");

  // 공지에서 제목·링크가 자동으로 채워진다.
  await expect(
    page.locator('input[value="겨울 정기 공연 〈한밤의 물리학〉"]'),
  ).toBeVisible();

  await uploadGeneratedPoster(page);
  await page.getByRole("button", { name: "제출하기" }).click();

  await expect(
    page.getByRole("heading", { name: "신청이 접수되었어요" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("승인 대기"),
  ).toBeVisible();

  // 상세로 이동하면 같은 신청이 승인 대기 상태로 보인다.
  await page.getByRole("button", { name: "신청 상세 보기" }).click();
  await expect(
    page.getByRole("heading", { name: "겨울 정기 공연 〈한밤의 물리학〉" }),
  ).toBeVisible();
  await expect(page.getByText("관리자 검토를 기다리고 있어요")).toBeVisible();
});

test("관리자 승인 → 미래 시작 건은 예약되고 TV에 나오지 않는다", async ({
  page,
}) => {
  await login(page, "/reviews");

  // fixture notice-003은 시작이 이틀 뒤다.
  await page
    .getByRole("listitem")
    .filter({ hasText: "지스트신문 22기 기자단 모집" })
    .getByRole("link", { name: "검토" })
    .click();

  await page.getByRole("button", { name: "승인" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "승인" })
    .click();
  await expect(page.getByText("승인했어요")).toBeVisible();
  // 결정하면 다음으로 오래 기다린 건의 검토 화면으로 넘어간다.
  await expect(page).toHaveURL(/\/reviews\/notice-005$/);

  // 같은 mock 상태로 TV를 열면(앱 내 이동) 예약 건은 노출되지 않는다.
  await gotoInApp(page, "/display/house-a-lobby");
  await expect(page.getByText("A동 로비")).toBeVisible();
  await expect(
    page.getByText("지스트신문 22기 기자단 모집"),
  ).not.toBeVisible();
});

test("반려 → 게시자가 사유 확인 후 수정 재신청", async ({ page }) => {
  await login(page, "/reviews");

  // fixture notice-905는 게시자(정하윤)가 올린 승인 대기 신청이다.
  // 반려된 신청은 신청한 본인만 고칠 수 있다.
  await page
    .getByRole("listitem")
    .filter({ hasText: "슈퍼-피셜 가을 전시" })
    .getByRole("link", { name: "검토" })
    .click();

  await page.getByRole("button", { name: "반려" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "정보 불일치" }).click();
  await dialog
    .getByRole("textbox")
    .fill("포스터 마감일이 공지 본문과 다릅니다.");
  await dialog.getByRole("button", { name: "반려" }).click();
  await expect(page.getByText("반려했어요", { exact: true })).toBeVisible();

  // 게시자 시점: 상세에서 사유를 확인하고 재신청 화면으로 간다.
  await switchRole(page, "게시자");
  await gotoInApp(page, "/submissions?status=rejected");
  await page
    .getByRole("link")
    .filter({ hasText: "슈퍼-피셜 가을 전시" })
    .click();
  await expect(
    page.getByText("포스터 마감일이 공지 본문과 다릅니다."),
  ).toBeVisible();

  await page.getByRole("link", { name: "수정해서 다시 신청" }).click();
  await expect(page.getByText("반려된 신청 수정")).toBeVisible();

  // 그대로 다시 제출하면 승인 대기로 돌아간다.
  await page.getByRole("button", { name: "다시 신청하기" }).click();
  await expect(
    page.getByRole("heading", { name: "다시 신청했어요" }),
  ).toBeVisible();

  // 닫으면 수정 화면에 남지 않고 그 신청의 상세로 간다.
  await page.getByRole("button", { name: "신청 상세 보기" }).click();
  await expect(page.getByText("관리자 검토를 기다리고 있어요")).toBeVisible();
});
