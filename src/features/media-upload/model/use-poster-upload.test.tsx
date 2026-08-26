import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ServicesContext } from "@/app/providers/services-context";
import type { AppServices } from "@/app/providers/services-context";
import { createFakeUploadService } from "../api/fake-upload-service";
import type { AssetUploadService } from "../api/asset-upload-service";
import { createMockNoticeAdapter } from "@/features/ziggle-notice/api/mock-notices";
import { installObjectUrlMock } from "@/test/object-url";
import type { ObjectUrlMock } from "@/test/object-url";
import { usePosterUpload } from "./use-poster-upload";

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];

function makeFile(name = "poster.jpg", head = JPEG_HEAD): File {
  const bytes = new Uint8Array(2048);
  bytes.set(head, 0);
  return new File([bytes], name, { type: "image/jpeg" });
}

const decodeOk = async () => ({ width: 1200, height: 1600 });

function wrapper(assetUpload: AssetUploadService) {
  const services: AppServices = {
    assetUpload,
    notices: createMockNoticeAdapter(),
  };
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ServicesContext.Provider value={services}>
        {children}
      </ServicesContext.Provider>
    );
  };
}

let objectUrls: ObjectUrlMock;

beforeEach(() => {
  objectUrls = installObjectUrlMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * fake 업로드도 자체적으로 blob URL을 만든다. 테스트에서는 hook이 만든 미리보기
 * URL만 세도록 고정 URL을 주입한다.
 */
const instantUploadService = () =>
  createFakeUploadService({
    tickMs: 0,
    tickCount: 2,
    createObjectUrl: () => "https://example.test/uploaded",
  });

const renderUpload = (service: AssetUploadService) =>
  renderHook(() => usePosterUpload({ validationOptions: { decode: decodeOk } }), {
    wrapper: wrapper(service),
  });

describe("usePosterUpload", () => {
  it("검증을 통과하면 업로드하고 assetId를 준다", async () => {
    const { result } = renderUpload(instantUploadService());

    await act(async () => {
      await result.current.selectFile(makeFile());
    });

    await waitFor(() => expect(result.current.state.status).toBe("uploaded"));
    expect(result.current.state.asset?.assetId).toBeTruthy();
    expect(result.current.state.previewUrl).toBe("blob:mock/1");
    expect(result.current.state.dimensions).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it("검증에 실패하면 업로드하지 않고 blob URL도 만들지 않는다", async () => {
    const upload = vi.fn();
    const { result } = renderUpload({ upload });

    const svgBytes = [...'<svg xmlns="'].map((char) => char.charCodeAt(0));
    await act(async () => {
      await result.current.selectFile(makeFile("poster.jpg", svgBytes));
    });

    expect(result.current.state.status).toBe("invalid");
    expect(result.current.state.invalidCode).toBe("SIGNATURE_MISMATCH");
    expect(upload).not.toHaveBeenCalled();
    expect(objectUrls.created).toHaveLength(0);
  });

  it("업로드가 실패하면 파일을 유지한 채 재시도할 수 있다", async () => {
    let attempts = 0;
    const service: AssetUploadService = {
      upload: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("network down");
        return {
          assetId: "asset-2",
          url: "https://example.test/asset-2",
          width: 1200,
          height: 1600,
          mimeType: "image/jpeg",
          sizeBytes: 2048,
        };
      },
    };

    const { result } = renderUpload(service);
    await act(async () => {
      await result.current.selectFile(makeFile());
    });

    await waitFor(() => expect(result.current.state.status).toBe("failed"));
    // 실패해도 파일과 미리보기는 남는다. 다시 고르지 않아도 된다.
    expect(result.current.state.file).not.toBeNull();
    expect(result.current.state.previewUrl).toBe("blob:mock/1");

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.state.status).toBe("uploaded"));
    expect(result.current.state.asset?.assetId).toBe("asset-2");
    // 재시도는 blob URL을 새로 만들지 않는다.
    expect(objectUrls.created).toHaveLength(1);
  });

  it("파일을 교체하면 이전 blob URL을 해제한다", async () => {
    const { result } = renderUpload(instantUploadService());

    await act(async () => {
      await result.current.selectFile(makeFile("first.jpg"));
    });
    await waitFor(() => expect(result.current.state.status).toBe("uploaded"));

    await act(async () => {
      await result.current.selectFile(makeFile("second.jpg"));
    });
    await waitFor(() => expect(result.current.state.status).toBe("uploaded"));

    expect(objectUrls.revoked).toContain("blob:mock/1");
    expect(result.current.state.previewUrl).toBe("blob:mock/2");
  });

  it("지우면 blob URL을 해제하고 처음 상태로 돌아간다", async () => {
    const { result } = renderUpload(instantUploadService());

    await act(async () => {
      await result.current.selectFile(makeFile());
    });
    await waitFor(() => expect(result.current.state.status).toBe("uploaded"));

    act(() => result.current.clear());

    expect(objectUrls.revoked).toContain("blob:mock/1");
    expect(result.current.state).toMatchObject({
      status: "idle",
      file: null,
      previewUrl: null,
      asset: null,
    });
  });

  it("화면을 떠나면 blob URL을 해제한다", async () => {
    const { result, unmount } = renderUpload(instantUploadService());

    await act(async () => {
      await result.current.selectFile(makeFile());
    });
    await waitFor(() => expect(result.current.state.status).toBe("uploaded"));

    unmount();

    expect(objectUrls.revoked).toContain("blob:mock/1");
  });
});
