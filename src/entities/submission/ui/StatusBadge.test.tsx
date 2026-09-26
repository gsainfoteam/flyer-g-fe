import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SUBMISSION_STATUSES, getStatusLabel } from "@/entities/submission";
import { StatusBadge } from "@/entities/submission/ui/StatusBadge";

describe("StatusBadge", () => {
  it("모든 상태를 색이 아닌 문구로 구분해 보여준다", () => {
    for (const status of SUBMISSION_STATUSES) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(getStatusLabel(status))).toBeInTheDocument();
      unmount();
    }
  });

  it("게시자가 고쳐야 하는 상태만 강조 tone을 쓴다", () => {
    for (const status of ["REJECTED", "SUSPENDED"] as const) {
      const { container, unmount } = render(<StatusBadge status={status} />);
      expect(container.firstElementChild?.className).toContain("attention");
      unmount();
    }

    for (const status of ["PUBLISHED", "SCHEDULED", "PENDING_REVIEW"] as const) {
      const { container, unmount } = render(<StatusBadge status={status} />);
      expect(container.firstElementChild?.className).not.toContain("attention");
      unmount();
    }
  });
});
