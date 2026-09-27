import { describe, expect, it, vi } from "vitest";
import {
  captureDeviceTokenFromUrl,
  createDeviceCredentials,
} from "./device-credential";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe("기기 토큰", () => {
  it("기기마다 따로 저장한다", () => {
    const credentials = createDeviceCredentials(memoryStorage());
    credentials.save("dev_a", "fgd_a");
    credentials.save("dev_b", "fgd_b");

    expect(credentials.get("dev_a")).toBe("fgd_a");
    expect(credentials.get("dev_b")).toBe("fgd_b");
    credentials.clear("dev_a");
    expect(credentials.get("dev_a")).toBeNull();
  });

  it("설정 링크의 #token=을 저장하고 주소에서 지운다", () => {
    const credentials = createDeviceCredentials(memoryStorage());
    const replaceState = vi.fn();

    const captured = captureDeviceTokenFromUrl(
      "dev_01",
      credentials,
      {
        pathname: "/display/dev_01",
        search: "?preview=1",
        hash: "#token=fgd_secret",
      },
      { replaceState, state: { idx: 0 } },
    );

    expect(captured).toBe(true);
    expect(credentials.get("dev_01")).toBe("fgd_secret");
    expect(replaceState).toHaveBeenCalledWith(
      { idx: 0 },
      "",
      "/display/dev_01?preview=1",
    );
  });

  it("토큰이 없는 주소는 건드리지 않는다", () => {
    const replaceState = vi.fn();
    expect(
      captureDeviceTokenFromUrl(
        "dev_01",
        createDeviceCredentials(memoryStorage()),
        { pathname: "/display/dev_01", search: "", hash: "" },
        { replaceState, state: null },
      ),
    ).toBe(false);
    expect(replaceState).not.toHaveBeenCalled();
  });
});
