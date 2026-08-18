# Flyer.G 디자인 시스템

> 대상: 이후 Phase를 맡는 사람과 Agent
> 범위: 디자인 원칙, 토큰, shadcn/ui 도입 방식, 공통 컴포넌트
> 단일 원천: `src/index.css`(토큰), `src/shared/ui`(primitive), `src/shared/components`(제품 컴포넌트)

## 1. 디자인 원칙

전단지는 두 개의 화면 종류를 하나의 브랜드로 묶는다. 관리자 웹은 가까이서 많은 정보를
빠르게 판단하는 화면이고, TV 플레이어는 멀리서 한 가지를 읽는 화면이다.

**방향: 정보 밀도형.** 화면의 주인공은 콘텐츠와 상태이고, UI는 배경으로 물러난다.
승인 대기 20건을 한 화면에서 판단할 수 있어야 한다.

1. **명료함이 먼저다.** 캠퍼스 구성원이 처음 봐도 무엇을 해야 하는지 알 수 있어야 한다.
2. **구조는 선과 여백이 만든다.** 카드 그림자와 배경색을 겹쳐 쌓지 않는다.
3. **중요한 상태와 작업은 시각적으로 분리한다.** 승인·반려·중단은 일반 작업과 다르게 보인다.
4. **TV와 관리자 웹이 같은 브랜드로 느껴진다.** 같은 색 체계, 같은 서체, 같은 모서리를 쓴다.
5. **원거리 가독성과 접근성을 함께 만족한다.** TV는 큰 글자와 대비, 웹은 키보드와 label.
6. **장식을 두지 않는다.** 의미 없는 그라디언트, 프로모 배너, 이모지, 배경 애니메이션을
   쓰지 않는다.

### 하지 않는 것

아래는 화면을 "템플릿에서 뽑은 것"처럼 보이게 만들고 정보 위계를 흐린다.

- 수치나 항목마다 파스텔 아이콘 칩을 두는 것
- 근거 없는 증감률, 조회수 같은 장식용 지표
- 인사말과 이모지처럼 정보가 없는 문구
- 브랜드 색 그라디언트 배너
- 모든 블록을 같은 카드(테두리 + 그림자)로 감싸는 것
- 자리표시자를 실제 콘텐츠보다 눈에 띄게 만드는 것

### 색 사용 규칙

- **표면과 글자는 중성 회색조다.** 배경에 브랜드 색조를 섞지 않는다.
- **보라(brand)는 액션·현재 위치·강조 수치에만 쓴다.** 배경 전반에 깔지 않는다.
- **상태는 상태 색(info/success/warning/danger)만 쓴다.** 브랜드 색과 섞지 않는다.
- **색만으로 의미를 전달하지 않는다.** 항상 문구를 함께 쓰고, 필요하면 아이콘을 더한다.
  (명세 9.6)
- 주황(`accent-brand`)은 로고의 `G` 한 글자에만 쓴다.

### 타이포그래피 규칙

**서체는 Pretendard 하나다.** 가변 폰트를 자기 호스팅하며, 동적 서브셋이라 브라우저가
화면에 실제로 쓰인 유니코드 구간만 내려받는다(보통 100~300KB). macOS, Windows,
Raspberry Pi(TV)에서 같은 모양으로 보인다.

**위계는 크기와 굵기를 함께 바꿔 만든다.** 크기만 조금씩 다른 단계는 위계가 아니라 편차다.

| 단계 | 크기 / 굵기 | 쓰는 곳 |
|---|---|---|
| `text-display` | 56 / 800 | TV 포스터 제목. 원거리용이라 굵기를 한 단계 더 올린다 |
| `text-metric` | 30 / 700 | 운영 요약 수치. `tabular-nums`를 함께 쓴다 |
| `text-title` | 22 / 700 | 화면 제목 (`h1`) |
| `text-heading` | 17 / 600 | 섹션 제목 (`h2`), 빈 상태·오류 제목 |
| `text-body` | 15 / 400 | 본문과 설명 문장 |
| `text-label` | 14 / 500 | 목록 항목 제목, 입력 label, 버튼, 탭 |
| `text-caption` | 13 / 400 | 메타 정보(기간·조직), 보조 설명 |
| `text-overline` | 12 / 600 | 상태 배지처럼 아주 짧은 라벨 |

- 굵기는 **400 / 500 / 600 / 700 / 800** 다섯 단계만 쓴다. 크기 토큰이 기본 굵기를
  가지고 있으므로 `font-*` 클래스를 덧붙이는 것은 의도적으로 벗어날 때만 한다.
