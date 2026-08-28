# 전단지 (Flyer.G)

GIST 학사기숙사의 종이 게시판을 디지털 사이니지로 바꾸는 시스템의 프론트엔드다.
기숙사 로비 TV에 승인된 포스터가 자동으로 돌아가고, 관리자 웹에서 신청과 승인을
처리한다. 게시 기간이 끝나면 자동으로 내려간다.

[Ziggle](https://ziggle.gistory.me)의 연장 서비스로, TV의 QR을 찍으면 Ziggle 원문으로
간다.

## 실행

```bash
bun install
bun run dev
```

| 명령 | 하는 일 |
|---|---|
| `bun run dev` | 개발 서버 |
| `bun run test` | 단위·통합 테스트 1회 실행 |
| `bun run test:watch` | 테스트 감시 모드 |
| `bun run test:e2e` | Playwright E2E (mock 기반, dev 서버 자동 기동) |
| `bun run lint` | ESLint |
| `bun run build` | 타입 검사 + production 빌드 |

E2E는 처음 한 번 `bunx playwright install chromium`으로 브라우저를 받아야 한다.

## 화면

| 경로 | 화면 |
|---|---|
| `/` | 대시보드 |
| `/submissions` | 내 신청 목록 |
| `/reviews` | 승인 대기 (하우스 관리자 이상) |
| `/studio` | 게시 신청 |
| `/display/:deviceId` | TV 플레이어 (로그인 불요) |
| `/catalog` | 컴포넌트 카탈로그 (개발 빌드 전용) |

개발 환경에서는 mock 세션으로 시작한다. 상단 오른쪽에서 게시자 · 하우스 관리자 ·
시스템 운영자로 역할을 바꿔 가며 권한 경계를 확인할 수 있다.

## Mock 동작

개발 빌드의 데이터는 전부 브라우저 메모리 안의 mock이다. **새로고침하면 초기
fixture로 돌아간다.** 서버가 없어도 전체 흐름(신청 → 검토 → 게시 → TV)이 돈다.

오류·지연 재현: `/catalog`의 **Mock 제어** 패널에서 요청별로 401~500 오류와 지연을
주입할 수 있다. 콘솔로도 된다.

```bash
# 브라우저 콘솔에서
sessionStorage.setItem("flyerg:mock-fail", '{"submissions.create": 409}')
sessionStorage.setItem("flyerg:mock-latency", "3000")
```

TV 플레이어는 편성·포스터를 IndexedDB에 캐시한다(last-known-good). 편성 조회를
실패시켜 보면(`{"displays.getPlaylist": 500}`) 캐시 재생을 확인할 수 있다.

## 환경 변수

`.env.example`을 복사해 `.env.local`을 만든다. 비워 두면 개발 빌드는 mock으로,
production 빌드는 실제 API로 동작하며, production에서 mock을 켜면 앱이 시작 시점에
실패한다.

## 문서

제품 명세와 설계 문서는 저장소에 두지 않는다. 코드 주석에서 인용하는 `명세 6.3`,
`FR-PLY-01` 같은 표기는 제품 명세서(`product-spec.md`)의 조항 번호다. 문서 위치는
팀에 문의한다.

로컬에서 작업한다면 저장소 루트의 `docs/`에 두면 된다. 해당 경로는 git에서 무시된다.

| 문서 | 내용 |
|---|---|
| `product-spec.md` | 제품 범위, 상태 모델, API 계약, 인수 조건 |
| `API-REQUIREMENTS.md` | 화면이 필요로 하는 API. 백엔드에 전달하는 요구사항 |
| `frontend-architecture.md` | 코드 구조, 경계, 라우팅과 인증 |
| `design-system.md` | 디자인 토큰, 컴포넌트, shadcn 생성본 수정 내역 |
| `design-context.md` | 디자인 작업용 맥락 |
| `frontend-phases/` | Phase 00~07 구현 지시서 |

## 기술 스택

React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui · TanStack Query ·
React Router · Vitest · Pretendard
