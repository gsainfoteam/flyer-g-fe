# 프론트엔드 아키텍처 (Phase 00-A 기준)

> 대상: 이후 Phase를 맡는 사람과 Agent
> 범위: 구조, 도메인 타입, API 경계, mock, 테스트 기반
> 디자인 토큰과 공통 UI는 Phase 00-B에서 다룬다.

## 디렉터리 경계

```text
src/
├─ app/providers/     앱 전역 provider (서버 상태, repository 주입)
├─ entities/          도메인 타입과 순수 규칙 (submission, review, device, media, playlist)
├─ shared/
│  ├─ api/            transport, 오류 모델, repository 인터페이스, query key
│  ├─ config/         환경 변수 파싱·검증
│  └─ lib/            날짜, clock, Ziggle URL 등 순수 함수
├─ mocks/             개발·테스트 fixture와 in-memory repository
├─ components/        (기존 프로토타입 화면. Phase 00-C에서 전환 예정)
├─ data/, types/      (레거시 목 데이터·타입. adapter를 거쳐서만 참조)
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

## Phase 00-B, 00-C 인계

- `app/providers/AppProviders`는 아직 `main.tsx`에 연결하지 않았다. 화면이 repository를
  실제로 쓰기 시작하는 Phase 00-C에서 연결한다.
- 기존 세 화면은 여전히 `src/data/mockContents`와 `src/types/content`를 직접 쓴다.
  전환은 `toSignageSubmissionExpandedDto()` adapter를 거친다.
- 레거시 목 데이터의 `views`, `likes`는 새 모델로 옮기지 않았다. 대시보드의 조회수 카드와
  하드코딩 증감률은 Phase 00-C 또는 Phase 03에서 제거한다.
- 실제 HTTP repository 구현은 비어 있다. `createRepositories()`가 mock이 아닐 때 명시적으로
  실패하므로, 계약이 확정되면 이 지점부터 구현한다.
