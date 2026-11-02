import { describe, expect, it } from "vitest";
import { createPlayerBinding, readSecret } from "./player-binding";

describe("createPlayerBinding", () => {
  it("연결은 처음 쓴 참가자 id로만 말할 수 있다", () => {
    const binding = createPlayerBinding();
    expect(binding.claim("c1", "p1")).toBe(true);
    expect(binding.claim("c1", "p1")).toBe(true);
    expect(binding.claim("c1", "p2")).toBe(false);
  });

  it("다른 연결이 쓰는 참가자 id는 쓸 수 없다", () => {
    const binding = createPlayerBinding();
    binding.claim("victim", "p1");
    expect(binding.claim("attacker", "p1")).toBe(false);
  });

  it("끊긴 연결의 참가자 id는 새 연결이 다시 쓸 수 있다", () => {
    const binding = createPlayerBinding();
    binding.claim("c1", "p1");
    expect(binding.claim("c2", "p1")).toBe(false);
    expect(binding.release("c1")).toBe("p1");
    expect(binding.claim(undefined, "p1")).toBe(true);
    expect(binding.claim("c2", "p1")).toBe(true);
    expect(binding.release("unknown")).toBeNull();
  });
});

describe("비밀 값으로 넘겨받기", () => {
  const SECRET = "s".repeat(32);

  it("같은 폰(같은 비밀 값)의 새 연결은 옛 연결이 끊기기 전에도 바로 넘겨받는다", () => {
    const binding = createPlayerBinding();
    expect(binding.claim("old", "p1", SECRET)).toBe(true);
    // 네트워크가 바뀌어 새 연결로 왔다. 서버는 아직 옛 연결이 살아 있다고 안다.
    expect(binding.claim("new", "p1", SECRET)).toBe(true);
    // 옛 연결이 나중에 끊겨도 참가자는 나간 것이 아니다.
    expect(binding.release("old")).toBeNull();
    expect(binding.claim("new", "p1", SECRET)).toBe(true);
  });

  it("비밀 값을 모르면 참가자 id를 알아도 가로채지 못한다", () => {
    const binding = createPlayerBinding();
    binding.claim("victim", "p1", SECRET);
    expect(binding.claim("attacker", "p1")).toBe(false);
    expect(binding.claim("attacker", "p1", "x".repeat(32))).toBe(false);
    // 피해자가 끊긴 뒤에도 비밀 값 없이는 그 id를 쓰지 못한다.
    binding.release("victim");
    expect(binding.claim("attacker", "p1")).toBe(false);
    expect(binding.claim("back", "p1", SECRET)).toBe(true);
  });

  it("짧거나 모양이 틀린 비밀 값은 읽지 않는다", () => {
    expect(readSecret({ secret: SECRET })).toBe(SECRET);
    expect(readSecret({ secret: "short" })).toBeUndefined();
    expect(readSecret({ secret: 1 })).toBeUndefined();
    expect(readSecret(null)).toBeUndefined();
  });
});
