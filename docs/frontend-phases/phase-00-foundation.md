# Phase 00 - 프론트엔드 기반 정비

## Agent 실행 명령

```text
Phase 00을 구현해줘. docs/product-spec.md와 이 문서를 먼저 읽고, 현재 UI의 장점을 바탕으로 디자인 원칙과 토큰을 정립해. 범용 UI primitive는 직접 재구현하지 말고 현재 React 19·Tailwind CSS 4 환경과 호환되는 공식 shadcn/ui 설치 방식을 확인해 필요한 컴포넌트만 프로젝트 소스로 추가하고, Flyer.G 고유 의미를 가진 컴포넌트만 이를 조합해 개발해. 모든 상태와 접근성을 컴포넌트 카탈로그에서 검증한 뒤 애플리케이션 구조, 도메인 타입, API 경계, 테스트 기반을 정비해. 운영 API endpoint는 추측하지 말고 mock 가능한 adapter를 만들어. 개별 기능 화면의 완성은 이후 Phase에 남기고, 검증 후 인계사항을 보고해. 커밋은 하지 마.
```

## 목표

현재 `App.tsx`와 목 데이터에 결합된 프로토타입을 이후 Phase가 안전하게 확장할 수 있는 구조로 바꾼다. 동시에 Flyer.G의 일관된 시각 언어와 재사용 가능한 UI 기반을 확정하여 이후 Agent가 임의의 색상·간격·컴포넌트를 반복해서 만들지 않게 한다. 이 Phase의 결과는 새로운 사용자 기능이 아니라 기술 및 디자인 기반이다.

## 관련 명세

- 제품 명세 6장 상태·데이터 모델
- 제품 명세 8장 개념 API 계약
- 제품 명세 9.6 접근성
- 제품 명세 12장 프로토타입 차이

## 선행 조건

- 없음
- 현재 작업 트리의 수정·삭제 파일을 먼저 확인하고 보존한다.

## 구현 범위

### 1. 기능 중심 구조

권장 경계이며 저장소 상황에 맞게 이름은 조정할 수 있다.

```text
src/
├─ app/                 # provider, route-independent app setup
├─ features/            # submissions, reviews, dashboard, display
├─ entities/            # submission, review, device의 타입·표시 모델
├─ shared/
│  ├─ api/              # transport, error, adapter
│  ├─ config/           # 환경 변수 파싱
│  ├─ lib/              # 날짜, 상태 계산 등 순수 함수
│  └─ ui/               # 공통 UI
└─ mocks/               # 개발·테스트 fixture와 handler
```

기존 컴포넌트를 한 번에 전부 이동하지 않는다. 이후 Phase가 사용할 경계부터 만들고 import를 점진적으로 전환한다.

### 2. 디자인 방향과 토큰

현재 프로토타입의 밝고 친근한 violet 계열 분위기를 출발점으로 삼되, 단순히 기존 hardcoded 값을 모으는 데 그치지 않고 다음 제품 특성에 맞는 디자인 원칙을 먼저 문서화한다.

- 캠퍼스 구성원이 처음 봐도 이해하기 쉬운 명료함
- 관리자가 많은 콘텐츠를 빠르게 판단할 수 있는 정보 밀도
- 승인·반려·중단처럼 중요한 상태와 작업의 명확한 구분
- TV와 관리자 웹이 같은 브랜드로 느껴지는 일관성
- 원거리 TV 가독성과 관리자 웹 접근성을 모두 만족
- 장식보다 콘텐츠와 상태를 우선

다음 항목을 semantic design token으로 정의한다.

- 색상: brand, background, surface, border, text, muted, focus
- 상태 색상: info, success, warning, danger와 각 foreground/background
- typography: font family, display/heading/body/label/caption 크기·굵기·행간
- spacing: 4px 기반 간격 체계
- radius: control, card, dialog, pill
- shadow: card, floating, dialog
- motion: duration, easing, reduced-motion
- layout: 관리자 shell 폭, 콘텐츠 최대 폭, breakpoint
- layer: header, dropdown, dialog, toast의 z-index 체계

구현 규칙:

