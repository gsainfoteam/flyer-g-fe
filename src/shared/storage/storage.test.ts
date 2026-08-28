import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createIndexedDbStore } from "./indexed-db-store";
import { createMemoryStore } from "./key-value-store";
import type { KeyValueStore } from "./key-value-store";
import { openVersionedStore } from "./versioned-store";

/**
 * 저장 경계는 두 구현이 같은 계약을 만족해야 한다. 같은 테스트를 양쪽에 돌린다.
 */
function behavesLikeKeyValueStore(
  name: string,
  create: () => KeyValueStore,
): void {
  describe(name, () => {
    let store: KeyValueStore;
    beforeEach(() => {
      store = create();
    });

    it("저장한 값을 그대로 돌려준다", async () => {
      await store.set("a", { version: "v1", count: 3 });
      expect(await store.get("a")).toEqual({ version: "v1", count: 3 });
    });

    it("없는 키는 undefined다", async () => {
      expect(await store.get("nope")).toBeUndefined();
    });

    it("삭제와 목록이 동작한다", async () => {
      await store.set("a", 1);
      await store.set("b", 2);
      await store.delete("a");
      expect(await store.keys()).toEqual(["b"]);
    });

    it("clear가 전부 비운다", async () => {
      await store.set("a", 1);
      await store.clear();
      expect(await store.keys()).toEqual([]);
    });
  });
}

behavesLikeKeyValueStore("createMemoryStore", () => createMemoryStore());
behavesLikeKeyValueStore("createIndexedDbStore", () => {
  // DB를 매번 새로 만든다. fake-indexeddb는 프로세스 전역이라 격리가 필요하다.
  globalThis.indexedDB = new IDBFactory();
  return createIndexedDbStore("test-db");
});

describe("openVersionedStore", () => {
  it("같은 schema version이면 기존 데이터를 유지한다", async () => {
    const backing = createMemoryStore();
    const first = await openVersionedStore(backing, 1);
    await first.set("playlist", "v1-data");

    const second = await openVersionedStore(backing, 1);
    expect(await second.get("playlist")).toBe("v1-data");
  });

  it("schema version이 바뀌면 전부 비운다", async () => {
    const backing = createMemoryStore();
    const first = await openVersionedStore(backing, 1);
    await first.set("playlist", "old-data");

    const second = await openVersionedStore(backing, 2);
    expect(await second.get("playlist")).toBeUndefined();
  });

  it("keys에 schema 키가 새지 않는다", async () => {
    const backing = createMemoryStore();
    const store = await openVersionedStore(backing, 1);
    await store.set("a", 1);
    expect(await store.keys()).toEqual(["a"]);
  });

  it("clear 후에도 schema version은 유지된다", async () => {
    const backing = createMemoryStore();
    const store = await openVersionedStore(backing, 3);
    await store.set("a", 1);
    await store.clear();

    const reopened = await openVersionedStore(backing, 3);
    await reopened.set("b", 2);
    expect(await reopened.get("b")).toBe(2);
  });
});
