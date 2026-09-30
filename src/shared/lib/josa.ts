/**
 * 앞 단어의 받침에 맞춰 조사를 고른다. "공연을", "모집을", "파티를".
 *
 * 제목처럼 사용자가 쓴 말 뒤에 문장을 붙일 때 쓴다. 마지막 글자가 한글이 아니면
 * (영문, 숫자, 괄호) 받침을 알 수 없어 두 형태를 함께 쓴다 — "VESPER을(를)".
 */
type JosaPair = "을/를" | "이/가" | "은/는" | "과/와";

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

function finalConsonantOf(word: string): boolean | null {
  const last = word.trim().at(-1);
  if (!last) return null;
  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return null;
  return (code - HANGUL_START) % 28 !== 0;
}

/** 단어 뒤에 붙일 조사만 돌려준다. */
export function josa(word: string, pair: JosaPair): string {
  const [withFinal, withoutFinal] = pair.split("/") as [string, string];
  const hasFinal = finalConsonantOf(word);
  if (hasFinal === null) return `${withFinal}(${withoutFinal})`;
  return hasFinal ? withFinal : withoutFinal;
}
