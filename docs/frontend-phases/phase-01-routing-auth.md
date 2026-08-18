# Phase 01 - 라우팅, 앱 셸, 인증·권한

## Agent 실행 명령

```text
Phase 01을 구현해줘. Phase 00 결과와 docs/product-spec.md를 기준으로 pathname 수동 분기를 실제 라우팅으로 교체하고, Ziggle 인증 adapter와 역할 기반 route guard를 구현해. 인증 계약이 미확정이면 mock session으로 동작하게 하되 보안 결정을 추측하지 마. 기존 화면을 보존하고 이 Phase 범위만 작업해. 커밋은 하지 마.
```

## 목표

URL, 레이아웃, 인증 상태, 사용자 역할을 애플리케이션의 명시적 기반으로 만든다.

## 관련 기능

- `FR-AUTH-01`
- 사용자·권한: 제품 명세 3장
- 화면 구조: 제품 명세 11장

## 선행 조건

- Phase 00 완료
- Ziggle 인증 방식이 확정되지 않았다면 `AuthProvider` adapter와 mock session까지만 구현

## 구현 범위

### 1. 실제 라우팅

- 프로젝트에 적합한 최신 라우터 도입
- 최소 route:
  - `/`
  - `/studio`
  - `/submissions/:submissionId`
  - `/reviews`
  - `/reviews/:submissionId`
  - `/display/:deviceId`
  - `/login` 또는 외부 인증 callback 경로
  - not-found
- anchor 기반 내부 이동을 router link/navigation으로 전환
- 직접 URL 접근과 새로고침 지원

### 2. 앱 셸

- 관리 화면과 TV 플레이어 셸 분리
- 관리자 셸: Sidebar, TopHeader, 본문 outlet
- 등록 화면이 독립 셸을 유지해야 한다면 route layout으로 표현
- 플레이어 route에는 관리자 내비게이션을 렌더링하지 않음
- 모바일 내비게이션의 최소 접근 경로 제공

### 3. 인증 상태

- 상태: initializing, authenticated, unauthenticated, error
- 세션 사용자: id, displayName, roles, organizationIds
- 로그인 시작, callback 처리, logout, 세션 만료 처리의 adapter 계약
- 로그인 후 원래 경로 복귀
- 실제 비밀번호·token을 localStorage에 직접 저장하지 않음

### 4. 역할 기반 접근

- Submitter: studio와 본인 신청
- Admin/Reviewer: reviews와 관리 기능
- Super Admin: 향후 displays/audit 접근이 가능한 guard 구조
- Device: 사용자 route guard와 분리
- 숨긴 버튼만으로 보안을 대신하지 않고 서버 권한 검증이 필요함을 API 계층에 유지

### 5. 개발 모드

- mock session에서 역할 전환 가능
- production build에서 개발 전용 역할 전환 UI가 노출되지 않음
- 환경 변수로 mock auth 활성화

## 범위 밖

- Ziggle 공지 작성 화면 자체 수정
- 신청 폼의 실제 제출
- 승인·반려 동작
- 기기 token 발급 UI
- 미확정 OAuth endpoint 하드코딩

## 예상 변경 파일

- `src/app/router/**`
- `src/app/providers/**`
- `src/features/auth/**`
- `src/components/layout/**`
- `src/App.tsx`, `src/main.tsx`
- 인증·라우팅 테스트

## 인수 조건

- [ ] `window.location.pathname` 조건문이 제거된다.
- [ ] 새로고침과 직접 URL 접근이 정상 동작한다.
- [ ] 비로그인 관리 route 접근 시 로그인 흐름으로 이동한다.
- [ ] 로그인 후 원래 경로로 복귀한다.
- [ ] 역할 없는 사용자는 reviews에 접근할 수 없다.
- [ ] TV route는 사용자 로그인을 요구하지 않고 기기 인증 경계만 가진다.
- [ ] mock auth가 production에서 자동 활성화되지 않는다.
- [ ] not-found, 인증 초기화, 인증 오류 상태가 있다.
- [ ] lint, test, build가 통과한다.

## 필수 테스트

- route guard 역할별 허용·차단
- return URL 복원
- 관리자 셸과 플레이어 셸 분리
- 알 수 없는 route 처리
- 만료 세션 처리

## 검증 명령

```bash
bun run lint
bun run test
bun run build
```

## 다음 Phase 인계

- route 목록과 path 생성 helper
- `useAuth` 또는 동등한 public API
- 역할 이름과 guard 사용법
- 실제 Ziggle 인증 연결에 남은 계약 항목
