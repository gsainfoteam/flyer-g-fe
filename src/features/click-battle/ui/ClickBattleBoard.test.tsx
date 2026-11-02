import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { initialBattle } from "@/entities/game/model/click-battle";
import type { EventSurvey } from "@/shared/components/SurveyCorner";
import { ClickBattleBoard } from "./ClickBattleBoard";

const board = (survey: EventSurvey | null, phase: "LOBBY" | "RESULT" = "LOBBY") =>
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

describe("클릭 배틀 화면의 설문 QR(우상단)", () => {
  it("이벤트 시간대 화면에만 상태 줄 오른쪽에 설문 QR을 둔다", () => {
    board({ url: "https://forms.gle/abc", label: "이벤트 설문" });
    expect(screen.getByText("이벤트 설문")).toBeInTheDocument();
    expect(screen.getByText("QR을 찍고 의견을 들려주세요")).toBeInTheDocument();
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(3);
  });

  it("결과 화면에서는 강조해 다시 부른다", () => {
    board({ url: "https://forms.gle/abc", label: "이벤트 설문" }, "RESULT");
    expect(screen.getByText("판이 끝났어요!")).toBeInTheDocument();
    expect(screen.getByText("이벤트 설문에 참여해 주세요")).toBeInTheDocument();
  });

  it("경품 안내가 있으면 설문 칸에 경품을 크게 쓴다", () => {
    board({
      url: "https://forms.gle/abc",
      label: "이벤트 설문",
      prize: { headline: "추첨으로 소정의 상품", note: "11/8까지 응모" },
    });
    expect(screen.getByText("추첨으로 소정의 상품")).toBeInTheDocument();
    expect(screen.getByText("11/8까지 응모")).toBeInTheDocument();
  });

  it("설문이 없으면 설문 QR이 없다", () => {
    board(null);
    expect(screen.queryByText("이벤트 설문")).toBeNull();
    expect(screen.getByText(/팀당 최대/)).toBeInTheDocument();
  });
});
