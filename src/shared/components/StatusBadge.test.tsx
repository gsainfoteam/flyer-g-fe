import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SUBMISSION_STATUSES, getStatusLabel } from "@/entities/submission";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("모든 상태를 색이 아닌 문구로 구분해 보여준다", () => {
    for (const status of SUBMISSION_STATUSES) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(getStatusLabel(status))).toBeInTheDocument();
      unmount();
    }
  });

  it("아이콘은 보조 표현이라 접근성 트리에서 감춘다", () => {
    const { container } = render(<StatusBadge status="PUBLISHED" />);
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("hideIcon이면 문구만 남는다", () => {
    const { container } = render(<StatusBadge status="PUBLISHED" hideIcon />);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("게시 중")).toBeInTheDocument();
  });

  it("상태마다 tone class가 달라진다", () => {
    const { container: published } = render(<StatusBadge status="PUBLISHED" />);
    const { container: rejected } = render(<StatusBadge status="REJECTED" />);
    expect(published.firstElementChild?.className).not.toBe(
      rejected.firstElementChild?.className,
    );
  });
});
