import type { Page } from "@playwright/test";

/**
 * mock repository는 페이지(탭)당 in-memory다. `page.goto`는 전체 reload라 mock
 * 상태가 초기화된다. 상태를 이어가려면 앱 내(라우터) 이동을 써야 한다.
 */
export async function gotoInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

/** mock 로그인. 기본 역할은 하우스 관리자(게시자 역할 포함)다. */
export async function login(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await page.getByRole("button", { name: "인포팀 계정으로 로그인" }).click();
}

export async function switchRole(
  page: Page,
  roleLabel: "게시자" | "하우스 관리자" | "시스템 운영자",
): Promise<void> {
  await page.getByRole("button", { name: "계정 메뉴" }).click();
  await page.getByRole("menuitemradio", { name: roleLabel }).click();
}

/**
 * 스튜디오 dropzone에 브라우저 안에서 만든 유효한 포스터(1080x1440 PNG)를 넣는다.
 * 파일 fixture를 저장소에 두지 않아도 되고, 검증(해상도·decode)을 실제로 통과한다.
 */
export async function uploadGeneratedPoster(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#334455";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "120px sans-serif";
    context.fillText("E2E", 80, 200);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), "image/png"),
    );
    const file = new File([blob], "e2e-poster.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("파일 입력을 찾지 못했습니다");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByText(/업로드 완료/).waitFor();
}
