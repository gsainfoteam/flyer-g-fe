import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

function StatusTabs() {
  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">전체</TabsTrigger>
        <TabsTrigger value="pending">승인 대기</TabsTrigger>
        <TabsTrigger value="published">게시 중</TabsTrigger>
      </TabsList>
      <TabsContent value="all">전체 목록</TabsContent>
      <TabsContent value="pending">승인 대기 목록</TabsContent>
      <TabsContent value="published">게시 중 목록</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("선택된 탭의 내용만 보여준다", () => {
    render(<StatusTabs />);
    expect(screen.getByText("전체 목록")).toBeInTheDocument();
    expect(screen.queryByText("승인 대기 목록")).not.toBeInTheDocument();
  });

  it("화살표 키로 탭을 옮길 수 있다", async () => {
    render(<StatusTabs />);
    const first = screen.getByRole("tab", { name: "전체" });
    first.focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "승인 대기" })).toHaveFocus();
    expect(screen.getByText("승인 대기 목록")).toBeInTheDocument();

    await userEvent.keyboard("{ArrowLeft}");
    expect(first).toHaveFocus();
  });

  it("선택 상태를 aria-selected로 알린다", async () => {
    render(<StatusTabs />);
    expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await userEvent.click(screen.getByRole("tab", { name: "게시 중" }));
    expect(screen.getByRole("tab", { name: "게시 중" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
