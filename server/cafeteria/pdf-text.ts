/**
 * PDF 첫 쪽의 글자와 위치를 뽑는다. 학교 식단표 PDF(글꼴이 든 글자 PDF)만 읽으면 된다.
 *
 * pdf.js는 Cloudflare 무료 요금제의 요청당 CPU 시간(10ms)을 넘기기 쉬워 쓰지 않는다.
 * 식단표에 필요한 만큼만 직접 읽는다:
 * - 압축(FlateDecode)된 스트림을 풀고(플랫폼의 `DecompressionStream`)
 * - 쪽의 글꼴마다 ToUnicode 표로 글리프 번호를 글자로 바꾸고
 * - 내용 스트림의 글자 연산자(Tj·TJ)를 위치 행렬(cm·Tm·Td)과 함께 따라간다.
 * - 칠한 사각형(엑셀 표의 칸 배경)도 모은다. 합친 칸의 범위로 아침·점심·저녁을 가른다.
 * 이미지·선·글자 모양은 보지 않는다.
 */

/** 칠한 사각형(표 칸 배경). 왼쪽 아래 기준(pt) */
export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PdfPage {
  items: TextItem[];
  rects: Rect[];
}

export interface TextItem {
  text: string;
  /** 왼쪽 아래 기준 좌표(pt) */
  x: number;
  y: number;
  /** 글자 크기(pt) */
  size: number;
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

const latin1 = new TextDecoder("latin1");

interface PdfObject {
  dict: string;
  /** 스트림 원본(압축된 그대로). 필요한 것만 풀어 쓴다(글꼴 파일·이미지는 풀지 않는다). */
  raw: Uint8Array | null;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function streamOf(object: PdfObject | null | undefined): Promise<Uint8Array | null> {
  if (!object?.raw) return null;
  return /\/FlateDecode/.test(object.dict) ? inflate(object.raw).catch(() => null) : object.raw;
}

/** "N 0 obj … endobj"를 모두 읽는다. 오브젝트 스트림(ObjStm) 안의 것도 펼친다. */
async function readObjects(bytes: Uint8Array): Promise<Map<number, PdfObject>> {
  const text = latin1.decode(bytes);
  const objects = new Map<number, PdfObject>();
  const pattern = /(\d+)\s+\d+\s+obj\b/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const start = match.index + match[0].length;
    const end = text.indexOf("endobj", start);
    if (end < 0) break;
    const body = text.slice(start, end);
    const streamAt = body.search(/\bstream\r?\n/);
    let raw: Uint8Array | null = null;
    let dict = body;
    if (streamAt >= 0) {
      dict = body.slice(0, streamAt);
      const dataStart = start + streamAt + (body[streamAt + 6] === "\r" ? 8 : 7);
      let dataEnd = text.lastIndexOf("endstream", end);
      while (text[dataEnd - 1] === "\n" || text[dataEnd - 1] === "\r") dataEnd--;
      raw = bytes.subarray(dataStart, dataEnd);
    }
    objects.set(Number(match[1]), { dict, raw });
    pattern.lastIndex = end;
  }

