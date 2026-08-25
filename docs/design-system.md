# Flyer.G 디자인 시스템

> 대상: 이후 Phase를 맡는 사람과 Agent
> 단일 원천: `src/index.css`(토큰), `src/shared/ui`(shadcn primitive), `src/shared/components`(제품 컴포넌트)
> 출처: Claude Design 프로젝트 "Flyer.G 디자인 v2" (Modernist 계열 · 흰 카드 변형)

## 1. 디자인 원칙

전단지는 두 종류의 화면을 하나로 묶는다. 관리자 웹은 가까이서 많은 건을 빠르게
판단하는 화면이고, TV는 2~5m 밖에서 지나가며 몇 초 보는 화면이다.

1. **회색 바닥 위의 흰 면.** 구조는 테두리가 아니라 면의 대비가 만든다.
   카드는 아주 옅은 그림자로만 띄운다.
2. **빨강은 지금 행동해야 하는 곳에만.** 주 작업 버튼, 처리해야 할 건수,
   게시자가 고쳐야 하는 상태. 그 외에는 검정·회색이다.
3. **한 줄로 말한다.** 상태 배지 옆에는 항상 "지금 어떤 상황인지" 한 문장이 붙는다.
   색을 구분하지 못해도 무엇을 해야 하는지 알 수 있어야 한다.
4. **왼쪽에 맞춘다.** 제목, 본문, 빈 상태. 가운데로 모으면 빈 화면이 실패처럼 보인다.
5. **장식을 두지 않는다.** 파스텔 아이콘 칩, 근거 없는 지표, 이모지, 그라디언트 배너,
   배경 애니메이션을 쓰지 않는다.
6. **TV에는 조작 UI가 없다.** 사람이 만지지 않는 화면이다.

### 말투

친근한 존댓말을 쓴다. 시스템이 사용자에게 상황을 알려 주는 톤이다.

- "3일째 관리자 검토를 기다리고 있어요"
- "08. 25. 00:00에 자동으로 걸려요"
- "처리할 신청이 없어요"

## 2. 토큰

모든 토큰은 `src/index.css` 한 곳에서 정의한다. 컴포넌트에서 임의 hex, 임의 shadow,
임의 z-index를 새로 만들지 않는다. MVP는 light theme만 지원한다.

### 색

| 역할 | 토큰 | 값 | 쓰는 곳 |
|---|---|---|---|
| 강조 | `accent` | `#ec3013` | 주 작업 버튼, 처리할 건수, 브랜드 마크 |
| 강조 ramp | `accent-100` `accent-700` `accent-800` | | 주의 배경, 그 위의 글자, hover/pressed |
| 바닥 | `canvas` | `#f3f2f2` | 화면 배경 |
| 면 | `surface` | `#ffffff` | 카드, 헤더, 푸터, TV 배경 |
| 면(눌림) | `surface-muted` | `#eae7e7` | 칩 배경, 보조 버튼 |
| 선 | `line` | `#eae7e7` | 경계선. 면 색과 같은 톤이다 |
| 글자 | `ink` `ink-muted` `ink-subtle` | `#201e1d` `#605d5d` `#7d7979` | 본문 / 설명·메타 / 3차 정보 |
| 주의 | `attention` `attention-subtle` `attention-strong` | accent 계열 | 반려·중단·오프라인 |

**단색 체계다.** 상태를 색으로 나누지 않는다. `info`/`success`는 중성 회색을,
`warning`/`danger`는 강조색을 가리킨다. 구분은 항상 문구가 한다. (명세 9.6)

> `accent`라는 이름은 shadcn의 hover 표면 역할과 겹친다. 생성본 쪽을 `ui-accent`로
> 옮겼다. 새 shadcn 컴포넌트를 추가하면 `bg-accent`가 섞여 들어오는지 확인한다.
> `src/design-tokens.test.ts`가 이 규칙을 지킨다.

### 타이포그래피

**서체는 Pretendard 하나다.** 가변 폰트를 자기 호스팅하며, 동적 서브셋이라 브라우저가
화면에 실제로 쓰인 유니코드 구간만 내려받는다. macOS, Windows, Raspberry Pi(TV)에서
같은 모양으로 보인다.

위계는 크기와 굵기를 **함께** 바꿔 만든다. 크기만 조금씩 다른 단계는 편차지 위계가 아니다.

