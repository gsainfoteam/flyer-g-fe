import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/shared/ui/input";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("label과 입력을 id로 연결한다", () => {
    render(
      <FormField label="제목">
        {(control) => <Input {...control} />}
      </FormField>,
    );
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
  });

  it("설명과 오류를 aria-describedby로 함께 연결한다", () => {
    render(
      <FormField
        label="상세 링크"
        description="공식 Ziggle 주소만 허용합니다."
        error="허용되지 않은 도메인입니다."
      >
        {(control) => <Input {...control} />}
      </FormField>,
    );

    const input = screen.getByLabelText("상세 링크");
    const describedBy = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedBy).toHaveLength(2);

    const texts = describedBy.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toContain("공식 Ziggle 주소만 허용합니다.");
    expect(texts).toContain("허용되지 않은 도메인입니다.");
  });

  it("오류가 있으면 aria-invalid를 켠다", () => {
    render(
      <FormField label="제목" error="필수 항목입니다.">
        {(control) => <Input {...control} />}
      </FormField>,
    );
    expect(screen.getByLabelText("제목")).toHaveAttribute("aria-invalid", "true");
  });

  it("오류가 없으면 describedby에 오류 id를 넣지 않는다", () => {
    render(
      <FormField label="제목" description="1~80자">
        {(control) => <Input {...control} />}
      </FormField>,
    );
    const input = screen.getByLabelText("제목");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toHaveLength(1);
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("필수 항목은 별표 외에 문구로도 알린다", () => {
    render(
      <FormField label="제목" required>
        {(control) => <Input {...control} />}
      </FormField>,
    );
    expect(screen.getByText("필수 항목")).toBeInTheDocument();
    expect(screen.getByLabelText(/제목/)).toBeRequired();
  });
});