  for (const object of [...objects.values()]) {
    if (!/\/Type\s*\/ObjStm/.test(object.dict)) continue;
    const stream = await streamOf(object);
    if (!stream) continue;
    const content = latin1.decode(stream);
    const count = Number(/\/N\s+(\d+)/.exec(object.dict)?.[1] ?? 0);
    const first = Number(/\/First\s+(\d+)/.exec(object.dict)?.[1] ?? 0);
    const header = content.slice(0, first).trim().split(/\s+/).map(Number);
    for (let index = 0; index < count; index++) {
      const number = header[index * 2]!;
      const offset = first + header[index * 2 + 1]!;
      const next = index + 1 < count ? first + header[index * 2 + 3]! : content.length;
      if (!objects.has(number)) {
        objects.set(number, { dict: content.slice(offset, next), raw: null });
      }
    }
  }
  return objects;
}

const refOf = (dict: string, key: string) => {
  const match = new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`).exec(dict);
  return match ? Number(match[1]) : null;
};

/** ToUnicode 표: 글리프 번호(16진) → 글자 */
function parseCMap(source: string): Map<number, string> {
  const map = new Map<number, string>();
  const hexText = (hex: string) => {
    let out = "";
    for (let index = 0; index + 4 <= hex.length; index += 4) {
      out += String.fromCharCode(parseInt(hex.slice(index, index + 4), 16));
    }
    return out;
  };
  for (const block of source.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, code, value] of block[1]!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      map.set(parseInt(code!, 16), hexText(value!));
    }
  }
  for (const block of source.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const pattern = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]*)\])/g;
    for (const [, low, high, start, list] of block[1]!.matchAll(pattern)) {
      const from = parseInt(low!, 16);
      const to = parseInt(high!, 16);
      if (start !== undefined) {
        const base = parseInt(start, 16);
        for (let code = from; code <= to; code++) map.set(code, String.fromCharCode(base + code - from));
      } else {
        const values = [...list!.matchAll(/<([0-9a-fA-F]+)>/g)].map((item) => hexText(item[1]!));
        values.forEach((value, index) => map.set(from + index, value));
      }
    }
  }
  return map;
}

interface Font {
  /** 2바이트 글리프 번호를 쓰는 글꼴(Identity-H) */
  wide: boolean;
  unicode: Map<number, string> | null;
}

function decodeString(bytes: number[], font: Font | undefined): string {
  if (!font) return String.fromCharCode(...bytes);
  if (font.wide) {
    let out = "";
    for (let index = 0; index + 1 < bytes.length; index += 2) {
      const code = (bytes[index]! << 8) | bytes[index + 1]!;
      out += font.unicode?.get(code) ?? "";
    }
    return out;
  }
  return bytes.map((code) => font.unicode?.get(code) ?? String.fromCharCode(code)).join("");
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "string"; value: number[] }
  | { kind: "array"; value: Token[] }
  | { kind: "op"; value: string };

const isSpace = (code: number) =>
  code === 32 || code === 10 || code === 13 || code === 9 || code === 12 || code === 0;
/** 이름·연산자를 끊는 구분 문자: 공백 ( ) < > [ ] { } / % */
const isDelimiter = (code: number) =>
  isSpace(code) ||
  code === 40 || code === 41 || code === 60 || code === 62 || code === 91 ||
  code === 93 || code === 123 || code === 125 || code === 47 || code === 37;
const isDigit = (code: number) => code >= 48 && code <= 57;

/** 내용 스트림을 토큰으로. 사전(<< >>)은 건너뛴다(글자와 무관한 표시 정보). */
function* tokenize(source: string): Generator<Token> {
  const stack: Token[][] = [];
  const length = source.length;
  let index = 0;
  const emit = function* (token: Token): Generator<Token> {
    if (stack.length > 0) stack[stack.length - 1]!.push(token);
    else yield token;
  };
  const wordEnd = (from: number) => {
    let end = from;
    while (end < length && !isDelimiter(source.charCodeAt(end))) end++;
    return end;
  };
  while (index < length) {
    const code = source.charCodeAt(index);
    if (isSpace(code)) {
      index++;
    } else if (code === 37 /* % */) {
      while (index < length && source[index] !== "\n" && source[index] !== "\r") index++;
    } else if (code === 40 /* ( */) {
      const bytes: number[] = [];
      let depth = 1;
      index++;
      while (index < length && depth > 0) {
        const current = source.charCodeAt(index);
        if (current === 92 /* \\ */) {
          const next = source[index + 1]!;
          const escapes: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12 };
          if (next >= "0" && next <= "7") {
            let end = index + 1;
            while (end < index + 4 && source[end]! >= "0" && source[end]! <= "7") end++;
            bytes.push(parseInt(source.slice(index + 1, end), 8));
            index = end;
            continue;
          }
          if (next === "\r" || next === "\n") {
            index += next === "\r" && source[index + 2] === "\n" ? 3 : 2;
            continue;
          }
          bytes.push(escapes[next] ?? next.charCodeAt(0));
          index += 2;
          continue;
        }
        if (current === 40) depth++;
        if (current === 41 && --depth === 0) break;
        bytes.push(current);
        index++;
      }
      index++;
      yield* emit({ kind: "string", value: bytes });
    } else if (code === 60 /* < */ && source.charCodeAt(index + 1) === 60) {
      let depth = 0;
      while (index < length) {
        if (source.startsWith("<<", index)) {
          depth++;
          index += 2;
        } else if (source.startsWith(">>", index)) {
          depth--;
          index += 2;
          if (depth === 0) break;
        } else index++;
      }
    } else if (code === 60) {
      const end = source.indexOf(">", index);
      const bytes: number[] = [];
      let high = -1;
      for (let at = index + 1; at < end; at++) {
        const value = parseInt(source[at]!, 16);
        if (Number.isNaN(value)) continue;
        if (high < 0) high = value;
        else {
          bytes.push(high * 16 + value);
          high = -1;
        }
      }
      if (high >= 0) bytes.push(high * 16);
      index = end + 1;
      yield* emit({ kind: "string", value: bytes });
    } else if (code === 91 /* [ */) {
      stack.push([]);
      index++;
    } else if (code === 93 /* ] */) {
      const items = stack.pop() ?? [];
      index++;
      yield* emit({ kind: "array", value: items });
    } else if (code === 47 /* / */) {
      const end = wordEnd(index + 1);
      yield* emit({ kind: "name", value: source.slice(index + 1, end) });
      index = end;
    } else if (isDigit(code) || code === 45 || code === 43 || code === 46 /* - + . */) {
      let end = index + 1;
      while (end < length) {
        const next = source.charCodeAt(end);
        if (!isDigit(next) && next !== 46) break;
        end++;
      }
      const value = Number(source.slice(index, end));
      index = end;
      if (!Number.isNaN(value)) yield* emit({ kind: "number", value });
    } else {
      const end = Math.max(wordEnd(index), index + 1);
      const word = source.slice(index, end);
      index = end;
      if (word === "ID") {
        // 인라인 이미지 자료는 EI까지 건너뛴다.
        const close = source.indexOf("EI", index);
        index = close < 0 ? length : close + 2;
        continue;
      }
      yield* emit({ kind: "op", value: word });
    }
  }
}

/** 첫 쪽의 글자 조각과 칠한 사각형. 글자 연산자(Tj·TJ) 하나가 조각 하나다. */
export async function readPdfPage(bytes: Uint8Array): Promise<PdfPage> {
  const objects = await readObjects(bytes);
  const page = [...objects.values()].find((object) => /\/Type\s*\/Page(?!s)/.test(object.dict));
  if (!page) return { items: [], rects: [] };

  const resolve = (dict: string, key: string) => {
    const ref = refOf(dict, key);
    return ref === null ? null : (objects.get(ref) ?? null);
  };

  // 쪽 → 자원 → 글꼴 이름(/F1)과 글꼴 오브젝트
  const resources = resolve(page.dict, "Resources")?.dict ?? page.dict;
  const fontDict =
    /\/Font\s*<<([\s\S]*?)>>/.exec(resources)?.[1] ?? resolve(resources, "Font")?.dict ?? "";
  const fonts = new Map<string, Font>();
  for (const [, name, ref] of fontDict.matchAll(/\/([^\s/<>]+)\s+(\d+)\s+\d+\s+R/g)) {
    const object = objects.get(Number(ref));
    if (!object) continue;
    const cmap = await streamOf(resolve(object.dict, "ToUnicode"));
    fonts.set(name!, {
      wide: /\/Identity-H/.test(object.dict),
      unicode: cmap ? parseCMap(latin1.decode(cmap)) : null,
    });
  }

  // 내용 스트림은 하나이거나 배열이다.
  const contents = /\/Contents\s*\[([^\]]*)\]/.exec(page.dict)?.[1];
  const contentRefs = contents
    ? [...contents.matchAll(/(\d+)\s+\d+\s+R/g)].map((match) => Number(match[1]))
    : [refOf(page.dict, "Contents")].filter((ref): ref is number => ref !== null);
  const streams = await Promise.all(contentRefs.map((ref) => streamOf(objects.get(ref))));
  const source = streams
    .filter((stream): stream is Uint8Array => !!stream)
    .map((stream) => latin1.decode(stream))
    .join("\n");

  const items: TextItem[] = [];
  const rects: Rect[] = [];
  /** 지금 그리는 도형의 점들(기기 좌표) */
  let path: [number, number][] = [];
  const operands: Token[] = [];
  const states: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let font: Font | undefined;
  let fontSize = 1;
  let leading = 0;
  /** 마지막 조각 뒤로 위치가 바뀌지 않았으면 이어 붙인다(같은 줄을 여러 번에 나눠 쓴 경우). */
  let moved = true;

  const num = (index: number) => {
    const token = operands[index];
    return token?.kind === "number" ? token.value : 0;
  };
  const moveTo = (tx: number, ty: number) => {
    tlm = multiply([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
    moved = true;
  };
  const point = (x: number, y: number): [number, number] => [
    x * ctm[0] + y * ctm[2] + ctm[4],
    x * ctm[1] + y * ctm[3] + ctm[5],
  ];
  /** 칠한 도형이 사각형이면 모은다. 점 네 개(닫는 점 포함 다섯)로 된 축 정렬 도형만 본다. */
  const fillPath = () => {
    if (path.length >= 4 && path.length <= 5) {
      const xs = path.map(([x]) => x);
      const ys = path.map(([, y]) => y);
      const axisAligned = path.every(
        ([x, y]) =>
          (Math.abs(x - Math.min(...xs)) < 0.5 || Math.abs(x - Math.max(...xs)) < 0.5) &&
          (Math.abs(y - Math.min(...ys)) < 0.5 || Math.abs(y - Math.max(...ys)) < 0.5),
      );
      if (axisAligned) {
        rects.push({ x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) });
      }
    }
    path = [];
  };
  const show = (text: string) => {
    if (!text) return;
    const last = items[items.length - 1];
    if (!moved && last) {
      last.text += text;
      return;
    }
    const position = multiply(tm, ctm);
    items.push({
      text,
      x: position[4],
      y: position[5],
      size: Math.abs(fontSize * Math.hypot(position[2], position[3])),
    });
    moved = false;
  };

  for (const token of tokenize(source)) {
    if (token.kind !== "op") {
      operands.push(token);
      continue;
    }
    switch (token.value) {
      case "q":
        states.push(ctm);
        break;
      case "Q":
        ctm = states.pop() ?? IDENTITY;
        moved = true;
        break;
      case "cm":
        ctm = multiply([num(0), num(1), num(2), num(3), num(4), num(5)], ctm);
        moved = true;
        break;
      case "m":
        path = [point(num(0), num(1))];
        break;
      case "l":
        path.push(point(num(0), num(1)));
        break;
      case "re": {
        const [x, y, width, height] = [num(0), num(1), num(2), num(3)];
        path = [point(x, y), point(x + width, y), point(x + width, y + height), point(x, y + height)];
        break;
      }
      case "f":
      case "F":
      case "f*":
      case "B":
      case "B*":
      case "b":
      case "b*":
        fillPath();
        break;
      case "n":
      case "S":
      case "s":
        path = [];
        break;
      case "BT":
        tm = tlm = IDENTITY;
        moved = true;
        break;
      case "Tf": {
        const name = operands[0];
        font = name?.kind === "name" ? fonts.get(name.value) : undefined;
        fontSize = num(1);
        break;
      }
      case "TL":
        leading = num(0);
        break;
      case "Tm":
        tm = tlm = [num(0), num(1), num(2), num(3), num(4), num(5)];
        moved = true;
        break;
      case "Td":
        moveTo(num(0), num(1));
        break;
      case "TD":
        leading = -num(1);
        moveTo(num(0), num(1));
        break;
      case "T*":
        moveTo(0, -leading);
        break;
      case "Tj":
      case "'":
      case '"': {
        if (token.value !== "Tj") moveTo(0, -leading);
        const string = operands[operands.length - 1];
        if (string?.kind === "string") show(decodeString(string.value, font));
        break;
      }
      case "TJ": {
        const array = operands[0];
        if (array?.kind !== "array") break;
        let text = "";
        for (const part of array.value) {
          if (part.kind === "string") text += decodeString(part.value, font);
          // 큰 음수 간격은 띄어쓰기다.
          else if (part.kind === "number" && part.value < -250) text += " ";
        }
        show(text);
        break;
      }
    }
    operands.length = 0;
  }
  return {
    items: items
      .map((item) => ({ ...item, text: item.text.replace(/\s+/g, " ").trim() }))
      .filter((item) => item.text),
    rects,
  };
}
