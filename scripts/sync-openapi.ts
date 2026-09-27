/**
 * 백엔드 Swagger 문서를 받아 계약 스냅샷과 TypeScript 타입을 만든다.
 *
 *   bun run api:sync
 *
 * - `src/shared/api/generated/openapi.json`: 받은 문서 그대로. 백엔드 계약이 바뀌면
 *   이 파일의 diff로 무엇이 달라졌는지 본다.
 * - `src/shared/api/generated/schema.d.ts`: 위 문서로 만든 타입. HTTP 구현의 요청
 *   본문이 `ApiRequestBody`(`src/shared/api/contract.ts`)로 이 타입에 맞춘다. 응답은
 *   믿지 않고 런타임에 검증한다. 손으로 고치지 않는다.
 *
 * 환경 변수 (bun이 `.env`를 읽는다)
 * - `OPENAPI_URL`: 문서 주소. 없으면 `${VITE_API_BASE_URL}/docs-json`
 * - `OPENAPI_BASIC_AUTH`: Swagger 보호용 `아이디:비밀번호`. 없으면 인증 없이 받는다
 *
 * `VITE_` 접두사가 없어 번들에 들어가지 않는다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const OUT_DIR = new URL("../src/shared/api/generated/", import.meta.url);

function resolveUrl(): string {
  const explicit = process.env.OPENAPI_URL?.trim();
  if (explicit) return explicit;
  const base = process.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("OPENAPI_URL 또는 VITE_API_BASE_URL이 필요합니다.");
  }
  return `${base}/docs-json`;
}

async function main() {
  const url = resolveUrl();
  const headers: Record<string, string> = { Accept: "application/json" };
  const basic = process.env.OPENAPI_BASIC_AUTH?.trim();
  if (basic) headers.Authorization = `Basic ${btoa(basic)}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `OpenAPI 문서를 받지 못했습니다: ${response.status} ${url}`,
    );
  }
  const document = (await response.json()) as Record<string, unknown>;

  const ast = await openapiTS(document as never, {
    // 선택 필드와 null 허용을 서버 문서 그대로 구분한다.
    defaultNonNullable: false,
  });
  const banner =
    "/* 자동 생성 파일. 직접 고치지 않는다. `bun run api:sync`로 다시 만든다. */\n\n";

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    new URL("openapi.json", OUT_DIR),
    `${JSON.stringify(document, null, 2)}\n`,
  );
  await writeFile(new URL("schema.d.ts", OUT_DIR), banner + astToString(ast));

  const paths = Object.keys((document.paths as object | undefined) ?? {});
  console.log(`OpenAPI 동기화 완료: ${paths.length}개 경로 (${url})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
