import type { components } from "./generated/schema";

/**
 * 백엔드 계약의 요청 본문 타입 (`bun run api:sync`로 만든 `generated/schema.d.ts`).
 *
 * 요청 본문은 `satisfies ApiRequestBody<"...">`로 이 타입에 맞춘다. 백엔드가 필드를
 * 바꾸거나 필수로 만들면 `api:sync` 뒤에 컴파일 오류로 드러난다.
 *
 * 응답은 이 타입으로 믿지 않는다. `unknown`으로 받아 `parse.ts`로 검증한다. 타입이
 * 맞아도 실제 값이 그 모양이라는 보장은 아니기 때문이다.
 */
type Schemas = components["schemas"];

export type ApiRequestBody<Name extends keyof Schemas> = Schemas[Name];
