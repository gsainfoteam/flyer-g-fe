import type { KeyValueStore } from "./key-value-store";

/**
 * IndexedDB 구현. Blob을 그대로 저장할 수 있어 미디어 캐시에 필요하다.
 * localStorage는 문자열만 받고 용량이 작아 포스터 캐시에 쓸 수 없다.
 */
const STORE_NAME = "kv";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 오류"));
  });
}

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB를 열 수 없습니다"));
    request.onblocked = () =>
      reject(new Error("IndexedDB가 다른 탭에 의해 잠겨 있습니다"));
  });
}

export function createIndexedDbStore(databaseName: string): KeyValueStore {
  // 첫 사용 시점에 연다. 실패하면 호출부의 catch로 전파되고 화면은 캐시 없이 돈다.
  // 실패한 시도는 기억하지 않는다. 다른 탭의 잠금처럼 잠깐의 실패로 몇 주 동안
  // 캐시 없이 도는 일이 없도록 다음 사용 때 다시 연다.
  let databasePromise: Promise<IDBDatabase> | null = null;
  const database = () => {
    databasePromise ??= openDatabase(databaseName).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
    return databasePromise;
  };

  const withStore = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const db = await database();
    return requestToPromise(run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)));
  };

  return {
    async get<T>(key: string) {
      const value = await withStore("readonly", (store) => store.get(key));
      return value as T | undefined;
    },
    async set(key, value) {
      await withStore("readwrite", (store) => store.put(value, key));
    },
    async delete(key) {
      await withStore("readwrite", (store) => store.delete(key));
    },
    async keys() {
      const keys = await withStore("readonly", (store) => store.getAllKeys());
      return keys.map(String);
    },
    async clear() {
      await withStore("readwrite", (store) => store.clear());
    },
  };
}

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}
