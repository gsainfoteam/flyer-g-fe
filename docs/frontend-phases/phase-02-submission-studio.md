# Phase 02 - 게시 신청 스튜디오

## Agent 실행 명령

```text
Phase 02를 구현해줘. Phase 00~01의 타입·API·라우팅 경계를 사용해 `/studio`를 실제 게시 신청 흐름으로 완성해. 업로드 검증, 메타데이터 폼, 단일/4분할 공통 미리보기, 중복 제출 방지를 구현하고 mock repository와 연결해. 실제 업로드 계약이 없으면 adapter를 유지하고 endpoint를 추측하지 마. 커밋은 하지 마.
```

## 목표

완성된 포스터를 선택하고 유효한 게시 정보를 입력해 `PENDING_REVIEW` 신청을 만들 수 있게 한다.

## 관련 기능

- `FR-INT-01`, `FR-INT-02`
- `FR-SUB-01` ~ `FR-SUB-04`
- `FR-PLY-05`의 실제 QR 생성 기반

## 선행 조건

- Phase 00~01 완료
- 실제 Ziggle notice 조회와 업로드 API가 없으면 mock notice와 fake upload adapter 사용

## 구현 범위

### 1. Ziggle 공지 연결

- route query 또는 notice 선택 adapter로 `ziggleNoticeId` 수신
- 제목, 카테고리, 조직, 공식 상세 URL 자동 채움
- 공식 Ziggle HTTPS URL만 허용
- 공지가 없거나 권한이 없을 때 명확한 차단 상태
- mock에서는 실제 운영 데이터처럼 보이는 개인 정보를 넣지 않음

### 2. 업로드

- JPEG, PNG, WebP
- 최대 10MB
- 실제 MIME과 브라우저 decode 가능 여부 확인
- 최소 짧은 변 1080px 경고 또는 차단 정책을 UI에 명시
- drag/drop과 파일 선택 모두 지원
- blob URL 수명 정리
- 업로드 진행, 실패, 재시도, 교체 상태
- SVG 및 실행 가능한 형식 차단

서버 presign 계약이 미확정이면 `AssetUploadService` interface 뒤에 fake 구현을 둔다.

### 3. 폼과 검증

- 제목 1~80자
- 카테고리
- 시작·종료 date-time
- `endAt > startAt`, 과거 종료 금지
- Ziggle 상세 링크
- 선택 대상 위치와 게시자 메모는 API 준비 여부에 따라 disabled/placeholder로 명시
- 필드별 오류와 제출 요약 오류
- 입력 중 이탈 경고

### 4. 공통 미리보기

- 폼 상태 변경이 즉시 미리보기에 반영
- SINGLE과 FOUR_GRID 전환
- 실제 Phase 05 플레이어가 재사용할 표현 컴포넌트와 props 계약 생성
- object-fit 동작과 안전 여백 확인
- 실제 스캔 가능한 QR 생성
- QR 값의 단일 원천은 `detailUrl`

### 5. 제출

- 제출 버튼 중복 클릭 차단
- idempotency key 생성 및 repository 전달
- 업로드 완료 후 신청 생성·submit 순서 보장
- 성공 시 신청 ID와 `PENDING_REVIEW` 표시 후 상세 route로 이동
- 실패 시 입력과 선택 파일을 가능한 범위에서 유지

## 범위 밖

- 포스터 디자인 편집기
- 다중 페이지 포스터
- 영상 업로드
- 승인 기능
- 조직별 고급 권한 관리

## 예상 변경 파일

- `src/features/submissions/create/**`
- `src/features/media-upload/**`
- `src/features/display-preview/**`
- 기존 `components/studio/**`
- 공통 poster renderer와 QR 컴포넌트
- 관련 테스트와 mock handler

## 인수 조건

- [ ] 유효한 이미지와 입력으로 승인 대기 신청을 1건 생성한다.
- [ ] 더블 클릭해도 신청이 중복 생성되지 않는다.
- [ ] 제목·카테고리·기간·링크 변경이 미리보기에 반영된다.
- [ ] QR을 실제 QR decoder 또는 테스트로 검증할 수 있다.
- [ ] 잘못된 형식, 용량, 기간, 도메인은 제출되지 않는다.
- [ ] 업로드 실패 후 폼 값을 잃지 않고 재시도할 수 있다.
- [ ] blob URL이 교체·unmount 시 해제된다.
- [ ] 키보드만으로 폼 제출이 가능하다.
- [ ] lint, test, build가 통과한다.

## 필수 테스트

- 파일 형식·크기·해상도 검증
- 날짜 경계와 Asia/Seoul 변환
- 폼 변경의 미리보기 반영
- idempotent 제출
- 업로드 실패 후 재시도
- 허용되지 않은 Ziggle URL 차단

## 검증 명령

```bash
bun run lint
bun run test
bun run build
```

## 다음 Phase 인계

- 신청 생성 mutation과 반환 모델
- 공통 poster renderer의 public props
- upload adapter 상태와 실제 API 연결에 필요한 항목
- 폼 draft 또는 이탈 경고 정책