- **본문보다 작은 글자를 제목에 쓰지 않는다.** 목록 항목 제목은 `label`, 그 아래 메타는
  `caption`으로 한 단계 내려간다.
- TV는 관리자 웹 scale을 그대로 쓰지 않는다. 화면 전용 크기를 명시하고 Phase 05에서
  1920x1080으로 실측한다.

### 대비 규칙

글자 색은 정보의 층위를 뜻한다. 흐리게 만드는 장치가 아니다.

| 토큰 | 대비(흰 배경) | 쓰는 곳 |
|---|---|---|
| `text-ink` | 17.7:1 | 제목과 본문 |
| `text-ink-muted` | 7.7:1 | 설명, 메타 정보 |
| `text-ink-subtle` | 5.1:1 | 단위, 개수처럼 3차 정보만 |

세 색 모두 `surface`, `canvas`, `surface-muted` 위에서 WCAG AA(4.5:1)를 넘는다.
상태 배지의 `*-strong / *-subtle` 조합도 모두 6:1 이상이다. 새 색을 더할 때는 같은
기준을 맞춘다. (명세 9.6)

## 2. 토큰

모든 토큰은 `src/index.css` 한 곳에서 정의한다. 컴포넌트에서 임의 hex, 임의 shadow,
임의 z-index를 새로 만들지 않는다. MVP는 light theme만 지원한다.

| 갈래 | 토큰 | 사용 예 |
|---|---|---|
| 브랜드 | `brand`, `brand-strong`, `brand-muted`, `brand-subtle`, `brand-border`, `brand-on`, `accent-brand` | `bg-brand`, `text-brand-strong` |
| 표면 | `canvas`, `surface`, `surface-muted` | `bg-canvas`, `bg-surface` |
| 선·글자 | `line`, `line-strong`, `ink`, `ink-muted`, `ink-subtle`, `ink-inverse`, `focus` | `border-line`, `text-ink-muted` |
| 상태 | `info`/`success`/`warning`/`danger` × `-subtle`, `-strong` | `bg-danger-subtle text-danger-strong` |
| 타이포 | `display`, `metric`, `title`, `heading`, `body`, `label`, `caption`, `overline` | 위 타이포그래피 표 참고 |
| 간격 | Tailwind 4px scale (`--spacing: 0.25rem`) | `p-4` = 16px |
| 모서리 | `control`, `card`, `dialog`, `pill` | `rounded-card` |
| 그림자 | `card`, `floating`, `dialog` | `shadow-card` |
| 모션 | `--duration-fast/base/slow`, `ease-standard`, `ease-emphasized` | `duration-(--duration-base) ease-standard` |
| 레이아웃 | `--container-content`, `--container-form`, `--layout-sidebar-width`, `--layout-header-height`, `--breakpoint-tv` | `max-w-content` |
| 레이어 | `--layer-header/dropdown/dialog/toast` | `z-(--layer-header)` |

`--duration-*`, `--layer-*`, `--layout-*`는 Tailwind theme namespace가 없어 `:root` 변수로
두고 arbitrary value 문법(`z-(--layer-dialog)`)으로 쓴다.

### 토큰 바꾸는 법

1. 색·타이포·모서리를 바꾸려면 `src/index.css`의 `@theme` 블록만 고친다.
2. shadcn 컴포넌트의 색을 바꾸려면 `:root`의 **shadcn theme 변수 연결표**를 고친다.
   (`--primary: var(--color-brand)` 같은 줄)
3. 화면이나 컴포넌트에서 shadcn 내부 색을 덮어쓰지 않는다.

## 3. shadcn/ui 도입 방식

shadcn/ui는 런타임 패키지가 아니라 **프로젝트가 소유하는 소스**다. 생성된 파일도
프로젝트 코드와 동일하게 검토·테스트·유지보수한다.

- 설치: `bunx shadcn@latest init --base radix --preset nova --css-variables`
- 추가: `bunx shadcn@latest add <component>`
- 설정: `components.json` (alias는 `@/shared/ui`, `@/shared/lib/utils`)
- 패키지 매니저: Bun. `shadcn` CLI는 devDependency다.
- 공식 registry만 사용한다. 출처가 불명확한 third-party registry는 쓰지 않는다.

> `shadcn` CLI는 alias를 `tsconfig.json`에서 찾는다. 그래서 빌드에 쓰이지 않는
> `tsconfig.json`에도 `paths`를 둔다. 없으면 저장소 루트에 `@/` 디렉터리를 만들어 버린다.