- CSS custom property 또는 Tailwind theme를 단일 원천으로 사용한다.
- shadcn/ui의 theme 변수를 Flyer.G semantic token에 연결하고, 생성된 컴포넌트 내부 색상을 화면별로 덮어쓰지 않는다.
- 컴포넌트에서 임의 hex, 임의 shadow, 임의 z-index 추가를 피한다.
- light theme를 MVP 기본으로 하며 dark theme는 범위 밖이다.
- 상태 색상과 브랜드 색상을 혼용하지 않는다.
- 디자인 결정과 사용 예시는 `docs/design-system.md` 또는 동등한 문서에 기록한다.

### 3. shadcn/ui 도입 전략

shadcn/ui를 범용 UI primitive의 기본 선택으로 사용한다. shadcn/ui는 runtime component package가 아니라 프로젝트에 소스를 생성해 소유하는 방식이므로, 추가된 파일도 프로젝트 코드와 동일하게 검토·테스트·유지보수한다.

#### 초기 설정

- 구현 시점의 공식 shadcn/ui 문서에서 React 19와 Tailwind CSS 4에 맞는 설치 절차를 확인한다.
- `components.json`의 alias를 프로젝트 구조에 맞게 설정한다.
- 생성 위치는 `src/shared/ui`를 우선하되, CLI와 alias 호환성이 더 좋은 구조가 있다면 이유를 문서화하고 일관되게 사용한다.
- class 병합 utility와 icon 체계를 하나로 통일한다.
- 패키지 매니저는 현재 저장소의 Bun을 유지한다.
- 공식 registry의 안정된 컴포넌트를 우선하고 출처가 불명확한 third-party registry는 사용하지 않는다.
- 필요한 컴포넌트만 추가하며 전체 컴포넌트를 한꺼번에 설치하지 않는다.
- shadcn 생성 파일을 수정할 때는 변경 이유와 제품 token과의 관계를 남긴다.

#### 레이어 구분

```text
src/shared/ui/          # shadcn에서 추가한 범용 primitive
src/shared/components/  # primitive를 조합한 앱 공통 컴포넌트
src/features/**         # 특정 기능에서만 쓰는 컴포넌트
```

- `Button`, `Dialog`처럼 의미가 그대로인 primitive 위에 이름만 바꾼 wrapper를 만들지 않는다.
- 공통 wrapper는 Flyer.G의 반복되는 제품 의미나 정책을 추가할 때만 만든다.
- feature 컴포넌트는 shadcn 내부 구현이 아니라 공개 props를 사용한다.
- shadcn 소스 수정과 제품 조합 컴포넌트를 구분하여 향후 재생성·비교가 가능하게 한다.

### 4. 공통 컴포넌트

이후 Phase에서 반복 사용할 최소 컴포넌트를 shadcn/ui에서 선택해 추가한다. 기존 컴포넌트가 있으면 shadcn 기반으로 교체할 가치와 회귀 위험을 검토하고, 같은 역할의 컴포넌트를 중복 유지하지 않는다.

#### 입력과 작업

- shadcn `Button`: primary, secondary, outline, ghost, destructive
- `Button` size: sm, md, lg
- icon-only button은 shadcn Button의 icon size를 사용하고 명확한 accessible name 필수
- loading, disabled, destructive confirmation 상태
- shadcn `Input`, `Textarea`, `Select`
- `FormField`: label, description, required, error 연결
- checkbox/switch는 실제 사용처가 확정된 최소 variant만 구현

#### 구조와 탐색

- shadcn `Card`와 앱 공통 section header
- shadcn `Tabs`
- shadcn `Badge`와 제품 상태용 `StatusBadge`
- shadcn `Dialog`를 조합한 `ConfirmDialog`
- shadcn `DropdownMenu`
- shadcn `Pagination` 또는 load-more primitive

#### 피드백

- shadcn에서 현재 권장하는 toast/notification 컴포넌트와 provider
- shadcn `Skeleton` 및 필요한 최소 `Spinner`
- shadcn primitive를 조합한 `EmptyState`
- shadcn primitive를 조합한 `ErrorState`와 retry action
- shadcn `Alert`: info, warning, danger, success의 semantic variant

#### 구현 품질

