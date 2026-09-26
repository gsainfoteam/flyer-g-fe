import { expect, test } from "@playwright/test";
import { gotoInApp, login } from "./helpers";

/**
 * AT-04 오프라인 재생, AT-05 긴급 중단, AT-06 손상 미디어 격리 (mock 기반).
 */
test("게시 중단하면 다음 편성에서 TV에서 사라진다", async ({ page }) => {
  await login(page, "/reviews/notice-001");

  await page.getByRole("button", { name: "게시 중단" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("행사가 취소되어 내립니다.");
  await dialog.getByRole("button", { name: "게시 중단" }).click();
  await expect(
    page.getByText("게시를 중단했어요", { exact: true }),
  ).toBeVisible();

  // 같은 mock 상태의 TV 편성에서 빠져 있다.
  await gotoInApp(page, "/display/device-preview?preview=1");
  await expect(page.getByText("미리보기")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "VESPER 피아노 정기공연" }),
  ).not.toBeVisible();
});

test("편성 조회가 죽어도 last-known-good 캐시로 재생한다", async ({ page }) => {
  // 1차 방문: 정상 편성 → 미디어 검증 → IndexedDB 승격을 기다린다.
  await page.goto("/display/house-a-lobby");
  await expect(page.getByText("A동 로비")).toBeVisible();
  await page.waitForFunction(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("flyer-g-display", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction("kv").objectStore("kv").getAllKeys();
      tx.onsuccess = () => resolve(tx.result);
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return keys.includes("playlist:last-known-good");
  });

  // 2차 방문: 편성 조회를 실패시킨다. 오류 주입은 새로고침 후에도 유지된다.
  await page.evaluate(() => {
    sessionStorage.setItem(
      "flyerg:mock-fail",
      JSON.stringify({ "displays.getPlaylist": 500 }),
    );
  });
  await page.goto("/display/house-a-lobby?preview=1");

  // 캐시(blob URL)로 계속 재생하고, 미리보기에는 오프라인 표시가 붙는다.
  await expect(page.getByText("오프라인 편성")).toBeVisible();
  const posterSrc = await page
    .locator("img[alt$='포스터']")
    .first()
    .getAttribute("src");
  expect(posterSrc).toMatch(/^blob:/);
});

test("깨진 이미지는 건너뛰고 다음 콘텐츠를 재생한다", async ({ page }) => {
  // 첫 게시 중 포스터의 이미지 요청을 끊는다.
  await page.route("**/posters/vesper.webp", (route) => route.abort());

  await login(page, "/");
  await gotoInApp(page, "/display/house-a-lobby");

  await expect(page.getByText("A동 로비")).toBeVisible();
  // 깨진 항목이 빠지고 다른 게시 중 콘텐츠가 나온다.
  await expect(
    page.getByRole("heading", { name: "연구보조 학생 모집" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "VESPER 피아노 정기공연" }),
  ).not.toBeVisible();
});