### 레이어 구분

```text
src/shared/ui/          shadcn primitive (생성본)
src/shared/components/  primitive를 조합한 Flyer.G 제품 컴포넌트
src/features/**         특정 기능에서만 쓰는 컴포넌트
```

- `Button`, `Dialog`처럼 의미가 그대로인 primitive에 이름만 바꾼 wrapper를 만들지 않는다.
- 제품 컴포넌트는 반복되는 **제품 의미나 정책**을 담을 때만 만든다.

### 설치한 컴포넌트와 선택 이유

| 컴포넌트 | 쓰는 곳 |
|---|---|
| `button` | 모든 작업 버튼. 승인·반려·중단의 variant 구분 |
| `input`, `textarea`, `select`, `label` | 게시 신청 폼, 반려 사유 |
| `card` | 대시보드 섹션, 목록 카드 |
| `tabs` | 상태별 콘텐츠 필터 |
| `badge` | `StatusBadge`의 기반 |
| `dialog` | `ConfirmActionDialog`의 기반 |
| `dropdown-menu` | 목록 행의 권한별 작업 메뉴 |
| `pagination` | 콘텐츠 목록 (명세 FR-DASH-02) |
| `skeleton`, `spinner` | 로딩 표현 |
| `alert` | 폼·상세의 경고와 안내 |
| `sonner` | 작업 결과 알림 |

전체 컴포넌트를 한꺼번에 설치하지 않았다. 필요한 화면이 생길 때 추가한다.

### 생성본 수정 내역

재생성·비교가 가능하도록 구조는 바꾸지 않고 최소한만 고쳤다.

| 파일 | 수정 | 이유 |
|---|---|---|
| `sonner.tsx` | `next-themes` 의존 제거, `theme="light"` 고정 | MVP는 light theme만 지원. theme provider를 두지 않는다 |
| `spinner.tsx` | `aria-label`을 "불러오는 중"으로 | 한국어 사용자 대상 |
| `dialog.tsx` | 닫기 버튼 sr-only 문구를 "닫기"로 | 한국어 사용자 대상 |
| `pagination.tsx` | 기본 문구와 `aria-label`을 한국어로 | 한국어 사용자 대상 |
| `alert.tsx` | `info`/`success`/`warning` variant 추가 | 제품에 필요한 semantic tone (Phase 00 문서 4절) |

`eslint.config.js`는 `src/shared/ui/**`에서 `react-refresh/only-export-components`를 끈다.
생성본이 컴포넌트와 cva variant를 한 파일에서 내보내기 때문이며, 생성본 구조를 바꾸는
대신 규칙을 완화했다.

## 4. Flyer.G 제품 컴포넌트

`@/shared/components`에서 가져온다.

### `SummaryStats`

운영 요약 수치를 한 줄에 놓고 기준 시각을 함께 밝힌다. 아이콘 칩과 증감률을 두지 않는다.

```tsx
<SummaryStats
  caption="2026. 08. 18. 19:01 기준"
  items={[{ label: "승인 대기", value: 2, unit: "건", emphasis: true }]}
/>
```

### `SubmissionRow`

목록의 신청 한 건. 카드 격자 대신 행으로 두어 한 화면에 담기는 건수를 늘린다.
썸네일은 보조이고 제목·기간·상태가 먼저 읽히게 한다.

### `StatusBadge`

명세 6.3의 10개 상태를 label + icon + tone으로 그린다. 상태 문구를 화면에서 직접 쓰지 않는다.

```tsx
<StatusBadge status="PENDING_REVIEW" />
<StatusBadge status="PUBLISHED" hideIcon />   // 좁은 목록
```

### `SectionHeader`

제목, 설명, 작업 버튼의 배치를 통일한다. `as`로 heading level을 문서 구조에 맞춘다.

```tsx
<SectionHeader as="h1" title="내 콘텐츠" description="..." action={<Button>등록</Button>} />
```

### `FormField`

label, description, error를 `aria-describedby`로 연결한다. 화면마다 연결을 새로 만들지 않는다.

```tsx
<FormField label="제목" description="1~80자" error={errors.title} required>
  {(control) => <Input {...control} value={title} onChange={...} />}
</FormField>
```

### `PageState` / `LoadingState` / `EmptyState` / `ErrorState`

