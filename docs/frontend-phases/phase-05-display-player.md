# Phase 05 - TV 디스플레이 플레이어

## Agent 실행 명령

```text
Phase 05를 구현해줘. Phase 00의 DisplayRepository와 Phase 02의 공통 poster renderer를 사용해 `/display/:deviceId`를 운영 가능한 읽기 전용 플레이어로 구현해. 서버 편성만 소비하고 승인 상태를 클라이언트가 임의 생성하지 마. SINGLE/FOUR_GRID, 자동 순환, 실제 QR, 빈 상태와 미디어 오류 격리를 구현해. 오프라인 영속 캐시는 Phase 06 범위로 남겨. 커밋은 하지 마.
```

## 목표

1920x1080 가로 화면에서 서버가 제공한 유효 편성을 안정적으로 재생하는 플레이어를 만든다.

## 관련 기능

- `FR-PLY-01` ~ `FR-PLY-06`
- 제품 명세 9.1~9.3, 9.6
- 인수 테스트 `AT-06`

## 선행 조건

- Phase 00 완료
- Phase 01 route 셸 구조 완료
- Phase 02의 공통 미리보기 renderer가 있으면 재사용하고, 없으면 미리보기에서도 재사용 가능한 renderer를 만든다.

## 구현 범위

### 1. 편성 조회

- `deviceId`별 playlist query
- 응답: serverTime, playlistVersion, refreshAfterSeconds, layout, items
- AbortSignal과 조건부 refetch 지원
- refresh 간격을 안전한 최소·최대 범위로 clamp
- 서버가 보내지 않은 `scheduled` 항목을 임의로 추가하지 않음
- 방어적으로 현재 시각 기준 만료 항목을 렌더링하지 않음

### 2. 기기 인증 경계

- 사용자 session과 분리된 device credential adapter
- token 값을 URL query에 넣지 않음
- 인증 실패 시 공개 화면에 token이나 내부 오류를 노출하지 않음
- 실제 credential 주입 방식 미확정 시 interface와 개발 mock만 구현

### 3. 레이아웃

- SINGLE: 포스터 1개와 제목·카테고리·일시·장소·주최·QR
- FOUR_GRID: 한 페이지 최대 4개
- 부족한 slot은 콘텐츠 복제 대신 브랜드 fallback
- 1920x1080 기준으로 overflow와 clipping 없음
- 이미지 `object-fit` 정책이 미리보기와 동일

### 4. 순환

- 서버 `rotationSeconds`, 안전 범위 5~60초
- FOUR_GRID는 페이지 단위 순환
- 목록 갱신 시 동일 항목을 가능하면 유지
- 목록이 비거나 항목 수가 1이면 불필요한 timer 없음
- timer cleanup과 background tab 복귀 처리
- 운영 모드에서는 switcher, pagination button, pause button 숨김
- 명시적 preview mode에서만 컨트롤 표시

### 5. QR과 가독성

- `detailUrl`로 실제 QR 생성
- TV 시청 거리에서 충분한 크기·quiet zone·대비
- `Ziggle에서 자세히 보기` 문구
- 제목과 필수 정보가 긴 경우 안전한 line clamp
- 현재 시각은 Asia/Seoul로 표시

### 6. 실패 격리

- 이미지 preload 실패 시 해당 항목 skip
- 한 항목 실패가 전체 플레이어를 중단하지 않음
- 유효 항목 없음: 브랜드, 현재 시각, 안내 문구
- playlist 실패: 현재 메모리 목록이 있으면 유지, 없으면 안전 fallback
- 내부 stack과 credential 비노출

## 범위 밖

- IndexedDB/Service Worker 영속 캐시
- heartbeat와 play-event 전송
- 관리자 기기 설정 화면
- 우선순위 가중 순환
- 영상 재생

## 예상 변경 파일

- `src/features/display-player/**`
- `src/entities/display/**`
- 기존 `components/display/**`
- 공통 poster renderer, QR, clock
- display mock과 테스트

## 인수 조건

- [ ] SINGLE과 FOUR_GRID가 1920x1080에서 잘림 없이 표시된다.
- [ ] 예약 전·만료·중단 항목을 방어적으로 노출하지 않는다.
- [ ] 4개 초과 콘텐츠가 페이지 단위로 순환한다.
- [ ] 깨진 이미지 하나를 건너뛰고 재생을 계속한다.
- [ ] 실제 QR이 `detailUrl`로 decode된다.
- [ ] 운영 route에 관리자 조작 컨트롤이 없다.
- [ ] 빈 편성과 API 오류에 안전한 fallback이 있다.
- [ ] timer와 blob/image resource가 정리된다.
- [ ] lint, test, build가 통과한다.

## 필수 테스트

- playlist DTO mapping
- 만료 경계와 server/client clock 차이
- SINGLE/FOUR_GRID pagination
- 목록 갱신 시 current item 유지
- 이미지 실패 격리
- 운영/preview mode 컨트롤 가시성
- QR decode

## 검증 명령

```bash
bun run lint
bun run test
bun run build
```

추가로 1920x1080 viewport에서 브라우저 스크린샷 또는 수동 시각 검증을 수행한다.

## 다음 Phase 인계

- playlist query와 in-memory fallback 위치
- renderer 실패 callback
- 재생 index와 playlist version 관리 방식
- device credential adapter 계약