- `className` 확장과 ref 전달 정책을 일관되게 유지한다.
- variant와 size는 shadcn 컴포넌트 API 및 variant 체계를 사용하고 화면에서 문자열 조합으로 재구현하지 않는다.
- hover, active, focus-visible, disabled, loading 상태를 모두 정의한다.
- form control의 label, description, error를 `aria-describedby`로 연결한다.
- Dialog는 focus trap, Escape, focus restore를 지원한다.
- 상태를 색상만으로 전달하지 않는다.
- 버튼 내부 icon 크기와 간격을 공통 규칙으로 관리한다.
- 과도한 추상화는 피하고 실제 P0 화면에서 반복되는 요소부터 구현한다.
- shadcn primitive가 제공하는 접근성 동작을 임의 override로 훼손하지 않는다.
- shadcn을 사용했다는 이유만으로 접근성이 보장된다고 가정하지 않고 앱 사용 방식으로 다시 테스트한다.

### 5. Flyer.G 제품 공통 컴포넌트

다음은 shadcn primitive를 그대로 노출하는 대신 제품 의미와 정책을 담아 조합한다.

- `StatusBadge`: 전체 `SubmissionStatus`의 label, icon, semantic tone
- `AsyncButton`: 중복 제출 차단과 loading label이 실제로 반복될 때만 도입
- `ConfirmActionDialog`: 승인·반려·중단 등 위험도별 확인 구조
- `PageState`: loading, empty, error, retry의 일관된 페이지 표현
- `SectionHeader`: 제목, 설명, action 배치
- `FormField`: label, description, error, required 연결 정책

포스터 렌더러, TV 레이아웃, QR 영역, 플레이어 fallback은 shadcn으로 억지로 일반화하지 않고 해당 Phase에서 Flyer.G 전용 컴포넌트로 구현한다.

### 6. 컴포넌트 카탈로그

- Storybook 또는 개발 전용 component showcase route 중 현재 저장소에 부담이 적은 하나를 선택한다.
- 추가한 모든 shadcn primitive와 Flyer.G 공통 컴포넌트의 variant, size, loading, disabled, error, 긴 한국어 문구를 한 화면에서 확인할 수 있게 한다.
- production 사용자가 개발 카탈로그에 접근할 수 없게 한다.
- 최소 320px 관리자 화면과 일반 desktop 폭에서 overflow를 확인한다.
- 카탈로그는 이후 Agent가 컴포넌트를 찾고 재사용하는 기준 문서다.

### 7. 도메인 타입

- `SignageSubmission`, `SubmissionStatus`, `MediaAsset`, `Review`, `DisplayDevice`
- API DTO와 UI 표시 모델을 구분
- 상태는 제품 명세의 전체 상태를 표현
- 날짜는 API DTO에서 ISO 8601 문자열로 표현
- 상태 label, tone 매핑을 한곳에서 관리
- 기존 `NoticeContent`는 호환 adapter를 거쳐 새 모델로 변환

### 8. API 경계

- 화면에서 직접 `fetch`하지 않도록 transport/client 계층 생성
- `SubmissionRepository`, `ReviewRepository`, `DisplayRepository` 또는 동등한 인터페이스 정의
- 표준 오류 모델: `code`, `message`, `requestId`, HTTP status
- AbortSignal 지원
- 런타임 환경 변수 검증: API base URL, mock 사용 여부
- 운영 URL이 없을 때 개발 mock adapter 사용
- 제품 명세의 개념 endpoint를 실제 endpoint로 확정한 것처럼 하드코딩하지 않음

### 9. 서버 상태 및 테스트 기반

- 프로젝트에 적합한 최신 서버 상태 관리 도구를 패키지 매니저로 추가
- Vitest와 React Testing Library 기반 설정
- API mock 도구를 도입하거나 동일 수준의 결정론적 fake adapter 구성
- 고정된 테스트 clock과 대표 fixture 제공
- `test` 스크립트 추가

### 10. 공통 UI 상태

- 로딩, 빈 상태, 오류, 재시도 컴포넌트
- toast의 timeout 정리와 중복 호출 안전성 개선
- 오류 화면에 내부 stack, token, request body가 노출되지 않도록 함
- 공통 피드백 컴포넌트는 앞서 정한 design token과 variant를 사용
- 기존 `StatCard`, `StatusBadge` 등은 새 공통 기반으로 옮길 가치가 있는지 검토하고 중복 스타일을 제거

