# Phase 06 - 오프라인 캐시와 기기 런타임

## Agent 실행 명령

```text
Phase 06을 구현해줘. Phase 05 플레이어에 버전된 편성·미디어 캐시, 만료 필터, 재연결 backoff, heartbeat와 play-event queue를 추가해. 캐시가 오래되거나 손상되어도 만료 콘텐츠와 민감 정보를 노출하지 않게 해. 브라우저 API를 adapter로 격리하고 결정론적 테스트를 작성해. 관리자 기기 관리 UI는 구현하지 마. 커밋은 하지 마.
```

## 목표

Raspberry Pi/Chromium kiosk에서 네트워크 단절과 프로세스 재시작을 견디며 마지막 유효 편성을 안전하게 재생한다.

## 관련 기능

- `FR-PLY-07`, `FR-PLY-08`
- `FR-DASH-03`의 play-event 수집 클라이언트 부분
- 인수 테스트 `AT-04`, `AT-06`
- 제품 명세 9.2~9.3, 9.7

## 선행 조건

- Phase 05 완료
- 캐시 저장 한도와 credential 주입 방식이 미확정이면 합리적 개발 기본값을 config로 두고 문서화

## 구현 범위

### 1. 버전된 로컬 저장

- playlist metadata와 media cache를 분리
- IndexedDB 또는 동등한 비동기 저장소
- schema version과 migration/clear 전략
- playlistVersion, checksum, fetchedAt, expiresAt 저장
- credential, auth header, 개인정보를 캐시하지 않음
- write 실패가 플레이어 렌더를 중단하지 않음

### 2. 미디어 사전 로드

- 새 편성 수신 후 필요한 미디어 preload
- checksum 또는 버전으로 재사용
- 완전히 준비된 편성만 last-known-good로 승격
- 저장 공간 부족 시 오래되고 참조되지 않는 미디어 제거
- 손상 media는 폐기하고 온라인이면 재다운로드

### 3. 오프라인 선택 규칙

우선순위:

1. 최신 온라인 유효 편성
2. 마지막 검증 완료 캐시 편성
3. 안전한 브랜드 fallback

- 캐시에서도 `startAt <= now < endAt` 적용
- Ziggle URL·이미지 오류 항목 제외
- 모두 만료되면 빈 상태
- 브라우저 online 이벤트만 믿지 않고 실제 요청 결과 사용

### 4. 재시도

- 지수 backoff + jitter
- 성공 후 정상 refresh interval 복귀
- visibility 복귀와 네트워크 복구 시 즉시 한 번 재시도
- 중복 poll 방지
- AbortController로 unmount·새 요청 시 취소

### 5. heartbeat

- 기기 ID, 앱 버전, playlist version, 마지막 렌더 성공, 해상도
- 저장 공간 정보는 브라우저가 허용하는 범위에서만
- heartbeat 실패가 화면을 중단하지 않음
- queue 무한 증가 방지
- 민감 정보와 screenshot 미전송

### 6. play event

- 실제 화면에 성공적으로 표시된 시점에 기록
- session ID, submission ID, revision, device ID, startedAt, duration 또는 완료 상태
- 중복 전송을 줄이는 event ID
- 오프라인 queue와 batch 재전송
- 최대 보관 개수·기간 제한
- 실제 사람이 봤다고 표현하지 않고 `노출 이벤트`로 명명

### 7. 런타임 안전성

- React error boundary와 자동 복구 시도
- 앱 버전 표시를 운영 진단용 숨김 영역 또는 안전한 상태 보고에 포함
- kiosk용 전체 화면에서 scroll/cursor/debug UI 방지
- 무한 reload loop 금지

## 범위 밖

- OS systemd/Chromium 자동 시작 스크립트
- 기기 등록·token 발급 관리자 UI
- 원격 화면 캡처
- 실제 사람 조회수 추정
- 서버 경보 시스템

## 예상 변경 파일

- `src/features/display-runtime/**`
- `src/shared/storage/**`
- `src/shared/network/**`
- Phase 05 player integration
- storage/network fake와 테스트

## 인수 조건

- [ ] 온라인 재생 후 새로고침·오프라인에서도 last-known-good를 표시한다.
- [ ] 캐시된 콘텐츠도 종료 시각 이후 노출되지 않는다.
- [ ] 부분 다운로드 편성을 유효 캐시로 승격하지 않는다.
- [ ] 재시도가 중복 poll이나 요청 폭주를 만들지 않는다.
- [ ] heartbeat/play-event 실패가 화면을 중단하지 않는다.
- [ ] 이벤트 queue에 크기·기간 상한이 있다.
- [ ] 저장소 손상·quota 오류에 fallback한다.
- [ ] credential과 민감 데이터가 저장되지 않는다.
- [ ] lint, test, build가 통과한다.

## 필수 테스트

- online → offline → reconnect
- 캐시 만료와 부분 만료
- schema version 불일치·손상·quota 오류
- backoff fake timer
- heartbeat queue 상한
- play-event idempotency와 batch 재전송
- error boundary 복구

## 검증 명령

```bash
bun run lint
bun run test
bun run build
```

브라우저 개발자 도구의 offline 모드와 페이지 reload를 이용한 수동 검증도 수행한다.

## 다음 Phase 인계

- 저장 schema와 migration version
- last-known-good 승격 조건
- heartbeat/play-event payload 계약
- 운영 환경에서 확인할 저장 용량·refresh 기본값
