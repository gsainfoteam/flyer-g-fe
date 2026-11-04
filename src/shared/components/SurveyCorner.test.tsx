import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SurveyCorner } from "./SurveyCorner";

const survey = { url: "https://example.com/survey", label: "이벤트 설문" };
const prize = { headline: "추첨으로 소정의 상품", note: "11/8까지 응모" };

describe("SurveyCorner", () => {
  it("경품이 있으면 경품을 크게 쓰고 테두리로 짚는다", () => {
    render(<SurveyCorner survey={{ ...survey, prize }} finished={false} />);
    expect(screen.getByText("추첨으로 소정의 상품")).toBeInTheDocument();
    expect(screen.getByText("11/8까지 응모")).toBeInTheDocument();
    expect(screen.getByText("이벤트 설문 참여하면")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "이벤트 설문" }).className).toContain("ring-warning");
  });

  it("판이 끝나면 결과 화면용 문구와 더 굵은 테두리", () => {
    render(<SurveyCorner survey={{ ...survey, prize }} finished />);
    expect(screen.getByText("경기 종료! 이벤트 설문 참여하면")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "이벤트 설문" }).className).toContain("ring-accent");
  });

  it("경품이 없으면(마감 뒤) 설문 안내만 쓴다", () => {
    render(<SurveyCorner survey={{ ...survey, prize: null }} finished={false} />);
    expect(screen.queryByText("추첨으로 소정의 상품")).toBeNull();
    expect(screen.getByText("QR로 설문 참여")).toBeInTheDocument();
  });
});
