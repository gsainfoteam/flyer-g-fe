# Phase 04 - 검토, 승인, 반려, 게시 중단

## Agent 실행 명령

```text
Phase 04를 구현해줘. Phase 03의 상세·목록과 Phase 00의 review repository를 사용해 관리자 검토 흐름을 완성해. 승인, 사유 필수 반려, 동시 처리 충돌, 게시 중단, 감사 이력 표시를 구현해. 서버가 권한과 상태 전이를 최종 판단하도록 하고 클라이언트에서 성공을 가정하지 마. 커밋은 하지 마.
```

## 목표

하우스 관리자가 신청을 충분히 검토하고 안전하게 결정하며, 게시자도 결정 사유와 이력을 확인할 수 있게 한다.

## 관련 기능

- `FR-REV-01` ~ `FR-REV-05`
- `FR-AUD-01`의 프론트엔드 표시 범위
- 인수 테스트 `AT-02`, `AT-03`, `AT-05`

## 선행 조건

- Phase 00~03 완료
- Admin/Reviewer route guard 동작
- review repository가 mock 또는 실제 adapter로 동작

## 구현 범위

### 1. 승인 대기 목록

- `/reviews`
- 최신 제출 순
- thumbnail, 제목, 게시자/조직, 기간, 제출 시각
- 상태, 날짜, 조직, 카테고리 필터
- loading, empty, error
- 항목 처리 후 목록·대시보드 수치 갱신

### 2. 상세 검토

- `/reviews/:submissionId`
- 원본 포스터와 SINGLE/FOUR_GRID 미리보기
- Ziggle 원문 새 창 링크에 안전한 rel 속성
- 기간, 대상 위치, 링크, 해상도/비율 경고
- 현재 revision과 검토 revision 명시
- 이전 review history

### 3. 승인

- 확인 dialog에서 대상·기간·revision 확인
- 중복 클릭 방지
- 성공 응답의 최종 상태 사용
- 이미 다른 관리자가 처리한 409 충돌을 “새 상태 다시 불러오기”로 처리
- 성공 후 관련 query 갱신

### 4. 반려

- reason code 선택
- 게시자 공개 comment 필수
- 기타 선택 시 구체 사유 필수
- 글자 수와 공백 검증
- 제출 후 게시자 상세에 사유 표시

### 5. 게시 중단

- 예약 또는 게시 중 콘텐츠에만 제공
- 사유 필수
- 위험 동작 확인
- 성공 후 `SUSPENDED`와 이력 반영
- 화면에서 즉시 사라졌다고 단정하지 않고 서버 반영 결과 표시

### 6. 감사 표시

- 상세 타임라인에 actor 표시 정책에 맞는 이름, action, 시각, 사유
- 운영자 전용 전체 감사 화면은 범위 밖
- 민감한 raw payload를 표시하지 않음

## 범위 밖

- 권한 부여·회수 UI
- 전체 감사 로그 검색
- 다단계 승인
- 알림 채널 구현
- 중요 콘텐츠 우선순위 편성

## 예상 변경 파일

- `src/features/reviews/**`
- `src/features/submissions/detail/**`
- 기존 `components/dashboard/ApprovalPanel.tsx`
- dialog/form 공통 UI
- review mock과 테스트

## 인수 조건

- [ ] 관리자가 목록에서 상세 근거를 확인한 뒤 결정할 수 있다.
- [ ] 반려와 중단은 빈 사유로 제출되지 않는다.
- [ ] 승인한 revision이 UI에 명시된다.
- [ ] 동시 처리 충돌 시 성공 toast를 표시하지 않는다.
- [ ] 결정 후 목록, 상세, 대시보드가 일관되게 갱신된다.
- [ ] 일반 게시자는 관리자 mutation을 실행할 수 없다.
- [ ] 키보드와 focus trap이 dialog에서 정상 동작한다.
- [ ] lint, test, build가 통과한다.

## 필수 테스트

- 승인 성공·서버 검증 실패·409 충돌
- reason code별 반려 검증
- 게시 중단 확인과 취소
- 역할별 접근 차단
- mutation 후 query invalidation
- 상세 review timeline

## 검증 명령

```bash
bun run lint
bun run test
bun run build
```

## 다음 Phase 인계

- 승인 완료 모델과 플레이어가 소비할 상태 필드
- review 충돌 처리 방식
- 강제 중단 후 query 갱신 규칙
- 실제 backend 계약과 다른 mock 항목
