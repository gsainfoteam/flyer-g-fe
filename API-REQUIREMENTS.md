# 백엔드에 필요한 API

프론트엔드를 만들면서 "이 화면이 성립하려면 서버가 무엇을 줘야 하는가"를 기록한다.
**확정된 계약이 아니라 프론트의 요구사항**이다. 실제 스펙은 백엔드와 합의한 뒤
`docs/product-spec.md`와 이 문서를 함께 갱신한다.

작성 규칙

- 화면을 만들다 새 요구가 생기면 그때그때 이 문서에 추가한다.
- 프론트는 확정되지 않은 endpoint를 코드에 고정하지 않는다. 전부 adapter 뒤에 둔다.
- 합의가 끝난 항목은 상태를 `합의됨`으로 바꾸고 실제 경로·스키마를 적는다.

| 상태 | 뜻 |
|---|---|
| `필요` | 프론트가 요구하지만 아직 논의 전 |
| `논의중` | 백엔드와 이야기 중 |
| `합의됨` | 계약 확정. 프론트가 연결 가능 |

공통 전제

- 모든 시각은 UTC ISO 8601 문자열. 표시만 `Asia/Seoul`.
- 오류 응답은 `code`, `message`, `requestId`를 포함한다. 프론트는 `code`로 분기하고
  `message`를 그대로 노출하지 않는다.
- 권한은 서버가 매 요청마다 다시 판단한다. 프론트의 역할 분기는 화면 편의일 뿐이다.

---

## 1. Ziggle 공지 조회 — `필요`

**쓰는 곳**: `/studio` 진입 시 신청 폼 자동 채움 (명세 FR-INT-01)

게시 신청 하나는 Ziggle 공지 하나를 반드시 참조한다. 프론트는 `noticeId`만 알고
있으므로 제목·카테고리·조직·상세 URL을 서버에서 받아야 한다.

```http
GET /notices/{noticeId}
```

응답에 필요한 필드

| 필드 | 타입 | 왜 필요한가 |
|---|---|---|
| `id` | string | 신청의 `ziggleNoticeId` |
| `title` | string | 제목 기본값 |
| `categoryId` | string | 카테고리 기본값 |
| `organizationName` | string \| null | 미리보기 "주최" 표시 |
| `detailUrl` | string | QR과 상세 링크의 단일 원천 |
| `summary` | string \| null | 미리보기 부제 |
| `location` | string \| null | 미리보기 "장소" |
| `publishedAt` | string (ISO) | 목록 정렬 |

필요한 오류 구분

- 없는 공지 → `404 NOT_FOUND`
- 남의 공지 → `403 FORBIDDEN`
- 이미 신청된 공지 → `409 CONFLICT` (한 공지에 신청 여러 건을 허용할지 확인 필요)

**확인 필요**

1. 공지 조회 API가 존재하는가 (명세 15장 14번)
2. 공식 상세 URL 형식은 무엇인가 (명세 15장 15번). 프론트는 현재
   `https://ziggle.gistory.me` 호스트만 허용한다.
3. 기존 공지에서도 신청할 수 있는가, 공지 작성 시에만 가능한가 (명세 15장 2번)

### 1-1. 신청 가능한 내 공지 목록 — `필요`

`/studio`에 `noticeId` 없이 들어온 사용자가 공지를 고를 수 있어야 한다.

```http
GET /notices?scope=me&signageEligible=true
```

없으면 프론트는 "Ziggle에서 공지를 먼저 작성하세요"로 막는다.

---

## 2. 포스터 업로드 — `필요`

**쓰는 곳**: `/studio` 업로드 (명세 FR-SUB-01)

프론트는 업로드를 `AssetUploadService` 인터페이스 뒤에 두고 있다. 아래 중 어느
방식이든 이 인터페이스로 감쌀 수 있지만, 진행률·취소·재시도를 지원하려면
방식이 정해져야 한다.

**방식 A (권장): presign 후 직접 업로드**

```http
POST /media/uploads          → { assetId, uploadUrl, headers, expiresAt }
PUT  {uploadUrl}             (파일 본문)
POST /media/uploads/{assetId}/complete → { assetId, width, height, url }
```

**방식 B: 서버 경유 multipart**

```http
POST /media/assets  (multipart/form-data)  → { assetId, width, height, url }
```

프론트가 이미 하는 검증 (서버도 반드시 다시 해야 한다)

- MIME 허용: `image/jpeg`, `image/png`, `image/webp`
- 파일 시그니처(매직바이트) 확인. SVG·실행 파일 차단
- 최대 10MB
- 짧은 변 최소 1080px
- 브라우저 decode 가능 여부

**확인 필요**

4. Ziggle 미디어 저장소를 재사용하는가, 별도 객체 저장소인가 (명세 15장 16번)
5. 업로드 → 신청 생성 순서에서 신청되지 않은 asset(고아)은 누가 정리하는가
6. EXIF 위치 정보 제거는 서버가 하는가 (명세 FR-SUB-01은 제거를 요구한다)
7. 413(용량 초과) 응답에 서버가 허용하는 실제 한도를 담아 줄 수 있는가.
   프론트가 상수로 들고 있으면 정책 변경 때 어긋난다.

---

## 3. 게시 신청 생성·제출 — `필요`

