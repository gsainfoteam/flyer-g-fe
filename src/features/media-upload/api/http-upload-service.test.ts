import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/error";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import {
  createHttpUploadService,
  xhrUploadTransport,
} from "./http-upload-service";
import type { UploadTransport } from "./http-upload-service";

const PRESIGNED = {
  assetId: "asset_01",
  uploadUrl: "https://bucket.s3.example/upload?signature=abc",
  method: "PUT",
  headers: { "Content-Type": "image/jpeg" },
  expiresAt: "2026-09-27T09:15:00.000Z",
};

const COMPLETED = {
  assetId: "asset_01",
  url: "https://cdn.example/asset_01/preview.webp",
  mimeType: "image/jpeg",
  width: 1536,
  height: 2048,
  sizeBytes: 4,
  checksum: "sha256:ab",
  moderationStatus: "APPROVED",
  variants: {
    thumb: "https://cdn.example/asset_01/thumb.webp",
    preview: "https://cdn.example/asset_01/preview.webp",
    tv: "https://cdn.example/asset_01/tv.webp",
  },
};

const file = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "poster.jpg", {
    type: "image/jpeg",
  });

function setup(overrides: Partial<Record<string, () => unknown>> = {}) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (request: HttpRequest) => {
      calls.push(request);
      const handler =
        overrides[request.path] ??
        {
          "/signage/assets/presign": () => PRESIGNED,
          "/signage/assets/asset_01/complete": () => COMPLETED,
        }[request.path];
      if (!handler) throw new Error(request.path);
      return handler();
    }) as HttpClient["request"],
  };
  const put = vi.fn<UploadTransport["put"]>(
    async (_url, _file, _headers, options) => {
      options.onProgress(0.5);
      options.onProgress(1);
    },
  );
  const service = createHttpUploadService({
    client,
    transport: { put },
    digest: async () => "a".repeat(64),
  });
  return { service, calls, put };
}

describe("createHttpUploadService", () => {
  it("presign → 저장소에 직접 PUT → complete 순서로 올리고 미리보기 URL을 준다", async () => {
    const { service, calls, put } = setup();
    const progress: number[] = [];

    const asset = await service.upload(file(), {
      onProgress: (ratio) => progress.push(ratio),
    });

    expect(asset).toEqual({
      assetId: "asset_01",
      url: "https://cdn.example/asset_01/preview.webp",
      width: 1536,
      height: 2048,
      mimeType: "image/jpeg",
      sizeBytes: 4,
    });
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/signage/assets/presign",
      body: {
        fileName: "poster.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 4,
        checksum: `sha256:${"a".repeat(64)}`,
      },
    });
    // 서명에 Content-Type이 들어 있어 presign이 준 헤더를 그대로 싣는다.
    expect(put).toHaveBeenCalledWith(
      PRESIGNED.uploadUrl,
      expect.any(File),
      { "Content-Type": "image/jpeg" },
      expect.anything(),
    );
    // 서버가 이미지를 처리하는 동안 기본 제한 시간보다 오래 기다린다.
    expect(calls[1]).toMatchObject({
      method: "POST",
      path: "/signage/assets/asset_01/complete",
      timeoutMs: 60_000,
    });
    // 전송은 90%까지, 나머지는 서버 처리다.
    expect(progress).toEqual([0, 0.45, 0.9, 1]);
  });

  it("서버가 이미지를 거절하면 사유가 담긴 오류를 그대로 던진다", async () => {
    const rejection = new ApiError({
      kind: "http",
      code: "VALIDATION_FAILED",
      message: "rejected",
      status: 422,
      fields: { file: "짧은 변이 1080px 이상이어야 합니다. (현재 800px)" },
    });
    const { service } = setup({
      "/signage/assets/asset_01/complete": () => {
        throw rejection;
      },
    });

    await expect(service.upload(file())).rejects.toBe(rejection);
  });

  it("취소하면 저장소 전송도 멈춘다", async () => {
    const { service, put } = setup();
    const controller = new AbortController();
    put.mockImplementationOnce(async (_url, _file, _headers, options) => {
      controller.abort();
      if (options.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    });

    await expect(
      service.upload(file(), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("xhrUploadTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** XHR의 필요한 부분만 흉내 낸다. 보낸 헤더와 본문을 기록한다. */
  class FakeXhr {
    static last: FakeXhr;
    method = "";
    url = "";
    headers: Record<string, string> = {};
    body: unknown;
    status = 0;
    upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
      onprogress: null,
    };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    constructor() {
      FakeXhr.last = this;
    }
    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value;
    }
    send(body: unknown) {
      this.body = body;
    }
    abort() {
      this.onabort?.();
    }
    respond(status: number) {
      this.status = status;
      this.onload?.();
    }
  }

  it("presign 헤더로 PUT하고 진행률을 알린다. 브라우저가 정하는 헤더는 싣지 않는다", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const progress: number[] = [];
    const body = file();

    const done = xhrUploadTransport.put(
      "https://bucket.s3.example/upload",
      body,
      { "Content-Type": "image/jpeg", "Content-Length": "4" },
      { onProgress: (ratio) => progress.push(ratio) },
    );
    const xhr = FakeXhr.last;
    xhr.upload.onprogress?.({
      lengthComputable: true,
      loaded: 2,
      total: 4,
    } as ProgressEvent);
    xhr.respond(200);
    await done;

    expect(xhr.method).toBe("PUT");
    expect(xhr.headers).toEqual({ "Content-Type": "image/jpeg" });
    expect(xhr.body).toBe(body);
    expect(progress).toEqual([0.5]);
  });

  it("저장소가 거절하면(서명 불일치 403) 업로드 실패로 알린다", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const done = xhrUploadTransport.put(
      "https://bucket",
      file(),
      {},
      {
        onProgress: () => {},
      },
    );
    FakeXhr.last.respond(403);

    await expect(done).rejects.toMatchObject({
      code: "UPLOAD_FAILED",
      status: 403,
    });
  });

  it("연결이 끊기면 네트워크 오류, 취소하면 AbortError다", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const failed = xhrUploadTransport.put(
      "https://bucket",
      file(),
      {},
      {
        onProgress: () => {},
      },
    );
    FakeXhr.last.onerror?.();
    await expect(failed).rejects.toMatchObject({
      code: "UPLOAD_FAILED",
      kind: "network",
    });

    const controller = new AbortController();
    const canceled = xhrUploadTransport.put(
      "https://bucket",
      file(),
      {},
      {
        onProgress: () => {},
        signal: controller.signal,
      },
    );
    controller.abort();
    await expect(canceled).rejects.toMatchObject({ name: "AbortError" });
  });
});