## 범위 밖

- 실제 로그인
- 실제 파일 업로드
- 승인·반려 UI
- TV 오프라인 캐시
- 각 기능 화면의 최종 레이아웃 및 전면 재디자인
- dark theme와 별도 모바일 앱 디자인
- 사용처가 없는 대규모 범용 컴포넌트 라이브러리
- shadcn 전체 컴포넌트 일괄 설치
- shadcn과 역할이 겹치는 자체 primitive 재개발
- 출처가 불명확한 third-party shadcn registry 사용
- Ziggle 운영 API를 추측한 구현

## 예상 변경 파일

- `package.json`, lockfile
- `src/app/**`
- `src/entities/**`
- `src/shared/**`
- `src/mocks/**`
- `components.json`
- `docs/design-system.md` 또는 동등한 디자인 시스템 문서
- Storybook 또는 개발 전용 컴포넌트 카탈로그
- 테스트 설정 파일
- 필요한 범위의 기존 타입·목 데이터 adapter

## 인수 조건

- [ ] `App.tsx`가 도메인 fixture와 비즈니스 계산을 직접 소유하지 않는다.
- [ ] 화면 컴포넌트에 새 직접 `fetch` 호출이 없다.
- [ ] 모든 제품 상태를 TypeScript가 표현한다.
- [ ] API 오류와 UI 오류 표시가 분리된다.
- [ ] mock과 향후 실제 API 구현을 같은 인터페이스로 교체할 수 있다.
- [ ] 날짜·상태 순수 함수에 단위 테스트가 있다.
- [ ] 색상, typography, spacing, radius, shadow, motion이 semantic token으로 정의된다.
- [ ] shadcn/ui가 React 19·Tailwind CSS 4 및 프로젝트 alias에 맞게 설정된다.
- [ ] 필요한 shadcn 컴포넌트만 설치되고 선택 이유가 디자인 시스템 문서에 기록된다.
- [ ] Button, form control, Card, Badge, Dialog, Tabs, notification, loading/empty/error UI가 제공된다.
- [ ] Flyer.G 공통 컴포넌트와 shadcn primitive의 책임 경계가 명확하다.
- [ ] 이름만 바꾼 불필요한 wrapper와 중복 primitive가 없다.
- [ ] 공통 컴포넌트가 hover, focus-visible, disabled, loading, error 상태를 지원한다.
- [ ] 컴포넌트 카탈로그에서 모든 variant와 긴 한국어 문구를 확인할 수 있다.
- [ ] 공통 컴포넌트에 임의 hex, shadow, z-index가 반복되지 않는다.
- [ ] 키보드와 screen reader 기본 동작을 테스트한다.
- [ ] 기존 세 화면이 시각적으로 깨지지 않는다.
- [ ] lint, test, build가 통과한다.

## 필수 테스트

- 상태 label/tone 매핑
- UTC 입력의 Asia/Seoul 표시
- 기존 목 데이터를 새 모델로 변환
- API 오류 정규화
- 로딩·빈 상태·오류 컴포넌트
- Button variant, size, disabled, loading, click 차단
- FormField label/description/error 연결
- Dialog focus 이동, Escape 닫기, focus restore
- Tabs 키보드 조작
- Toast 중복 호출과 timer 정리
- StatusBadge의 상태 label과 색상 외 텍스트 표현

## 검증 명령

```bash
bun run lint
bun run test
bun run build
```

## 다음 Phase 인계

- 생성한 repository 인터페이스와 provider 위치
- 새 도메인 타입의 public import 경로
- mock 실행 방법과 대표 fixture
- 디자인 원칙, token 이름과 변경 방법
- 설치한 shadcn 컴포넌트 목록, 수정 내역, 추가 명령
- shadcn primitive와 Flyer.G 제품 컴포넌트의 public API
- 컴포넌트 카탈로그 실행 방법
- 기존 화면에서 아직 공통 컴포넌트로 전환하지 않은 부분
- 아직 legacy 타입에 의존하는 파일 목록
