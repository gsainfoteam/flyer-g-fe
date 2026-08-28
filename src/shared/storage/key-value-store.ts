/**
 * 기기 로컬 저장 경계 (명세 FR-PLY-07).
 *
 * 플레이어의 오프라인 캐시가 쓰는 최소 비동기 KV다. 브라우저 API(IndexedDB)를
 * 직접 부르지 않고 이 인터페이스만 쓴다. 테스트는 in-memory 구현을 주입한다.
 *
 * 규칙:
 * - credential, auth header, 개인정보를 저장하지 않는다.
 * - 저장 실패가 화면 렌더링을 중단시키면 안 된다. 호출부가 실패를 삼킬지
 *   결정한다. 이 계층은 실패를 숨기지 않는다.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

/** 테스트·비지원 환경용. 탭이 살아 있는 동안만 유지된다. */
export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
    async keys() {
      return [...map.keys()];
    },
    async clear() {
      map.clear();
    },
  };
}
