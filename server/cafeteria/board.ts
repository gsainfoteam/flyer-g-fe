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

/** 목록에서 가장 최근 식단 글. 목록은 최신 글이 먼저 나온다. */
export function latestPost(listHtml: string): { no: string; title: string } | null {
  const match = /<div class='bd_item_box'>\s*<a href='\?mode=V&amp;no=(\d+)'>[\s\S]*?<h2><span>([^<]*)<\/span><\/h2>/.exec(
    listHtml,
  );
  return match ? { no: match[1]!, title: match[2]!.trim() } : null;
}

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

export async function fetchCafeteriaWeek(
  cafeteria: (typeof CAFETERIAS)[number],
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<CafeteriaWeek> {
  const listUrl = `${ORIGIN}/kr/html/sub05/${cafeteria.code}.html`;
  const post = latestPost(await (await get(listUrl, fetchImpl)).text());
  if (!post) throw new Error(`${cafeteria.place}: 식단 글을 찾지 못함`);
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
  return { place: cafeteria.place, title: post.title, days };
}
