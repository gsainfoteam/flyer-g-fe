import { parseMenuPage } from "./parse-menu";
import type { MenuDay } from "./parse-menu";
import { readPdfPage } from "./pdf-text";

/**
 * 학교 홈페이지 학식 게시판에서 이번 주 식단을 읽는다.
 *
 * Ziggle 공지 크롤러(`ziggle-be/apps/crawler`)와 같은 게시판 구조다.
 *   목록(`…/05060N.html`) → 최신 글(`?mode=V&no=…`) → 글 본문의 PDF 뷰어가 쓰는 주소
 *   (`/_prog/download/?…&bbsPdfViewer=Y`)로 첨부 PDF를 받는다.
 * 첨부의 일반 내려받기 링크(`?mode=D…`)는 오류 페이지로 넘어가서 쓰지 않는다.
 */

const ORIGIN = "https://www.gist.ac.kr";

export const CAFETERIAS = [
  { code: "050601", place: "제1학생식당" },
  { code: "050602", place: "제2학생식당" },
] as const;

export interface CafeteriaWeek {
  place: string;
  /** 게시글 제목. 예: "2026년10월5주 (10월26일-10월30일)" */
  title: string;
  days: MenuDay[];
}

/** 목록의 식단 글. 최신 글이 먼저 나온다. */
export function listPosts(listHtml: string): { no: string; title: string }[] {
  const pattern =
    /<div class='bd_item_box'>\s*<a href='\?mode=V&amp;no=(\d+)'>[\s\S]*?<h2><span>([^<]*)<\/span><\/h2>/g;
  return [...listHtml.matchAll(pattern)].map((match) => ({
    no: match[1]!,
    title: match[2]!.trim(),
  }));
}

/** 서울 날짜 "2026-11-01" */
const seoulDate = (now: Date) =>
  new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** 글 본문에서 첨부 PDF 파일 이름(PDF 뷰어 주소의 fileId) */
export function pdfFileName(postHtml: string): string | null {
  return /fileId=([\w.-]+\.pdf)/i.exec(postHtml)?.[1] ?? null;
}

export function pdfUrl(code: string, fileName: string): string {
  const query = new URLSearchParams({
    code,
    site_dvs_cd: "kr",
    file: fileName,
    bbsPdfViewer: "Y",
  });
  return `${ORIGIN}/_prog/download/?${query}`;
}

async function get(url: string, fetchImpl: typeof fetch): Promise<Response> {
  // Ziggle 크롤러처럼 빈 User-Agent로 부른다.
  const response = await fetchImpl(url, { headers: { "User-Agent": "" } });
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return response;
}

async function readPost(
  cafeteria: (typeof CAFETERIAS)[number],
  listUrl: string,
  post: { no: string; title: string },
  now: Date,
  fetchImpl: typeof fetch,
): Promise<MenuDay[]> {
  const postHtml = await (await get(`${listUrl}?mode=V&no=${post.no}`, fetchImpl)).text();
  const fileName = pdfFileName(postHtml);
  if (!fileName) throw new Error(`${cafeteria.place}: PDF 첨부가 없음`);
  const pdf = new Uint8Array(
    await (await get(pdfUrl(cafeteria.code, fileName), fetchImpl)).arrayBuffer(),
  );
  const days = parseMenuPage(await readPdfPage(pdf), now);
  if (days.every((day) => day.meals.length === 0)) {
    throw new Error(`${cafeteria.place}: 식단표를 읽지 못함`);
  }
  return days;
}

/**
 * 오늘이 든 주의 식단. 다음 주 식단을 주말 전에 미리 올리는 식당이 있어(제2학생식당은
 * 금요일), 최신 글이 오늘보다 뒤에 시작하면 바로 앞 글까지 본다. 두 글의 날짜는 합친다.
 * 주말에 쉬는 식당처럼 최신 글이 이미 지난 주면 앞 글은 보지 않는다(PDF를 한 번 더
 * 읽는 CPU 시간을 아낀다).
 */
export async function fetchCafeteriaWeek(
  cafeteria: (typeof CAFETERIAS)[number],
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<CafeteriaWeek> {
  const listUrl = `${ORIGIN}/kr/html/sub05/${cafeteria.code}.html`;
  const [latest, previous] = listPosts(await (await get(listUrl, fetchImpl)).text());
  if (!latest) throw new Error(`${cafeteria.place}: 식단 글을 찾지 못함`);
  const today = seoulDate(now);

  const days = await readPost(cafeteria, listUrl, latest, now, fetchImpl);
  const startsLater = days.length > 0 && days.every((day) => day.date > today);
  if (!startsLater || !previous) {
    return { place: cafeteria.place, title: latest.title, days };
  }
  const earlier = await readPost(cafeteria, listUrl, previous, now, fetchImpl).catch(() => []);
  const seen = new Set(days.map((day) => day.date));
  return {
    place: cafeteria.place,
    title: earlier.some((day) => day.date === today) ? previous.title : latest.title,
    days: [...earlier.filter((day) => !seen.has(day.date)), ...days],
  };
}
