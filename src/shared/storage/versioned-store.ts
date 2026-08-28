import type { KeyValueStore } from "./key-value-store";

/**
 * schema version이 붙은 저장소.
 *
 * 캐시 구조가 바뀌면 migration 대신 전부 비운다. 캐시는 언제든 다시 채울 수 있는
 * 데이터라 마이그레이션 비용을 질 이유가 없고, 어긋난 구조를 읽다 조용히 깨지는
 * 것이 더 위험하다.
 */
const SCHEMA_KEY = "__schema_version__";

export async function openVersionedStore(
  backing: KeyValueStore,
  schemaVersion: number,
): Promise<KeyValueStore> {
  const stored = await backing.get<number>(SCHEMA_KEY);
  if (stored !== schemaVersion) {
    await backing.clear();
    await backing.set(SCHEMA_KEY, schemaVersion);
  }

  return {
    get: (key) => backing.get(key),
    set: async (key, value) => {
      if (key === SCHEMA_KEY) {
        throw new Error("schema version 키는 직접 쓸 수 없습니다.");
      }
      await backing.set(key, value);
    },
    delete: (key) => backing.delete(key),
    keys: async () =>
      (await backing.keys()).filter((key) => key !== SCHEMA_KEY),
    clear: async () => {
      await backing.clear();
      await backing.set(SCHEMA_KEY, schemaVersion);
    },
  };
}