| 단계 | 크기 / 굵기 | 쓰는 곳 |
|---|---|---|
| `text-display` | 32 / 800 | 화면 제목 (`h1`) |
| `text-title` | 24 / 800 | 카드 제목, 빈 상태·오류 제목 |
| `text-heading` | 19 / 800 | 섹션 제목 (`h2`) |
| `text-metric` | 18 / 800 | 상태별 건수. `tabular-nums`와 함께 |
| `text-subhead` | 17 / 700 | 목록 항목 제목 |
| `text-body` | 15 / 400 | 본문, 설명 문장 |
| `text-label` | 14 / 500 | 메타 문장, 입력 label, 내비게이션 |
| `text-caption` | 13 / 400 | 보조 설명, 푸터 |
| `text-overline` | 12 / 700 | 상태 배지 |

- 굵기는 400 / 500 / 700 / 800 네 단계만 쓴다.
- 크기 토큰이 기본 굵기를 가지고 있으므로 `font-*`를 덧붙이는 것은 의도적으로
  벗어날 때만 한다.
- 본문은 `word-break: keep-all`, `letter-spacing: -0.01em`이다. 한국어가 단어 중간에서
  끊기지 않게 한다.
- **TV는 이 scale을 쓰지 않는다.** 화면 전용 크기를 컴포넌트에 직접 적고 Phase 05에서
  1920x1080으로 실측한다. 단일 레이아웃 제목은 96px/800이다.

### 대비

| 조합 | 대비 |
|---|---|
| `ink` / `surface` | 17.7:1 |
| `ink-muted` / `surface` | 6.4:1 |
| `ink-subtle` / `surface` | 4.6:1 |
| `attention-strong` / `attention-subtle` | 8.7:1 |

세 글자색 모두 `surface`, `canvas`, `surface-muted` 위에서 WCAG AA(4.5:1)를 넘는다.
새 색을 더할 때 같은 기준을 맞춘다.

### 모서리·그림자·레이아웃

| | |
|---|---|
| `rounded-thumb` 8px | 목록 썸네일 |
| `rounded-control` 14px | 버튼, 입력, 목록 행 |
| `rounded-card` 20px | 카드 |
| `rounded-pill` | 배지, 칩, 내비게이션 링크 |
| `shadow-card` | 카드. 1px 수준으로만 띄운다 |
| `shadow-floating` / `shadow-dialog` | 떠 있는 것, 모달 |
| `max-w-content` 1120px | 본문 최대 폭 |
| `--layout-header-height` | 상단 내비게이션 높이 |

`--duration-*`, `--layer-*`는 Tailwind theme namespace가 없어 `:root` 변수로 두고
arbitrary value 문법(`z-(--layer-dialog)`)으로 쓴다.

## 3. shadcn/ui

shadcn/ui는 런타임 패키지가 아니라 **프로젝트가 소유하는 소스**다. 생성된 파일도
프로젝트 코드와 동일하게 검토·테스트·유지보수한다.

- 설치: `bunx shadcn@latest init --base radix --preset nova --css-variables`
- 추가: `bunx shadcn@latest add <component>`
- 설정: `components.json` (alias는 `@/shared/ui`, `@/shared/lib/utils`)
- 공식 registry만 사용한다.

> CLI는 alias를 `tsconfig.json`에서 찾는다. 그래서 빌드에 쓰이지 않는 `tsconfig.json`에도
> `paths`를 둔다. 없으면 저장소 루트에 `@/` 디렉터리를 만들어 버린다.

### 레이어 구분

```text
src/shared/ui/          shadcn primitive (생성본)
src/shared/components/  primitive를 조합한 Flyer.G 제품 컴포넌트
src/components/**       화면 컴포넌트
```

### 생성본 수정 내역

재생성·비교가 가능하도록 구조는 바꾸지 않고 최소한만 고쳤다.

| 파일 | 수정 | 이유 |
|---|---|---|
| `button.tsx` | variant를 강조/중성 두 가지로, 크기를 키움 | 단색 체계라 destructive도 별도 색을 쓰지 않는다. 한국어 문구가 들어가는 실제 버튼 크기에 맞춤 |
| `dropdown-menu.tsx`, `select.tsx` | `bg-accent` → `bg-ui-accent` | shadcn의 hover 표면 역할과 제품 강조색의 이름 충돌 |
| `alert.tsx` | `info`/`success`/`warning` variant 추가 | 제품에 필요한 tone |
| `sonner.tsx` | `next-themes` 제거, `theme="light"` 고정 | light theme만 지원 |
| `spinner.tsx`, `dialog.tsx`, `pagination.tsx` | 접근성 문구를 한국어로 | 한국어 사용자 대상 |

