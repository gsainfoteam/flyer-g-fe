import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * shadcn primitive를 앱이 실제로 쓰는 방식으로 다시 확인한다.
 * primitive를 썼다는 이유만으로 접근성이 보장된다고 가정하지 않는다. (Phase 00 문서 4절)
 */
describe("Button", () => {
  it("variant와 size가 class로 반영된다", () => {
    const { rerender } = render(<Button>승인</Button>);
    const primary = screen.getByRole("button").className;

    rerender(<Button variant="secondary">취소</Button>);
    expect(screen.getByRole("button").className).not.toBe(primary);

    rerender(<Button size="lg">승인</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "lg");
  });

  // 주 작업과 destructive는 같은 브랜드 강조색을 쓴다. 이 체계에서 빨강은
  // "지금 하는 작업"을 뜻하고, 위험은 문구와 확인 dialog가 알린다.
  it("주 작업과 destructive가 같은 강조색을 쓴다", () => {
    const { rerender } = render(<Button>승인</Button>);
    const primary = screen.getByRole("button").className;
    expect(primary).toContain("bg-accent");

    rerender(<Button variant="destructive">중단</Button>);
    expect(screen.getByRole("button").className).toBe(primary);
  });

  it("클릭 콜백이 실행된다", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>승인</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled면 클릭이 차단된다", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        승인
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"), { pointerEventsCheck: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("처리 중 표시는 spinner와 disabled를 함께 쓴다", () => {
    render(
      <Button disabled>
        <Spinner aria-hidden="true" />
        처리 중
      </Button>,
    );
    const button = screen.getByRole("button", { name: "처리 중" });
    expect(button).toBeDisabled();
  });

  it("icon-only 버튼은 접근 가능한 이름이 필요하다", () => {
    render(
      <Button size="icon" aria-label="더 보기">
        <span aria-hidden="true">·</span>
      </Button>,
    );
    expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });

  it("키보드로 포커스하고 실행할 수 있다", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>승인</Button>);

    await userEvent.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });
});