로딩 → 오류 → 빈 상태 → 본문 순서를 강제한다. `ErrorState`는 `ApiError`에서 사용자 문구와
요청 ID만 뽑고 내부 stack이나 서버 message를 노출하지 않는다.

```tsx
<PageState isLoading={isPending} error={error} isEmpty={items.length === 0}
  onRetry={refetch} empty={{ title: "아직 신청한 콘텐츠가 없습니다." }}>
  {items.map(...)}
</PageState>
```

### `ConfirmActionDialog`

승인·반려·중단의 확인 절차를 통일한다.

- `tone="destructive"`는 게시자에게 영향이 큰 작업에 쓴다.
- 처리 중 중복 클릭을 막는다.
- **실패하면 닫지 않는다.** 오류 표시는 `onError`로 호출부가 담당한다.
- focus trap, Escape 닫기, focus 복원은 Radix Dialog 동작을 그대로 쓴다.

`AsyncButton`은 만들지 않았다. 중복 제출 차단이 지금은 이 dialog 안에만 있어서, 실제로
반복될 때 Phase 02~04에서 도입한다.

## 5. 컴포넌트 카탈로그

```bash
bun run dev     # http://localhost:5173/catalog
```

모든 variant, 상태, 긴 한국어 문구를 한 화면에서 확인한다. **새 화면을 만들기 전에 여기서
쓸 컴포넌트를 먼저 찾는다.**

production 빌드에서는 `import.meta.env.DEV` 분기로 import 자체가 제거되어 번들에 포함되지
않고 경로로도 접근할 수 없다.

## 6. 검증 기록 (2026-08-18)

| 항목 | 방법 | 결과 |
|---|---|---|
| 토큰 해석 | 브라우저 computed style | `--color-brand`, `--radius-card`, `--shadow-*`, `--layer-*` 모두 의도한 값 |
| 그림자 적용 | computed `box-shadow` | `shadow-floating` 2개 레이어 정상 |
| 320px overflow | `body.scrollWidth` 측정 | 없음 (`html { min-width }`를 360px → 320px로 낮춤) |
| 1280px overflow | 동일 | 없음 |
| Dialog focus 이동 | 브라우저 | 열면 focus가 dialog 안으로 이동 |
| Dialog focus 복원 | 브라우저 | 닫으면 trigger로 복원 |
| Dialog Escape 닫기 | jsdom 테스트 | 통과 |
| 확인 버튼 비활성 | 브라우저 | 사유 미입력 시 disabled |
| Button/Tabs 키보드 | jsdom 테스트 | Tab 포커스, Enter 실행, 화살표 탭 이동 통과 |

> focus 복원은 jsdom에서 재현되지 않아 단위 테스트에서 제외했다. Radix FocusScope의
> 동작이며 실제 브라우저에서 확인했다. 회귀가 걱정되면 Phase 07의 E2E에서 다시 잡는다.

## 7. 화면 적용 현황 (Phase 00-C)

세 화면 모두 토큰과 공통 컴포넌트로 옮겼다. 손수 만든 `useToast`는 제거하고 `sonner`를 쓴다.
`src/components/common/StatusBadge.tsx`(4개 상태)는 삭제하고 `@/shared/components`의
`StatusBadge`(10개 상태)로 통일했다.

| 화면 | 적용한 것 |
|---|---|
| 대시보드 | `StatCard`(증감률·조회수 제거), `PosterCard`, `StatusBadge`, `Tabs`, `SectionHeader`, `PageState` |
| 스튜디오 | `FormField` + shadcn `Input`/`Select`, `PageState`, `Button` |
| TV 플레이어 | 토큰 기반 색·모서리·그림자, `PageState`의 빈 상태, `Button` |

### 추가 검증 (2026-08-18)

| 항목 | 결과 |
|---|---|
| 대시보드 375px | 탭 목록이 화면을 밀어내 가로 스크롤 발생 → 그리드 항목에 `min-w-0`, 탭에 가로 스크롤 적용해 해결 |
| 대시보드 320px | 가로 overflow 없음 |
| 스튜디오 320px | 가로 overflow 없음 (내용은 데스크톱 전용 레이아웃) |
| 콘솔 오류 | 없음 |

## 8. 시각 정리 (2026-08-18)

첫 구현이 범용 대시보드 템플릿처럼 보인다는 지적을 받아 토큰 값과 적용 방식을 다시 잡았다.
토큰 **체계**는 그대로 두고 값과 사용처만 바꿨다.