`eslint.config.js`는 `src/shared/ui/**`에서 `react-refresh/only-export-components`를 끈다.
생성본이 컴포넌트와 cva variant를 한 파일에서 내보내기 때문이다.

## 4. 제품 컴포넌트

`@/shared/components`에서 가져온다.

### `Panel`

흰 면 위의 내용 묶음. 제목 줄과 본문을 나눈다. `flush`는 목록처럼 가장자리까지
쓰는 경우에 준다.

### `StatusBadge`

상태 문구를 그린다. tone은 **두 가지뿐**이다 — 게시자가 고쳐야 하는 상태
(반려됨·게시 중단)만 강조색, 나머지는 중성. 목록에서는 `getStatusSentence()`의
설명 문장을 함께 두는 것을 전제로 한다.

```tsx
<StatusBadge status="REJECTED" />
```

### `getStatusSentence()` — `@/entities/submission`

상태를 한 문장으로 설명한다. 배지의 짧은 label만으로는 "그래서 지금 어떻다는 건지"가
전해지지 않는다.

```tsx
getStatusSentence({ status: "SCHEDULED", startsAtLabel: "08. 25. 00:00" })
// "08. 25. 00:00에 자동으로 걸려요"
```

### `SubmissionRow` — `@/components/common`

목록의 신청 한 건. 썸네일, 제목, 상태 문장, 오른쪽 슬롯. `highlighted`는 지금
처리해야 하는 건 하나에만 준다.

### `StatusCountBar` — `@/components/dashboard`

상태별 건수를 한 줄에 붙여 서로 비교되게 한다. `emphasis`는 화면당 하나만 쓴다.

### `PageState` / `LoadingState` / `EmptyState` / `ErrorState`

로딩 → 오류 → 빈 상태 → 본문 순서를 강제한다. 로딩은 spinner가 아니라 **골격**을
그린다. `ErrorState`는 `ApiError`에서 사용자 문구와 요청 ID만 뽑고 내부 stack이나
서버 message를 노출하지 않는다.

### `FormField`, `SectionHeader`, `ConfirmActionDialog`

label·설명·오류의 `aria-describedby` 연결, 섹션 제목 배치, 되돌리기 어려운 작업의
확인 절차. `ConfirmActionDialog`는 **실패하면 닫지 않는다**. 오류 표시는 `onError`로
호출부가 담당한다.

## 5. 컴포넌트 카탈로그

```bash
bun run dev     # http://localhost:5173/catalog
```

모든 variant, 상태, 긴 한국어 문구를 한 화면에서 확인한다. **새 화면을 만들기 전에
여기서 쓸 컴포넌트를 먼저 찾는다.** production 빌드에서는 import 자체가 제거되어
번들에 포함되지 않고 경로로도 접근할 수 없다.

## 6. 포스터 이미지

`public/posters/`에 실제 세로형 포스터 5장이 있다. 목 데이터가 이 파일들을 가리킨다.
한 건(`오픈 동방`)만 이미지를 비워 두어 "포스터 없음" 대체 화면을 확인할 수 있게 했다.

대체 화면은 조용하다. 자리표시자가 실제 포스터보다 눈에 띄면 화면의 정보 위계가
무너진다. 오류 코드는 절대 띄우지 않는다.

## 7. 변경 이력

| 시점 | 내용 |
|---|---|
| Phase 00-B | 토큰 체계와 shadcn 도입. 보라 계열, 파스텔 아이콘 칩 |
| Phase 00-C | 화면을 토큰으로 전환 |
| 정리 1차 | 장식 제거, 중성 회색조로. 대비까지 함께 낮아진 것이 문제 |
| 정리 2차 | Pretendard 실제 도입(그때까지 로드된 적이 없었다), 타입 스케일과 대비 재설계 |
| **현재** | **Claude Design "Flyer.G 디자인 v2"를 기준으로 재구성.** 상단 내비게이션, 흰 카드, 단색 강조, 상태 문장, 실제 포스터 |

## 8. 남은 일

- **실제 브라우저 시각 검증이 아직이다.** 이번 재구성은 빌드·테스트·정적 토큰 검사로만
  확인했다. `bun run dev`로 세 화면과 `/catalog`을 직접 볼 것.
- 디자인 파일의 검토 상세(2c)와 게시 신청(2d) 화면은 아직 구현하지 않았다.
  Phase 02와 04에서 만든다.
- TV 플레이어의 운영/미리보기 모드 분리, 실제 QR, 페이지 단위 순환은 Phase 05 범위다.
- 좁은 화면의 대체 내비게이션은 Phase 01 범위다.
