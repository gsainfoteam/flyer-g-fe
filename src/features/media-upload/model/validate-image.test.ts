import { describe, expect, it } from "vitest";
import {
  detectImageMimeType,
  matchesSignature,
  validateImageFile,
} from "./validate-image";

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_HEAD = [
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

function makeFile(
  head: number[],
  { type, sizeBytes = 2048, name = "poster.jpg" }: {
    type: string;
    sizeBytes?: number;
    name?: string;
  },
): File {
  const bytes = new Uint8Array(Math.max(sizeBytes, head.length));
  bytes.set(head, 0);
  return new File([bytes], name, { type });
}

const decodeTo = (width: number, height: number) => async () => ({
  width,
  height,
});

const validJpeg = () => makeFile(JPEG_HEAD, { type: "image/jpeg" });
const decodeOk = decodeTo(1200, 1600);

describe("matchesSignature / detectImageMimeType", () => {
  it("JPEG, PNG, WebP 시그니처를 각각 알아본다", () => {
    expect(detectImageMimeType(new Uint8Array(JPEG_HEAD))).toBe("image/jpeg");
    expect(detectImageMimeType(new Uint8Array(PNG_HEAD))).toBe("image/png");
    expect(detectImageMimeType(new Uint8Array(WEBP_HEAD))).toBe("image/webp");
  });

  it("RIFF로 시작해도 WEBP가 아니면 WebP가 아니다", () => {
    const riffWave = [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ];
    expect(matchesSignature(new Uint8Array(riffWave), "image/webp")).toBe(false);
    expect(detectImageMimeType(new Uint8Array(riffWave))).toBeNull();
  });

  it("SVG는 어떤 형식으로도 인식되지 않는다", () => {
    const svgHead = [...'<svg xmlns="'].map((char) => char.charCodeAt(0));
    expect(detectImageMimeType(new Uint8Array(svgHead))).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("허용 형식·용량·해상도를 만족하면 크기를 함께 돌려준다", async () => {
    const result = await validateImageFile(validJpeg(), { decode: decodeOk });
    expect(result).toEqual({
      ok: true,
      mimeType: "image/jpeg",
      width: 1200,
      height: 1600,
      sizeBytes: 2048,
    });
  });

  it("허용하지 않는 MIME은 막는다", async () => {
    const gif = makeFile(JPEG_HEAD, { type: "image/gif", name: "poster.gif" });
    const result = await validateImageFile(gif, { decode: decodeOk });
    expect(result).toMatchObject({ ok: false, code: "UNSUPPORTED_TYPE" });
  });

  it("MIME만 이미지로 바꾼 SVG는 시그니처에서 걸린다", async () => {
    const svgBytes = [...'<svg xmlns="http://www.w3.org/2000/svg">'].map(
      (char) => char.charCodeAt(0),
    );
    const disguised = makeFile(svgBytes, {
      type: "image/png",
      name: "poster.png",
    });
    const result = await validateImageFile(disguised, { decode: decodeOk });
    expect(result).toMatchObject({ ok: false, code: "SIGNATURE_MISMATCH" });
  });

  it("확장자와 실제 형식이 다르면 막는다", async () => {
    const pngClaimingJpeg = makeFile(PNG_HEAD, { type: "image/jpeg" });
    const result = await validateImageFile(pngClaimingJpeg, {
      decode: decodeOk,
    });
    expect(result).toMatchObject({ ok: false, code: "SIGNATURE_MISMATCH" });
  });

  it("10MB를 넘으면 막는다", async () => {
    const tooLarge = makeFile(JPEG_HEAD, {
      type: "image/jpeg",
      sizeBytes: 10 * 1024 * 1024 + 1,
    });
    const result = await validateImageFile(tooLarge, { decode: decodeOk });
    expect(result).toMatchObject({ ok: false, code: "TOO_LARGE" });
  });

  it("한도와 같은 크기는 통과한다", async () => {
    const exact = makeFile(JPEG_HEAD, {
      type: "image/jpeg",
      sizeBytes: 10 * 1024 * 1024,
    });
    const result = await validateImageFile(exact, { decode: decodeOk });
    expect(result.ok).toBe(true);
  });

  it("빈 파일은 막는다", async () => {
    const empty = new File([], "poster.jpg", { type: "image/jpeg" });
    const result = await validateImageFile(empty, { decode: decodeOk });
    expect(result).toMatchObject({ ok: false, code: "EMPTY_FILE" });
  });

  it("짧은 변이 1080px 미만이면 막는다", async () => {
    const result = await validateImageFile(validJpeg(), {
      decode: decodeTo(1079, 4000),
    });
    expect(result).toMatchObject({ ok: false, code: "TOO_SMALL" });
  });

  it("짧은 변이 정확히 1080px이면 통과한다", async () => {
    const result = await validateImageFile(validJpeg(), {
      decode: decodeTo(1080, 1440),
    });
    expect(result.ok).toBe(true);
  });

  it("브라우저가 열지 못하는 파일은 막는다", async () => {
    const result = await validateImageFile(validJpeg(), {
      decode: () => Promise.reject(new Error("decode failed")),
    });
    expect(result).toMatchObject({ ok: false, code: "DECODE_FAILED" });
  });
});