| 바꾼 것 | 전 | 후 |
|---|---|---|
| 표면·글자 | 보라 기가 섞인 회색 | 중성 회색조 (`canvas`, `line`, `ink` 계열) |
| 그림자 | 보라 알파, 넓은 확산 | 중성, 카드는 1px 수준. 구조는 선이 만든다 |
| 모서리 | control 0.75 / card 1 / dialog 1.25rem | 0.5 / 0.625 / 0.75rem |
| 굵기 | 제목·숫자·배지·버튼이 전부 900 | 400/500/600/700 네 단계 |
| 요약 통계 | 카드 4장 + 파스텔 아이콘 칩 + 증감률 | 구분선으로 나눈 수치 한 줄 + 기준 시각 |
| 목록 | 포스터 카드 격자 4장 | 행 목록 6건 (제목·기간·상태) |
| 머리말 | "안녕하세요, 지스트님! 👋" | 화면 이름 + 할 수 있는 일 |
| 사이드바 | 보라 그라디언트 프로모 카드, 아이콘 칩 | 링크만. 현재 위치는 배경과 아이콘 색으로 |
| 포스터 자리표시자 | 8종 무지개 그라디언트 | 중성 회색 위 타이포. 작은 썸네일은 아이콘만 |
| TV 배경 | hue-rotate 14초 애니메이션 | 정지된 단색 계열 (`.tv-surface`) |
| 4분할 | 2x2, 화면 절반이 빔 | 항목 수에 맞춘 한 줄 배치 |

### 포스터 자리표시자

`public/posters/*.png`가 아직 없어 모든 포스터가 대체 화면으로 그려진다. 자리표시자가
실제 포스터보다 눈에 띄면 정보 위계가 무너지므로 장식색을 쓰지 않는다.

- 7rem 이상: 중성 회색 위에 카테고리·제목·부제·주최·시작일
- 7rem 미만(목록 썸네일): 아이콘만
- 카드 오버레이가 같은 정보를 보여주는 곳(4분할): `hideFallbackText`로 글자를 감춘다

실제 포스터 이미지를 `public/posters/`에 넣으면 자동으로 대체된다.

## 9. 타이포그래피 재설계 (2026-08-19)

"글자가 다 얇고 위계가 없다"는 지적에 따라 서체와 타입 스케일을 다시 짰다.

**원인은 두 가지였다.**

1. `--font-sans`에 Pretendard를 적어두고 **실제로는 한 번도 로드하지 않았다.** `@font-face`도
   패키지도 없어서 모든 화면이 OS 기본 산세리프로 렌더링되고 있었다.
2. 스케일이 위계를 만들지 못했다. `heading`(15px)이 `body`(14px)보다 1px 컸고,
   `label`(13px)은 `body`보다 작은데 목록 제목에 쓰고 있었다. 세 단계가 12~15px 안에
   몰려 있어 크기 차이가 위계로 읽히지 않았다.

**고친 것**

| | 전 | 후 |
|---|---|---|
| 서체 | 스택에만 적힌 Pretendard (미로드) | Pretendard 가변 폰트 자기 호스팅, 동적 서브셋 |
| 스케일 | 12·13·14·15·20·28·52 (간격 불균등, 하단 밀집) | 12·13·14·15·17·22·30·56 |
| 굵기 | 크기별 기본 굵기가 위계와 어긋남 | 단계마다 크기와 굵기를 함께 올림 |
| 본문 대비 | `ink-muted` 5.4:1을 본문에까지 사용 | 본문 `ink` 17.7:1, 보조 `ink-muted` 7.7:1 |
| 3차 정보 | `ink-subtle` 3.5:1 (AA 미달) | 5.1:1 (모든 표면에서 AA 통과) |
| 브랜드 색 | 눌러서 회색에 묻힘 | 활성 탭·현재 메뉴·강조 수치에 분명히 사용 |

측정은 브라우저에서 실제 계산된 색으로 WCAG 대비비를 계산해 확인했다.

## 10. 남은 일

- TV 플레이어 전용 표현(실제 QR, 빈 화면 fallback, kiosk 컨트롤 숨김)은 여기서
  일반화하지 않았다. Phase 05에서 Flyer.G 전용 컴포넌트로 만든다.
- 포스터 렌더 모델(`@/entities/poster`)은 props 계약만 고정했다. 미리보기와 플레이어가
  공유하는 실제 렌더러는 Phase 02에서 만든다.
- 모바일 내비게이션(좁은 화면에서 Sidebar 대체)은 Phase 01 범위다.
