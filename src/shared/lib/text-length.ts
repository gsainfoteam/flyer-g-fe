/**
 * 서버 입력 검증(class-validator `MaxLength`, validator.js `isLength`)과 같은 방식으로
 * 센 글자 수.
 *
 * UTF-16 코드 단위(`String.length`)가 아니다. 서로게이트 쌍(이모지 등)과 이모지
 * 표현 선택자(U+FE0E·U+FE0F)가 붙은 글자는 한 글자로 센다. 폼이 서버보다 엄격하면
 * 서버가 받는 이름도 저장하지 못한다.
 */
export function serverTextLength(text: string): number {
  const presentationSequences =
    text.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g)?.length ?? 0;
  const surrogatePairs =
    text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0;
  return text.length - presentationSequences - surrogatePairs;
}
