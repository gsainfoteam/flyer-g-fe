# Flyer.G 프론트엔드 개발 Phase 실행 가이드

이 디렉터리의 문서는 `docs/product-spec.md`를 실제 프론트엔드 구현 작업으로 분해한 Agent용 작업 지시서다.

## 실행 원칙

1. Phase는 기본적으로 번호 순서대로 실행한다.
2. 각 Agent는 담당 Phase 문서와 `docs/product-spec.md`를 먼저 읽는다.
3. 이전 Phase의 완료 조건과 인계 메모를 확인한 뒤 작업한다.
4. 범위 밖 기능을 미리 구현하지 않는다.
5. 실제 Ziggle API가 확인되지 않은 부분은 타입이 명확한 adapter와 mock으로 격리한다. 추측한 운영 API를 코드에 고정하지 않는다.
6. 사용자의 기존 변경사항을 되돌리거나 덮어쓰지 않는다.
7. 별도 요청이 없으면 커밋하지 않는다.
8. 각 Phase 종료 시 lint, build, 해당 테스트를 실행하고 결과와 남은 위험을 보고한다.

## Phase 구성

| Phase | 문서 | 목표 | 주요 선행 조건 |
|---|---|---|---|
| 00 | [기반 정비](./phase-00-foundation.md) | shadcn 기반 디자인 시스템·공통 UI, 구조, API·테스트 기반 | 없음 |
| 01 | [라우팅·인증](./phase-01-routing-auth.md) | 실제 라우팅, 앱 셸, 역할 기반 접근 제어 | Phase 00 |
| 02 | [게시 신청](./phase-02-submission-studio.md) | 업로드, 폼, 미리보기, 제출 | Phase 01 |
| 03 | [대시보드·콘텐츠](./phase-03-dashboard-content.md) | 목록, 상세, 상태, 취소·수정 | Phase 02 |
| 04 | [검토·승인](./phase-04-review-workflow.md) | 승인, 반려, 중단, 감사 표시 | Phase 03 |
| 05 | [TV 플레이어](./phase-05-display-player.md) | 유효 편성, 단일/4분할, 실제 QR | Phase 00; Phase 01의 라우팅 구조 |
| 06 | [오프라인·기기 런타임](./phase-06-offline-device.md) | 캐시, 재시도, heartbeat, kiosk 안전성 | Phase 05 |
| 07 | [통합·품질·출시 준비](./phase-07-integration-quality.md) | 실제 계약 연결, E2E, 접근성, 성능 | Phase 00~06 |

권장 실행 순서는 `00 → 01 → 02 → 03 → 04 → 05 → 06 → 07`이다. 팀이 병렬 작업해야 한다면 Phase 01 완료 후 `02~04` 트랙과 `05~06` 트랙을 분리할 수 있지만, 공유 타입과 렌더러 변경은 Phase 00의 public API를 지켜야 한다.

## 공통 시작 프롬프트

아래 문장에서 Phase 문서 경로만 바꿔 Agent에게 전달한다.

```text
이 저장소에서 docs/product-spec.md와 docs/frontend-phases/<담당-phase>.md를 읽고, 담당 Phase만 구현해줘. 문서의 범위, 금지 범위, 인수 조건, 검증 절차를 준수하고 기존 사용자 변경사항을 보존해. 실제 API 계약이 없으면 운영 endpoint를 추측하지 말고 adapter/mock 경계로 격리해. 완료 후 변경 파일, 검증 결과, 미완료·블로커, 다음 Phase 인계사항을 보고해. 커밋은 하지 마.
```

## 공통 완료 보고 형식

```text
- 구현 완료: [기능 ID와 결과]
- 변경 파일: [경로]
- 검증: [실행 명령과 결과]
- 미완료/블로커: [없음 또는 구체적 내용]
- 다음 Phase 인계: [공개 타입, API, 주의사항]
```

## 공통 품질 기준

- TypeScript에서 새 `any` 사용 금지
- 화면 컴포넌트에서 직접 `fetch` 금지
- 서버 데이터와 UI 표시 모델의 변환 경계 유지
- 날짜 저장·통신은 UTC, 표시는 `Asia/Seoul`
- 로딩, 빈 상태, 오류, 권한 없음 상태 구현
- 버튼과 입력 요소의 키보드 접근성 및 명확한 label 제공
- 목 데이터는 개발 전용 경계를 벗어나지 않음
- 테스트가 외부 네트워크나 실제 시간에 의존하지 않음
