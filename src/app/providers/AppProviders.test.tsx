import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { parseIsoUtc } from "@/shared/lib/datetime";
import { AppProviders } from "./AppProviders";
import { useRepositories } from "@/shared/api/repositories-context";

function Probe() {
  const repositories = useRepositories();
  return <span>{typeof repositories.submissions.list}</span>;
}

describe("AppProviders", () => {
  it("주입한 repository를 화면 계층에 전달한다", () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(parseIsoUtc("2026-06-08T03:00:00.000Z")),
    });

    render(
      <AppProviders repositories={repositories}>
        <Probe />
      </AppProviders>,
    );

    expect(screen.getByText("function")).toBeInTheDocument();
  });

  it("provider 밖에서 쓰면 즉시 실패한다", () => {
    expect(() => render(<Probe />)).toThrow(/RepositoriesProvider/);
  });
});
