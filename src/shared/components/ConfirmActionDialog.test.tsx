import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

function Harness({
  onConfirm,
}: {
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        게시 중단
      </button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title="게시를 중단할까요?"
        description="사유는 게시자에게 표시됩니다."
        confirmLabel="중단하기"
        onConfirm={onConfirm}
      />
    </>
  );
}

describe("ConfirmActionDialog", () => {
  it("열면 dialog 안으로 focus가 옮겨간다", async () => {
    render(<Harness onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "게시 중단" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("게시를 중단할까요?");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  // focus 복원은 Radix FocusScope의 동작이며 jsdom에서는 재현되지 않는다.
  // 실제 브라우저 확인 결과는 docs/design-system.md의 검증 기록에 남긴다.
  it("Escape로 닫는다", async () => {
    render(<Harness onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "게시 중단" }));
    await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("키보드만으로 확인 버튼까지 이동할 수 있다", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmActionDialog
        open
        onOpenChange={vi.fn()}
        title="승인할까요?"
        confirmLabel="승인하기"
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole("button", { name: "승인하기" });
    confirm.focus();
    await userEvent.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("확인이 성공하면 닫는다", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "게시 중단" }));
    await screen.findByRole("dialog");

    await userEvent.click(screen.getByRole("button", { name: "중단하기" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("실패하면 성공을 가정하지 않고 dialog를 열어 둔 채 오류를 전달한다", async () => {
    const failure = new Error("서버 거절");
    const onConfirm = vi.fn().mockRejectedValue(failure);
    const onError = vi.fn();

    render(
      <ConfirmActionDialog
        open
        onOpenChange={vi.fn()}
        title="게시를 중단할까요?"
        confirmLabel="중단하기"
        onConfirm={onConfirm}
        onError={onError}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "중단하기" }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("처리 중에는 확인 버튼을 다시 누를 수 없다", async () => {
    let release: (() => void) | undefined;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => {
        release = resolve;
      }),
    );

    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "게시 중단" }));
    await screen.findByRole("dialog");

    const confirm = screen.getByRole("button", { name: "중단하기" });
    await userEvent.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());

    await userEvent.click(confirm, { pointerEventsCheck: 0 });
    expect(onConfirm).toHaveBeenCalledOnce();

    release?.();
  });

  it("confirmDisabled면 실행할 수 없다", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmActionDialog
        open
        onOpenChange={vi.fn()}
        title="반려하시겠습니까?"
        confirmLabel="반려하기"
        confirmDisabled
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole("button", { name: "반려하기" });
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm, { pointerEventsCheck: 0 });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
