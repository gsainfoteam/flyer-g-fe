import { describe, expect, it } from "vitest";
import { createPlaybackHistory } from "./playback-history";

describe("재생 이력", () => {
  it("최근 이력만 보관하고 이전·다음 탐색 순서를 유지한다", () => {
    const history = createPlaybackHistory<number>(3);
    for (let n = 1; n <= 4; n++) history.record(n);
    const valid = (n: number) => n;
    expect(history.previous(5, valid)).toBe(4);
    expect(history.previous(4, valid)).toBe(3);
    expect(history.previous(3, valid)).toBe(2);
    expect(history.previous(2, valid)).toBeNull();
    expect(history.next(2, valid)).toBe(3);
    expect(history.next(3, valid)).toBe(4);
    expect(history.next(4, valid)).toBe(5);
    history.clear();
    expect(history.previous(5, valid)).toBeNull();
  });
});
