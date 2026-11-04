import { describe, expect, it } from "vitest";
import { matchesVideoSignature, validateVideoFile } from "./validate-video";

/** `....ftypisom` — MP4의 첫 상자 */
const MP4_HEAD = [
  0,
  0,
  0,
  0x18,
  ...[..."ftypisom"].map((c) => c.charCodeAt(0)),
];
const WEBM_HEAD = [0x1a, 0x45, 0xdf, 0xa3];

function makeVideo(
  head: number[],
  {
    type = "video/mp4",
    sizeBytes = 2048,
  }: { type?: string; sizeBytes?: number } = {},
): File {
  const bytes = new Uint8Array(Math.max(sizeBytes, head.length));
  bytes.set(head, 0);
  return new File([bytes], "clip.mp4", { type });
}

const probeTo = (durationMs: number) => async () => ({
  width: 1080,
  height: 1920,
  durationMs,
});

describe("matchesVideoSignature", () => {
  it("MP4·MOV는 첫 상자 이름, WebM은 EBML 머리로 알아본다", () => {
    expect(matchesVideoSignature(new Uint8Array(MP4_HEAD), "video/mp4")).toBe(
      true,
    );
    expect(
      matchesVideoSignature(new Uint8Array(MP4_HEAD), "video/quicktime"),
    ).toBe(true);
    expect(matchesVideoSignature(new Uint8Array(WEBM_HEAD), "video/webm")).toBe(
      true,
    );
    expect(matchesVideoSignature(new Uint8Array(WEBM_HEAD), "video/mp4")).toBe(
      false,
    );
  });
});

describe("validateVideoFile", () => {
  it("형식·용량·길이를 만족하면 크기와 길이를 돌려준다", async () => {
    await expect(
      validateVideoFile(makeVideo(MP4_HEAD), { probe: probeTo(15_000) }),
    ).resolves.toEqual({
      ok: true,
      mimeType: "video/mp4",
      width: 1080,
      height: 1920,
      durationMs: 15_000,
      sizeBytes: 2048,
    });
  });

  it("길이 상한을 넘기면 막는다", async () => {
    const result = await validateVideoFile(makeVideo(MP4_HEAD), {
      probe: probeTo(31_200),
      maxDurationSeconds: 30,
    });
    expect(result).toMatchObject({ ok: false, code: "TOO_LONG" });
    expect(!result.ok && result.message).toContain("30초까지");
  });

  it("용량 상한을 넘기면 열어 보지 않고 막는다", async () => {
    await expect(
      validateVideoFile(makeVideo(MP4_HEAD, { sizeBytes: 4096 }), {
        maxSizeBytes: 2048,
        probe: probeTo(1_000),
      }),
    ).resolves.toMatchObject({ ok: false, code: "TOO_LARGE" });
  });

  it("내용이 형식과 맞지 않으면 막는다", async () => {
    await expect(
      validateVideoFile(makeVideo(WEBM_HEAD), { probe: probeTo(1_000) }),
    ).resolves.toMatchObject({ ok: false, code: "SIGNATURE_MISMATCH" });
  });

  it("브라우저가 못 여는 영상(HEVC 등)은 막지 않고 서버 검사에 맡긴다", async () => {
    await expect(
      validateVideoFile(makeVideo(MP4_HEAD, { type: "video/quicktime" }), {
        probe: async () => null,
      }),
    ).resolves.toMatchObject({
      ok: true,
      width: 0,
      height: 0,
      durationMs: null,
    });
  });
});
