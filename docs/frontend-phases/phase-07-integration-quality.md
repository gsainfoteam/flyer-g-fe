# Phase 07 - 실제 연동, 통합 품질, 출시 준비

## Agent 실행 명령

```text
Phase 07을 구현해줘. Phase 00~06 결과를 실제 확정된 Ziggle/사이니지 OpenAPI 계약에 연결하고, 전체 P0 흐름의 E2E·접근성·성능·보안·운영 fallback을 검증해. 계약 문서가 없거나 인증 정보가 부족하면 추측해서 연결하지 말고 블로커를 보고한 뒤 mock 기반 품질 작업만 완료해. 새 제품 기능은 추가하지 마. 커밋은 하지 마.
```

## 목표

각 기능을 실제 계약과 연결하고, `신청 → 검토 → 예약/게시 → 종료` 전체 흐름이 출시 가능한 품질인지 증명한다.

## 관련 기능

- 모든 P0 `FR-*`
- `AT-01` ~ `AT-06`
- 제품 명세 9장 비기능 요구사항
- 제품 명세 17장 완료 정의

## 선행 조건

- Phase 00~06 완료
- 실제 연결을 위해 다음이 필요:
  - Ziggle 인증 방식과 callback
  - OpenAPI 또는 확정 request/response 예시
  - 공지 ID·공식 상세 URL 규칙
  - upload/presign 계약
  - device credential 전달 방식
- 위 정보가 없으면 운영 endpoint를 추측하지 않는다.

## 구현 범위

### 1. 실제 계약 연결

- OpenAPI에서 타입을 생성하거나 검증 가능한 schema adapter 작성
- mock DTO와 실제 DTO 차이를 mapping 계층에서 해결
- auth session, notice lookup, submission, review, playlist, heartbeat, play-event 연결
- API base URL과 기능 flag를 환경별 설정
- production에서 mock fallback 금지
- request ID를 사용자 오류 보고에 포함

### 2. 통합 오류 처리

- 400 입력 오류를 필드 오류로 mapping
- 401 재인증
- 403 권한 없음
- 404 삭제·접근 불가
- 409 revision/동시 처리 충돌
- 413 파일 크기
- 422 서버 검증
- 429 재시도 안내
- 5xx 안전한 일반 오류와 request ID
- token, raw payload, stack 비노출

### 3. E2E

브라우저 E2E 도구를 프로젝트에 추가하고 최소 다음을 자동화한다.

1. 게시자 로그인 → 공지 연결 → 이미지 업로드 → 제출
2. 관리자 로그인 → 상세 검토 → 승인
3. 미래 시작 건은 플레이어에 미노출
4. 시작 시각 이후 노출, 종료 이후 제거
5. 반려 → 사유 확인 → 수정·재신청
6. 게시 중단 → 다음 playlist에서 제거
7. offline reload → last-known-good 재생 → reconnect
8. 손상 이미지 skip

실제 시간을 기다리지 않고 controllable clock 또는 테스트 fixture를 사용한다.

### 4. 접근성

- 관리 화면 자동 접근성 검사
- keyboard-only 흐름
- dialog focus 관리
- form label/error association
- 색상 외 상태 표현
- 이미지 대체 텍스트
- 모션 감소 설정 존중
- TV는 원거리 가독성 및 flashing 방지

### 5. 성능

- 관리자 초기 번들에서 플레이어 코드 분리
- route lazy loading
- 포스터 이미지 크기와 decode 비용 확인
- 1920x1080에서 30fps 목표
- Raspberry Pi 또는 유사 저사양 Chromium에서 장시간 순환 점검
- timer/listener/memory leak 점검
- 캐시 존재 시 5초 내 초기 화면 목표 측정

### 6. 보안·개인정보

- URL allowlist 우회 테스트
- 외부 링크 rel 속성
- DOM XSS 위험 검토
- token 저장·로그 확인
- production source에 mock credential 없음
- 업로드 검증은 서버 책임도 필요함을 확인
- 얼굴·Wi-Fi 식별자 등 불필요한 데이터 수집 없음

### 7. 운영 준비

- `.env.example` 또는 환경 변수 문서
- 개발/mock/production 실행법
- 기기 화면의 안전 fallback 확인
- 앱 버전과 build 식별자
- 오류·offline 상태 운영 확인 절차
- README를 기본 Vite 문서에서 실제 프로젝트 문서로 갱신

## 범위 밖

- P1 알림, 가중 우선순위, 고급 통계
- 영상·메시지 콘텐츠
- 포스터 제작 도구
- backend 또는 Ziggle 저장소 변경
- OS 배포 자동화 전체 구축

## 예상 변경 파일

- 실제 API adapter와 generated type
- 환경 설정
- E2E 설정·테스트
- 접근성·성능 보완 파일
- `README.md`, `.env.example` 등 운영 문서

## 인수 조건

- [ ] production build에서 mock API/auth가 사용되지 않는다.
- [ ] 확정 계약과 프론트 타입 사이의 mapping이 명시적이다.
- [ ] `AT-01`~`AT-06`에 대응하는 자동 또는 문서화된 검증이 있다.
- [ ] lint, unit/integration test, E2E, build가 통과한다.
- [ ] 주요 관리 화면에서 치명적 접근성 위반이 없다.
- [ ] 1920x1080 플레이어와 offline reload가 검증된다.
- [ ] token·credential·개인정보가 로그와 저장소에 남지 않는다.
- [ ] 실제 Raspberry Pi 검증이 불가능하면 이를 완료로 표시하지 않고 명확히 인계한다.
- [ ] README에 실제 실행·환경·테스트 방법이 있다.

## 필수 테스트

- 전체 P0 E2E 시나리오
- API status별 오류 mapping
- production mock 차단
- 접근성 자동 검사
- route chunk loading
- 장시간 timer/rotation 안정성
- offline storage 회귀 테스트

## 검증 명령

프로젝트에 추가한 script 이름에 맞추되 최소 다음을 제공한다.

```bash
bun run lint
bun run test
bun run build
bun run test:e2e
```

## 최종 인계

- 완료된 기능 ID 목록
- 실제 API와 mock 간 남은 차이
- 환경 변수와 secret 주입 방법
- 브라우저·해상도·기기 검증 결과
- 알려진 결함과 출시 차단 항목
- P1로 미룬 항목
