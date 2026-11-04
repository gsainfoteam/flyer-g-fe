import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { initialMatch } from "@/entities/game/model/shuffleboard";
import type { MatchState } from "@/entities/game/model/shuffleboard";
import { ShuffleboardStage } from "./ShuffleboardStage";

const finished: MatchState = {
  ...initialMatch(1, "m1"),
  phase: "FINISHED",
  phaseEndsAt: 10_000,
  winner: "A",
};

const stage = (survey: { url: string; label: string } | null) =>
  render(
    <ShuffleboardStage
      state={finished}
      now={4_000}
      joinUrls={{ A: null, B: null }}
      closedLabel=""
      survey={survey}
      header={null}
    />,
  );

describe("ShuffleboardStage", () => {
  it("결과 화면은 설문 QR이 있을 때만 QR을 안내한다", () => {
    stage({ url: "https://example.com/survey", label: "이벤트 설문" });
    expect(screen.getByText("오른쪽 위 QR로 전단지 설문 참여")).toBeInTheDocument();
  });

  it("설문 QR이 없으면 다음 모집까지 남은 초를 알린다", () => {
    stage(null);
    expect(screen.queryByText(/QR로 전단지 설문/)).toBeNull();
    expect(screen.getByText("6초 후 다음 참가자 모집")).toBeInTheDocument();
  });
});
