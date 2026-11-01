// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { onRequestGet } from "../../functions/api/cafeteria";
import { CAFETERIAS, fetchCafeteriaWeek, listPosts, pdfFileName, pdfUrl } from "./board";
import { cleanMenu, parseMenuPage } from "./parse-menu";
import { readPdfPage } from "./pdf-text";

/** 2026-10-26 주 식단표(학교 게시판 첨부 그대로) */
const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
const FIRST = fixture("cafeteria1-2026-10-26.pdf");
const SECOND = fixture("cafeteria2-2026-10-26.pdf");
const NOW = new Date("2026-10-28T03:00:00Z");

const LIST_HTML = `
<div class='bd_boxtype bd_item bd_shadow bd_curved'>
  <div class='bd_item_box'>
    <a href='?mode=V&amp;no=224406'>
      <div class='bdimg'><div class='inner'><img src='?mode=IMG&amp;no=224406&amp;file_id=' alt=''></div></div>
      <div class='bd_entry'>
        <h2><span>2026년10월5주 (10월26월-10월30일)</span></h2>
      </div>
    </a>
  </div>
</div>
<div class='bd_boxtype bd_item bd_shadow bd_curved'>
  <div class='bd_item_box'>
    <a href='?mode=V&amp;no=224173'>
      <div class='bd_entry'><h2><span>2026년10월4주</span></h2></div>
    </a>
  </div>
</div>`;
const POST_HTML = `<iframe id="pdf_file" src="/module/pdf_viewer/web/viewer_bbs.html?code=050601&site_dvs_cd=kr&fileId=20261026094055_01f0ct1nrbmu83421b35ciq45u61yl.pdf"></iframe>`;

