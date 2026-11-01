import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { initialBattle } from "@/entities/game/model/click-battle";
import { ClickBattleBoard } from "./ClickBattleBoard";

const board = (survey: { url: string; label: string } | null, phase: "LOBBY" | "RESULT" = "LOBBY") =>
  render(
    <ClickBattleBoard
      roomId="dev_01"
      state={{ ...initialBattle(1), phase, winner: phase === "RESULT" ? "A" : null }}
      now={0}
      link="open"
      local={false}
      header={null}
      survey={survey}
    />,
  );

describe("클릭 배틀 화면의 설문 띠", () => {
  it("이벤트 시간대 화면에만 두 팀 아래 설문 QR을 둔다", () => {
    board({ url: "https://forms.gle/abc", label: "이벤트 설문" });
    expect(screen.getByText("이벤트 설문에 참여해 주세요")).toBeInTheDocument();
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(3);
  });

  it("결과 화면에서는 띠를 강조해 다시 부른다", () => {
    board({ url: "https://forms.gle/abc", label: "이벤트 설문" }, "RESULT");
    expect(screen.getByText("판이 끝났어요! 이벤트 설문에 참여해 주세요")).toBeInTheDocument();
  });

  it("설문이 없으면 규칙 줄만 둔다", () => {
    board(null);
    expect(screen.queryByText(/설문에 참여해 주세요/)).toBeNull();
    expect(screen.getByText(/팀당 최대/)).toBeInTheDocument();
  });
});