**쓰는 곳**: `/studio` 제출 (명세 FR-SUB-02, FR-SUB-04)

프론트는 현재 2단계를 가정하고 `SubmissionRepository`에 `create`와 `submit`을
나눠 뒀다. 서버가 1단계로 받는다면 인터페이스를 합친다.

```http
POST /submissions             → 신청 생성 (DRAFT)
POST /submissions/{id}/submit → 검토 요청 (PENDING_REVIEW)
```

생성 요청 본문

| 필드 | 타입 | 비고 |
|---|---|---|
| `ziggleNoticeId` | string | 필수 |
| `title` | string | 공백 제거 후 1~80자 |
| `categoryId` | string | 아래 4절 참고 |
| `assetId` | string | 업로드 결과 |
| `detailUrl` | string | 허용된 Ziggle HTTPS URL |
| `startAt` | string (ISO) | |
| `endAt` | string (ISO) | `endAt > startAt`, 과거 종료 불가 |
| `targetGroupIds` | string[] | 대상 위치. 미확정이라 프론트는 빈 배열을 보낸다 |

응답은 `SignageSubmission` 전체. 프론트는 `id`, `status`, `version`을 쓴다.

**확인 필요**

8. 생성과 제출이 한 번의 호출인가, 두 번인가
9. idempotency key를 어떻게 받는가. 프론트는 `Idempotency-Key` 헤더를 기본으로
   가정한다. 시도 1회당 UUID 하나를 만들고 재시도에도 같은 값을 쓴다 (명세 FR-SUB-04)
10. 최대 게시 기간과 최소 사전 신청 시간 (명세 15장 4번). 정해지면 프론트도
    폼에서 미리 막는다. 지금은 서버 422에 의존한다.
11. 필드 검증 실패를 어떤 형태로 주는가. 프론트가 필드별 오류로 매핑하려면
    `{ code: "VALIDATION_FAILED", fields: { title: "..." } }` 같은 구조가 필요하다.
12. 대상 위치(`targetGroupIds`)와 게시자 메모를 MVP에서 받는가. 지금 프론트는
    두 입력을 비활성 상태로 두고 준비 중임을 표시한다.

---

## 4. 카테고리·조직 목록 — `필요`

**쓰는 곳**: 신청 폼 카테고리 선택

프론트는 지금 `src/entities/submission/model/categories.ts`에 임시 id를 정의해
두었다(`notice`, `club`, `performance`, `event`, `department`). 이건 Ziggle 분류
체계가 확정되기 전의 임시값이며, 실제 값과 다를 것이 거의 확실하다.

```http
GET /categories → [{ id, name }]
```

**확인 필요**

13. Ziggle이 카테고리와 조직 권한을 어떤 식별자로 주는가 (명세 15장 17번)
14. 카테고리를 신청에서 바꿀 수 있는가, 공지 값을 그대로 따르는가

---

## 5. 구현하면서 추가로 확인된 것 — `필요`

Phase 02(게시 신청) 구현 중에 실제로 막혔거나 가정하고 넘어간 지점이다.

### 5-1. 신청 응답에 포스터 URL이 필요하다

프론트는 `assetId`만 보내고 신청 응답을 받는다. 그런데 목록·미리보기·검토 화면은
포스터 이미지를 그려야 한다. 신청 응답(`SignageSubmission`)에 화면에 바로 쓸 수 있는
포스터 URL이 포함되어야 한다. 없으면 화면마다 asset 조회를 한 번 더 해야 한다.

- 원본 URL 대신 화면 크기별 파생본(`variants`)을 주는 편이 낫다. TV는 1920x1080,
  관리자 목록 썸네일은 훨씬 작다.
- 서명된 URL이라면 만료 시각도 함께 필요하다.

### 5-2. idempotency는 동시 요청도 막아야 한다

더블 클릭이면 같은 key의 요청 두 개가 **거의 동시에** 도착한다. 완료된 요청만
기억하는 구현으로는 둘 다 통과한다. key 단위로 직렬화하거나, 두 번째 요청이 첫 번째의
결과를 기다리게 해야 한다.

프론트도 진행 중 재요청을 막고 있지만, 네트워크 재시도까지는 막을 수 없다.

### 5-3. 한 공지에 신청을 여러 건 만들 수 있는가

프론트는 지금 제한하지 않는다. 같은 공지로 포스터만 바꿔 다시 신청하는 것이
정상인지, 아니면 기존 신청을 수정해야 하는지에 따라 화면이 달라진다.
(반려 후 재신청 흐름과도 맞물린다)

### 5-4. 조직 정보를 누가 정하는가

신청 생성 요청에 조직을 담지 않고 있다. 서버가 세션 사용자의 소속에서 정하는 것으로
가정했다. 사용자가 여러 조직에 속한 경우 고를 수 있어야 하는지 확인이 필요하다.

### 5-5. 서버 검증 한도를 응답으로 알려줄 수 있는가

프론트는 10MB·1080px·80자를 상수로 들고 있다. 서버 정책이 바뀌면 두 곳이 어긋나
사용자가 "올릴 수 있다고 했는데 거절당하는" 상황이 생긴다. 설정 조회 endpoint나
413/422 응답에 실제 한도를 담아 주면 프론트가 그 값을 쓴다.