describe("식단표 PDF 읽기", () => {
  it("제1학생식당: 월–금, 아침·점심(일품+한식)·저녁", async () => {
    const days = parseMenuPage(await readPdfPage(FIRST), NOW);
    expect(days.map((day) => day.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
    ]);
    const monday = days[0]!;
    expect(monday.meals.map((meal) => meal.type)).toEqual(["BREAKFAST", "LUNCH", "DINNER"]);
    // PDF에는 시간이 없어 학교 안내의 운영 시간을 붙인다.
    expect(monday.meals.map((meal) => meal.hours)).toEqual([
      "08:00~09:00",
      "11:30~13:30",
      "17:00~19:00",
    ]);
    expect(monday.meals[0]!.menus).toEqual([
      "백미밥",
      "우동장국",
      "계란찜",
      "돈까스/소스",
      "어묵볶음",
      "배추김치",
      "시리얼&우유",
      "토스트&잼",
      "야채샐러드",
    ]);
    // 일품 두 줄이 먼저, 이어서 한식
    expect(monday.meals[1]!.menus.slice(0, 3)).toEqual(["삼겹살두부짜글이", "치즈함박스테이크", "백미밥"]);
    expect(monday.meals[2]!.menus).toContain("미니돈까스/소스");
    // 표 전체에 걸친 안내 줄은 메뉴가 아니다.
    for (const day of days) {
      for (const meal of day.meals) {
        expect(meal.menus.join()).not.toMatch(/라면코너|\(/);
      }
    }
  });

  it("제2학생식당: 월–일, 알레르기 번호와 빈 칸(---)을 뺀다", async () => {
    const days = parseMenuPage(await readPdfPage(SECOND), NOW);
    expect(days).toHaveLength(7);
    expect(days[6]!.date).toBe("2026-11-01");
    const monday = days[0]!;
    expect(monday.meals[0]!.menus[0]).toBe("쌀밥 & 햄볶음밥");
    expect(monday.meals[1]!.menus.slice(0, 2)).toEqual(["부대찌개 & 라면사리", "햄계란찜"]);
    expect(monday.meals[2]!.menus).toEqual([
      "흑미밥",
      "감자수제비",
      "돈육장조림",
      "미트볼떡강정",
      "단무지무침",
      "요구르트",
      "배추김치",
    ]);
    // 주말에는 일품이 없다(---).
    expect(days[5]!.meals[1]!.menus[0]).toBe("흑미밥");
  });

  it("연말 주는 날짜에 가까운 해로 읽는다", async () => {
    const days = parseMenuPage(await readPdfPage(SECOND), new Date("2027-01-02T00:00:00Z"));
    // 10월 표를 1월에 읽으면 지난해 10월이다.
    expect(days[0]!.date).toBe("2026-10-26");
  });

  it("메뉴 글자 정리", () => {
    expect(cleanMenu("시리얼&우유 2.6")).toBe("시리얼&우유");
    expect(cleanMenu("부대찌개 & 라면사리 6.10.15")).toBe("부대찌개 & 라면사리");
    expect(cleanMenu("야채샐러드*D")).toBe("야채샐러드");
    expect(cleanMenu("*치즈함박스테이크")).toBe("치즈함박스테이크");
    expect(cleanMenu("시리얼*우유")).toBe("시리얼&우유");
    expect(cleanMenu("---")).toBeNull();
  });
});

describe("학식 게시판", () => {
  it("목록에서 최신 글, 글에서 PDF 뷰어 파일을 찾는다", () => {
    expect(listPosts(LIST_HTML)).toEqual([
      { no: "224406", title: "2026년10월5주 (10월26월-10월30일)" },
      { no: "224173", title: "2026년10월4주" },
    ]);
    expect(pdfFileName(POST_HTML)).toBe("20261026094055_01f0ct1nrbmu83421b35ciq45u61yl.pdf");
    expect(pdfUrl("050601", "a.pdf")).toBe(
      "https://www.gist.ac.kr/_prog/download/?code=050601&site_dvs_cd=kr&file=a.pdf&bbsPdfViewer=Y",
    );
    expect(listPosts("<html></html>")).toEqual([]);
  });

  /** 목록 → 글 → PDF 순서로 답하는 가짜 학교 사이트 */
  const fakeSite = (pdfs: Record<string, Uint8Array>) =>
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("_prog/download")) {
        const code = new URL(url).searchParams.get("code")!;
        return pdfs[code] ? new Response(pdfs[code] as BodyInit) : new Response("", { status: 404 });
      }
      if (url.includes("mode=V")) return new Response(POST_HTML);
      return new Response(LIST_HTML);
    }) as unknown as typeof fetch;

  it("한 식당의 이번 주 식단을 읽는다", async () => {
    const week = await fetchCafeteriaWeek(CAFETERIAS[0], NOW, fakeSite({ "050601": FIRST }));
    expect(week.place).toBe("제1학생식당");
    expect(week.title).toContain("10월5주");
    expect(week.days).toHaveLength(5);
  });

  it("최신 글에 오늘이 없으면(다음 주 글을 미리 올림) 앞 글까지 본다", async () => {
    const postsRead = (fetchImpl: typeof fetch) =>
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes("mode=V"));

    const thisWeek = fakeSite({ "050602": SECOND });
    await fetchCafeteriaWeek(CAFETERIAS[1], NOW, thisWeek);
    expect(postsRead(thisWeek)).toHaveLength(1);

    // 10/25(일): 최신 글은 10/26 주라 오늘이 없다.
    const weekend = fakeSite({ "050602": SECOND });
    const week = await fetchCafeteriaWeek(CAFETERIAS[1], new Date("2026-10-25T03:00:00Z"), weekend);
    expect(postsRead(weekend).map((url) => new URL(url).searchParams.get("no"))).toEqual([
      "224406",
      "224173",
    ]);
    expect(week.days.map((day) => day.date)).toContain("2026-10-26");
  });

  it("함수: 식당이 실패하면 캐시를 짧게, 캐시에서 꺼내도 TV에는 30분까지만", async () => {
    const stored = new Map<string, Response>();
    vi.stubGlobal("caches", {
      default: {
        match: async (request: Request) => stored.get(request.url)?.clone(),
        put: async (request: Request, response: Response) => void stored.set(request.url, response),
      },
    });
    const pending: Promise<unknown>[] = [];
    const call = (fetchImpl: typeof fetch) => {
      vi.stubGlobal("fetch", fetchImpl);
      return onRequestGet({
        request: new Request("https://tv.example/api/cafeteria"),
        waitUntil: (promise) => pending.push(promise),
      });
    };

    const first = await call(fakeSite({ "050602": SECOND }));
    await Promise.all(pending);
    expect(first.headers.get("Cache-Control")).toBe("public, max-age=1800");
    expect([...stored.values()][0]!.headers.get("Cache-Control")).toBe("public, max-age=1800");

    const hit = await call(fakeSite({}));
    expect(hit.status).toBe(200);
    expect(hit.headers.get("Cache-Control")).toBe("public, max-age=1800");
    vi.unstubAllGlobals();
  });

  it("함수: 읽은 식당만 보내고, 모두 실패하면 502", async () => {
    const context = (fetchImpl: typeof fetch) => {
      vi.stubGlobal("fetch", fetchImpl);
      return { request: new Request("https://tv.example/api/cafeteria"), waitUntil: () => {} };
    };

    const partial = await onRequestGet(context(fakeSite({ "050602": SECOND })));
    expect(partial.status).toBe(200);
    const body = (await partial.json()) as { places: { place: string }[]; errors: string[] };
    expect(body.places.map((place) => place.place)).toEqual(["제2학생식당"]);
    expect(body.errors).toHaveLength(1);

    const failed = await onRequestGet(context(fakeSite({})));
    expect(failed.status).toBe(502);
    vi.unstubAllGlobals();
  });
});
