# 프론트엔드 아키텍처 (Phase 00 완료 기준)

> 대상: 이후 Phase를 맡는 사람과 Agent
> 범위: 구조, 도메인 타입, API 경계, mock, 테스트 기반
> 디자인 토큰과 공통 UI는 [design-system.md](./design-system.md) 참고.

## 디렉터리 경계

```text
src/
├─ app/providers/     앱 전역 provider (서버 상태, repository 주입)
├─ entities/          도메인 타입과 순수 규칙 (submission, review, device, media, playlist)
├─ shared/
│  ├─ api/            transport, 오류 모델, repository 인터페이스, query key
│  ├─ config/         환경 변수 파싱·검증
│  ├─ lib/            날짜, clock, Ziggle URL, cn 등 순수 함수
│  ├─ ui/             shadcn primitive (생성본)
│  └─ components/     primitive를 조합한 Flyer.G 제품 컴포넌트
├─ dev/               개발 전용 화면 (컴포넌트 카탈로그)
├─ mocks/             개발·테스트 fixture와 in-memory repository
├─ features/          기능별 서버 상태 hook (submissions, reviews, display)
├─ components/        화면 컴포넌트 (대시보드·스튜디오·플레이어)
├─ data/, types/      레거시 목 데이터·타입. adapter를 거쳐서만 참조
└─ test/              테스트 setup
```

`@/*` alias가 `src/*`를 가리킨다. (`vite.config.ts`, `tsconfig.app.json`)

## 핵심 규칙

1. **화면은 `fetch`하지 않는다.** `useRepositories()`로 repository를 받아 쓴다.
2. **날짜는 경계에서만 해석한다.** DTO는 ISO 8601 UTC 문자열, 도메인 모델은 `Date`,
   표시는 `Asia/Seoul`. 변환은 `shared/lib/datetime`만 쓴다.
3. **상태 문자열만 믿지 않는다.** 노출 여부는 `isDisplayable`, 표시 상태는
   `resolveEffectiveStatus`로 승인 여부와 기간을 함께 본다. (명세 6.3, FR-PLY-01)
4. **기준 시각은 주입한다.** `Clock`을 받아 쓰고 `new Date()`를 화면에서 직접 만들지 않는다.
5. **오류는 `ApiError` 하나로 좁힌다.** 화면 문구는 `toUserMessage`로만 만들고
   서버 message·stack·payload를 그대로 노출하지 않는다. (명세 8.4, 9.4)
6. **운영 endpoint를 추측하지 않는다.** 실제 경로는 계약 확정 후 Phase 07에서 붙인다.

## 공개 API

| 목적 | import 경로 |
|---|---|
| 신청 타입·상태·기간 규칙 | `@/entities/submission` |
| 검토·기기·미디어·편성 타입 | `@/entities/review`, `@/entities/device`, `@/entities/media`, `@/entities/playlist` |
| repository 인터페이스·오류·query key | `@/shared/api` |
| 날짜·시각 | `@/shared/lib/datetime`, `@/shared/lib/clock` |
| Ziggle URL 검증 | `@/shared/lib/ziggle-url` |
| repository 주입 | `@/app/providers/repositories-context` |
| shadcn primitive | `@/shared/ui/*` |
| 제품 공통 컴포넌트 | `@/shared/components` |

### 상태

`SubmissionStatus`는 명세 6.3의 10개 상태를 모두 표현한다.
label·tone·설명은 `getStatusMeta()` 한 곳에서만 정의한다. 화면에서 한글 문구를 직접 쓰지 않는다.

### query key

`queryKeys.submissions.list(params)` 처럼 도메인 → 종류 → 파라미터 순서다.
무효화는 가장 얕은 접두사(`queryKeys.submissions.all()`)를 쓴다.

## mock

`VITE_USE_MOCK_API`가 켜져 있으면 `createRepositories()`가 in-memory 구현을 준다.
기본값은 개발 true, production false이며 production에서 mock을 켜면 시작 시점에 실패한다.

mock은 화면 흐름 확인에 필요한 최소 규칙만 흉내 낸다: idempotency key 중복 생성 차단,
동시 승인 409, 사유 없는 반려·중단 422, 기간 기반 편성 필터. **권한과 상태 전이의 최종
판단은 서버 책임**이며 mock의 관대함을 계약으로 오해하면 안 된다.

## 테스트

```bash
bun run test        # 1회 실행
bun run test:watch
```

Vitest + React Testing Library + jsdom. 테스트는 실제 시간과 네트워크에 의존하지 않는다.
시각이 필요하면 `createFixedClock()`을 주입한다.

## 서버 상태 hook

화면은 repository를 직접 부르지 않고 `src/features/**/api/queries.ts`의 hook을 쓴다.

