import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "@/shared/lib/utils";

/**
 * 토큰 시트의 규칙을 정적으로 지킨다.
 *
 * shadcn은 `--accent`를 hover 배경 역할로 쓴다. 이 제품에서 accent는 강조색이라
 * 이름이 겹치면 `bg-accent`가 회색으로 렌더링된다. 실제로 겪은 회귀라 고정한다.
 */
const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

function themeBlock(header: string): string {
  const start = css.indexOf(header);
  if (start === -1) throw new Error(`${header} 블록을 찾지 못했습니다`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open, i);
    }
  }
  throw new Error(`${header} 블록이 닫히지 않았습니다`);
}

describe("디자인 토큰 시트", () => {
  it("강조색은 디자인 시스템의 단일 accent 값이다", () => {
    expect(themeBlock("@theme {")).toContain("--color-accent: #ec3013;");
  });

  it("shadcn 매핑이 강조색 이름을 덮어쓰지 않는다", () => {
    const inline = themeBlock("@theme inline {");
    expect(inline).not.toMatch(/--color-accent\s*:/);
    expect(inline).toContain("--color-ui-accent:");
  });

  it("본문 글자색과 배경이 토큰으로 정의되어 있다", () => {
    const theme = themeBlock("@theme {");
    for (const token of [
      "--color-canvas",
      "--color-surface",
      "--color-ink",
      "--color-ink-muted",
      "--color-ink-subtle",
    ]) {
      expect(theme).toContain(`${token}:`);
    }
  });

  const typeSteps = [
    ...themeBlock("@theme {").matchAll(/--text-([a-z]+):/g),
  ].map(([, step]) => step);

  it("타입 스케일의 모든 단계가 크기와 굵기를 함께 정의한다", () => {
    const theme = themeBlock("@theme {");
    expect(typeSteps.length).toBeGreaterThan(0);
    for (const step of typeSteps) {
      expect(theme).toContain(`--text-${step}--font-weight:`);
    }
  });

  it("cn이 타입 스케일을 글자색과 충돌하는 class로 보고 지우지 않는다", () => {
    // tailwind-merge는 모르는 text-* 를 색으로 본다. utils.ts에 등록해야 한다.
    for (const step of typeSteps) {
      expect(cn(`text-${step}`, "text-ink")).toBe(`text-${step} text-ink`);
    }
  });
});
