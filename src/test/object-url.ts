import { vi } from "vitest";

/**
 * jsdom에는 `URL.createObjectURL`이 없다. blob URL 수명을 확인하려면 대신 세어야 한다.
 *
 * `URL`을 통째로 평범한 객체로 바꾸면 `new URL(...)`이 깨져서 도메인 검증 같은
 * 무관한 코드가 조용히 실패한다. 생성자는 그대로 두고 정적 메서드만 더한다.
 */
export interface ObjectUrlMock {
  created: string[];
  revoked: string[];
}

export function installObjectUrlMock(): ObjectUrlMock {
  const mock: ObjectUrlMock = { created: [], revoked: [] };
  let counter = 0;

  class MockURL extends URL {
    static createObjectURL(): string {
      counter += 1;
      const url = `blob:mock/${counter}`;
      mock.created.push(url);
      return url;
    }

    static revokeObjectURL(url: string): void {
      mock.revoked.push(url);
    }
  }

  vi.stubGlobal("URL", MockURL);
  return mock;
}

/** jsdom은 이미지를 decode하지 못한다. 검증이 크기를 잴 수 있게 대신한다. */
export function installImageDecoderMock(
  size: { width: number; height: number } = { width: 1200, height: 1600 },
): void {
  vi.stubGlobal("createImageBitmap", async () => ({
    ...size,
    close: () => {},
  }));
}