| hook | 용도 |
|---|---|
| `useSubmissionSummary(scope)` | 운영 요약 통계 |
| `useSubmissionViews(params)` | 신청 목록 (표시 모델로 변환) |
| `usePendingReviews(limit)` | 승인 대기 목록 |
| `useDisplayPlaylist(deviceId)` | 기기 편성 (만료 항목 방어적 제외) |

필터·pagination·무효화 규칙 확장은 Phase 03~05에서 한다.

## Phase 02 인계

- **신청 생성**: `SubmissionRepository.create/submit`가 mock으로 동작한다. idempotency key를
  넘기면 중복 생성되지 않는다.
- **게시 신청 화면**: `/studio`는 셸과 미리보기까지만 있다. 업로드 검증, 폼 검증,
  실제 제출, Ziggle 공지 자동 채움이 Phase 02 범위다.
- **포스터 렌더러**: `@/entities/poster`의 `PosterRenderModel`이 미리보기와 플레이어가
  공유하는 props 계약이다.
- **실제 API**: HTTP repository와 실제 인증 adapter는 비어 있다. 각각
  `createRepositories()`와 `createAuthAdapter()`가 mock이 아닐 때 명시적으로 실패한다.

### 아직 화면이 없는 경로

`ComingSoonPage`를 그린다. 경로와 권한 경계는 이미 서 있으니 해당 Phase에서 내용만 채운다.

| 경로 | 담당 |
|---|---|
| `/submissions/:submissionId` | Phase 03 |
| `/reviews/:submissionId` | Phase 04 |
| `/displays` | P1 |

## 남은 프로토타입 요소

아래는 의도적으로 남긴 것이며 담당 Phase가 처리한다.

| 항목 | 현재 상태 | 담당 |
|---|---|---|
| `QRCodeBox` | 스캔되지 않는 시드 기반 자리표시자 | Phase 02, 05 |
| 스튜디오 제출 | toast만 띄우고 서버에 저장하지 않음 | Phase 02 |
| 업로드 검증 | 형식·용량·해상도 검사 없음 | Phase 02 |
| 목록 전체 보기 | 최근 4건만 표시, pagination 없음 | Phase 03 |
| 승인·반려 동작 | 승인 대기 목록은 읽기 전용 | Phase 04 |
| 플레이어 컨트롤 | 운영 화면에도 레이아웃 전환·일시정지 노출 | Phase 05 |
| 4분할 레이아웃 | 페이지 단위 순환 아님, 1920x1080 미최적화 | Phase 05 |
| 레거시 목 데이터 | `src/data/mockContents.ts`, `src/types/content.ts` | 목 재작성 시 제거 |

## 라우팅과 셸

경로는 `src/app/router/routes.ts` 한곳에서 만든다. 화면에서 문자열을 조립하지 않는다.

| | |
|---|---|
| `paths` | route 정의에 쓰는 패턴 (`/submissions/:submissionId`) |
| `to` | 이동에 쓰는 생성기 (`to.submissionDetail(id)`) |
| `safeReturnTo` | 로그인 복귀 경로를 앱 내부 경로로 좁힌다 (열린 리다이렉트 방지) |

route 트리는 `src/app/router/route-tree.tsx`에 있다. 셸이 셋으로 나뉜다.

| 셸 | 경로 | 특징 |
|---|---|---|
| `DisplayLayout` | `/display/:deviceId` | 관리 내비게이션 없음. **사용자 로그인을 요구하지 않는다** |
| `StudioLayout` | `/studio` | 한 가지 일에 집중. 나가는 길만 |
| `AdminLayout` | 나머지 | 상단 내비게이션 + 본문(최대 1120px) + 푸터 |

## 인증

```text
src/features/auth/
├─ model/types.ts         Role, SessionUser, AuthState
├─ model/auth-context.ts  useAuth(), useSessionUser()
├─ api/auth-adapter.ts    인증 경계 (계약만)
├─ api/mock-auth.ts       개발용 구현
└─ ui/guards.tsx          RequireSession, RequireRole
```

- 실제 인증 방식은 미확정이라(명세 15장 13번) `AuthAdapter` 뒤에 둔다. 확정되면 이
  인터페이스를 구현하는 adapter만 새로 만든다.
- 토큰은 이 계층 밖으로 나가지 않는다. 화면은 `SessionUser`만 본다.
- mock은 자격 증명이 아니라 **역할 이름**만 sessionStorage에 둔다.
- `VITE_USE_MOCK_AUTH`가 production에서 켜지면 `readAppEnv()`가 시작 시점에 막는다.

### 역할

| 역할 | 볼 수 있는 곳 |
|---|---|
| `SUBMITTER` | 홈, 내 신청, 게시 신청 |
| `REVIEWER` | + 승인 대기, 검토 상세 |
| `SUPER_ADMIN` | + 기기 관리 |

역할에 없는 메뉴는 내비게이션에 그리지 않지만 **이는 편의일 뿐 보안이 아니다.**
직접 URL로 들어와도 guard가 막고, 서버가 모든 변경 요청에서 다시 검증한다.
