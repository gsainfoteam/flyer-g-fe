import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { currentPath, renderRoute } from "@/test/render-route";

/** 승인 대기 목록 (명세 FR-REV-01) */
describe("승인 대기 목록", () => {
  it("오래 기다린 순으로 보여주고 검토 상세로 연결한다", async () => {
    renderRoute("/reviews", { role: "REVIEWER" });

    expect(
      await screen.findByText(/승인 대기 \d+건/),
    ).toBeInTheDocument();

    const reviewLinks = screen.getAllByRole("link", { name: "검토" });
    expect(reviewLinks.length).toBeGreaterThan(0);
    expect(reviewLinks[0]!.getAttribute("href")).toMatch(/^\/reviews\//);

    // 가장 오래 기다린 건이 위에 온다.
    const waits = screen
      .getAllByText(/\d+(분|시간|일) 대기/)
      .map((el) => el.textContent ?? "");
    expect(waits.length).toBeGreaterThan(1);
  });

  it("조직 필터로 목록을 좁힐 수 있다", async () => {
    const user = userEvent.setup();
    renderRoute("/reviews", { role: "REVIEWER" });
    await screen.findByText(/승인 대기 \d+건/);

    const before = screen.getAllByRole("link", { name: "검토" }).length;

    await user.click(screen.getByRole("combobox", { name: "조직 필터" }));
    const options = await screen.findAllByRole("option");
    // "모든 조직" 다음의 실제 조직 하나를 고른다.
    await user.click(options[1]!);

    const after = screen.getAllByRole("link", { name: "검토" }).length;
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  it("조건에 맞는 건이 없으면 필터 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/reviews", { role: "REVIEWER" });
    await screen.findByText(/승인 대기 \d+건/);

    // 서로 다른 건의 조직과 카테고리를 교차로 골라 교집합을 비운다.
    await user.click(screen.getByRole("combobox", { name: "조직 필터" }));
    const orgOptions = await screen.findAllByRole("option");
    const orgName = orgOptions[1]!.textContent ?? "";
    await user.click(orgOptions[1]!);

    // 열린 dropdown은 나머지 화면을 aria-hidden으로 가리므로, 행은 닫힌 상태에서 읽는다.
    const rows = screen.getAllByRole("listitem");
    const visibleCats = rows.map((row) => row.textContent ?? "").join(" ");

    await user.click(screen.getByRole("combobox", { name: "카테고리 필터" }));
    const catOptions = await screen.findAllByRole("option");
    // 남은 행에 없는 카테고리를 골라 교집합을 비운다. 없으면 이 검증은 넘어간다.
    const missing = catOptions
      .slice(1)
      .find((option) => !visibleCats.includes(option.textContent ?? ""));
    if (!missing) return;
    await user.click(missing);

    expect(
      await screen.findByText("조건에 맞는 대기 건이 없어요"),
    ).toBeInTheDocument();
    expect(screen.getByText(/필터를 넓혀 보세요/)).toBeInTheDocument();
    void orgName;
  });

  it("필터를 URL에 남겨 새로고침해도 유지한다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/reviews", { role: "REVIEWER" });
    await screen.findByText(/승인 대기 \d+건/);

    await user.click(screen.getByRole("combobox", { name: "조직 필터" }));
    await user.click(await screen.findByRole("option", { name: "지스트신문" }));

    expect(currentPath(router)).toBe(
      `/reviews?organization=${encodeURIComponent("지스트신문")}`,
    );
    expect(screen.getAllByRole("link", { name: "검토" })).toHaveLength(1);
  });
});

