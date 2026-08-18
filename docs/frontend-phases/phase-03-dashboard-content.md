# Phase 03 - 대시보드와 콘텐츠 관리

## Agent 실행 명령

```text
Phase 03을 구현해줘. Phase 00~02의 repository, route, submission 모델을 사용해 대시보드와 신청 상세를 실제 서버 상태 기반으로 완성해. 상태 필터, 전체 접근 가능한 목록, 상세 이력, 허용된 취소·수정 흐름을 구현하고 하드코딩된 통계는 제거해. 승인 기능은 Phase 04 범위를 침범하지 마. 커밋은 하지 마.
```

## 목표

게시자와 관리자가 콘텐츠 상태를 신뢰할 수 있게 조회하고, 신청 상세와 허용된 작업에 접근하게 한다.

## 관련 기능

- `FR-SUB-05`
- `FR-DASH-01`, `FR-DASH-02`
- 상태 모델과 권한 매트릭스

## 선행 조건

- Phase 00~02 완료
- 목록·상세 repository가 mock 또는 실제 adapter로 동작

## 구현 범위

### 1. 운영 요약

- 전체, 게시 중, 예약, 승인 대기, 종료 수
- 데이터 기준 시각 표시
- `총 조회수`와 하드코딩 증감률 제거
- 노출 API가 없으면 노출 통계를 만들지 않음
- 역할에 따라 내 콘텐츠 또는 전체 운영 통계 구분

### 2. 콘텐츠 목록

- 상태 탭: 전체, 작성 중, 승인 대기, 반려, 승인/예약, 게시 중, 종료, 중단/취소
- 4개 slice 제한 제거
- pagination 또는 load-more
- 로딩, 빈 상태, 오류, 재시도
- URL search params에 필터·페이지 상태 반영
- 카드 또는 행에 제목, 상태, 기간, 조직, 대상 위치, thumbnail 표시

### 3. 신청 상세

- `/submissions/:submissionId`
- 콘텐츠와 Ziggle 원문 링크
- 게시 기간, 대상, 현재 상태
- review/revision 타임라인
- 반려·중단 사유
- 권한과 상태에 따른 작업 버튼

### 4. 게시자 작업

- 제출 전 draft 수정
- 반려 건 복사·수정 후 재신청 진입
- 시작 전 취소
- 게시 중인 건은 직접 삭제하지 않고 중단 요청 또는 정책 안내
- optimistic update는 되돌리기 가능한 작업에만 적용

### 5. 캐시 일관성

- 생성·수정·취소 후 요약, 목록, 상세 query 무효화
- 서버 응답 상태를 클라이언트가 임의 계산해 덮어쓰지 않음
- URL과 query key 규칙 문서화

## 범위 밖

- 승인, 반려, 강제 중단 mutation
- 노출 통계 수집
- 기기 상태 관리
- 고급 검색·정렬(P1)

## 예상 변경 파일

- `src/features/dashboard/**`
- `src/features/submissions/list/**`
- `src/features/submissions/detail/**`
- 기존 `components/dashboard/**`
- route와 query key 모듈
- 테스트와 mock handler

## 인수 조건

- [ ] 모든 콘텐츠가 pagination을 통해 접근 가능하다.
- [ ] 필터가 URL에 반영되고 새로고침 후 유지된다.
- [ ] 통계가 같은 데이터 기준과 시각을 사용한다.
- [ ] 하드코딩된 증감률과 의미 불명 조회수가 없다.
- [ ] 상세에서 상태·revision·사유를 확인할 수 있다.
- [ ] 역할과 상태에 맞지 않는 작업이 표시·실행되지 않는다.
- [ ] 생성·취소 후 대시보드와 상세가 일관되게 갱신된다.
- [ ] lint, test, build가 통과한다.

## 필수 테스트

- 상태별 필터와 URL 동기화
- pagination 경계
- 역할별 목록 범위와 작업 버튼
- 취소 성공·실패 rollback
- 상세 not-found와 권한 없음
- 요약 통계 계산 또는 API mapping

## 검증 명령

```bash
bun run lint
bun run test
bun run build
```

## 다음 Phase 인계

- 목록·상세 query key
- mutation 후 invalidate 규칙
- 상세 페이지의 관리자 action slot
- revision/review 타임라인 모델
