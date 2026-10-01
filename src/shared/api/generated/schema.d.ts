/* 자동 생성 파일. 직접 고치지 않는다. `bun run api:sync`로 다시 만든다. */

export interface paths {
    "/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 서버 응답 확인 */
        get: operations["AppController_getHello"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 헬스 체크 */
        get: operations["HealthController_check"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 로그인
         * @description IdP authorization code로 로그인하고 access token을 발급한다.
         *
         *     1. 프론트가 `https://account.gistory.me/authorize`로 보낸다
         *        (scope: `openid profile email offline_access`, PKCE 권장)
         *     2. redirect로 받은 code를 이 API로 넘긴다
         *     3. 서버가 IdP 토큰으로 교환하고 사용자를 확인한 뒤 자체 access token을 발급한다
         */
        post: operations["AuthController_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 토큰 갱신
         * @description IdP refresh token으로 access token을 다시 발급한다. 응답의 refreshToken으로 교체해 저장한다.
         */
        post: operations["AuthController_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 세션 복원
         * @description 앱 시작 시 현재 로그인 사용자와 역할을 확인한다.
         */
        get: operations["AuthController_getSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 로그아웃
         * @description 서버 측 동작은 없다. 클라이언트가 저장한 accessToken과 refreshToken을 지운다.
         */
        post: operations["AuthController_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 운영 제한값
         * @description 업로드·신청 검증에 서버가 실제로 쓰는 값. 프론트는 상수 대신 이 값으로 폼을 미리 검증한다.
         */
        get: operations["PolicyController_getConfig"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 카테고리 목록
         * @description 신청 폼의 카테고리 선택지. 노출 순서대로 준다. 숨긴 카테고리는 빠지지만 기존 신청의 categoryId로는 계속 쓰인다.
         */
        get: operations["CategoriesController_findAll"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/target-groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 대상 위치 그룹 목록
         * @description 신청 폼의 "대상 위치"와 기기 폼의 "위치 그룹" 선택지. 이름순으로 준다.
         *     신청의 targetGroupIds가 비어 있으면 전체 기기가 대상이다.
         *
         *     **숨긴 그룹(isHidden: true)도 준다.** 과거 신청·기기의 그룹 ID를 이름으로 바꿔 보여 줄 때 필요하다.
         *     새로 고르는 선택 목록에서는 프론트가 숨긴 그룹을 빼야 한다. 숨긴 그룹을 새로 추가하면 422다.
         */
        get: operations["TargetGroupsController_findAll"];
        put?: never;
        /**
         * 대상 위치 그룹 추가
         * @description ID는 서버가 정한다(grp_xxx). 새 그룹은 숨기지 않은 상태, deviceCount 0으로 만들어진다. 감사 로그 GROUP_CREATED
         */
        post: operations["TargetGroupsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/target-groups/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * 대상 위치 그룹 삭제
         * @description 오타로 만든 그룹을 지우는 용도. 어떤 기기의 groupIds에도, 어떤 신청의 targetGroupIds에도
         *     (취소·종료된 신청 포함) 들어 있지 않아야 지울 수 있다. 쓰는 곳이 있으면 409이고, 그때는 숨김을 쓴다.
         *     감사 로그 GROUP_DELETED
         */
        delete: operations["TargetGroupsController_remove"];
        options?: never;
        head?: never;
        /**
         * 대상 위치 그룹 수정 (이름 변경·숨김)
         * @description 보낸 필드만 바꾼다. 실제로 바뀐 필드가 있을 때만 감사 로그 GROUP_UPDATED를 남긴다.
         *
         *     숨김(`isHidden: true`)은 쓰는 곳이 있어도 된다. 기기·신청에 새로 추가하는 것만 막히고,
         *     이미 연결된 기기·신청과 편성 대상 판정은 그대로다. `isHidden: false`로 다시 보이게 할 수 있다.
         */
        patch: operations["TargetGroupsController_update"];
        trace?: never;
    };
    "/signage/assets/presign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 업로드 URL 발급
         * @description 포스터를 저장소에 직접 올릴 서명 URL을 발급한다.
         *
         *     **업로드 흐름**
         *     1. 이 API로 `assetId`와 `uploadUrl`을 받는다
         *     2. `uploadUrl`에 `method`(PUT)로 파일 본문을 보낸다. `headers`를 그대로 싣는다.
         *        Content-Type이나 파일 크기가 요청한 값과 다르면 저장소가 403으로 거절한다
         *     3. `POST /signage/assets/{assetId}/complete`로 완료를 알리고 결과를 받는다
         *
         *     `expiresAt`(15분)이 지나면 1부터 다시 한다. 최대 크기와 허용 형식은 `GET /signage/config`와 같다.
         */
        post: operations["AssetsController_presign"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/assets/{assetId}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 업로드 완료
         * @description 저장소에 올린 원본을 검증하고 공개용 이미지를 만든다.
         *
         *     - 파일 내용(시그니처)으로 형식을 판별한다. 확장자·Content-Type은 믿지 않는다
         *     - JPEG·PNG·WebP만, 짧은 변 1080px 이상(EXIF 회전 적용 후), 움직이는 이미지 불가
         *     - EXIF(위치 정보 포함)를 제거한 webp 변형 이미지(thumb, preview, tv)를 만들고 원본은 지운다
         *     - 여러 번 불러도 결과가 같다. 이미 처리된 asset은 같은 응답(또는 같은 거절 사유)을 준다
         *     - 거절된 asset은 다시 쓸 수 없다. presign부터 새로 한다
         */
        post: operations["AssetsController_complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 신청 목록
         * @description 최신 신청부터. `statuses`를 비우면 ARCHIVED를 뺀 전체다. 표시 상태 판정은 응답의 `serverTime`으로 한다.
         */
        get: operations["SubmissionsController_list"];
        put?: never;
        /**
         * 게시 신청
         * @description 신청을 만들고 바로 검토를 요청한다 (`status: PENDING_REVIEW`).
         *
         *     **검증** (기준은 `GET /signage/config`)
         *     - 제목: 앞뒤 공백 제거 후 1~80자
         *     - 포스터: 본인이 올려 complete까지 끝낸 asset
         *     - 기간: 시작은 지금부터 24시간 이후, 종료는 시작보다 뒤, 최대 3개월(서울 달력)
         *     - 상세 링크(선택): 허용된 호스트의 HTTPS. Ziggle 공지 주소(`/notice/{id}`)면 공지 ID를 뽑아 **공지 하나에 신청 하나**를 지킨다. 끝난 신청(취소·종료·보관)은 세지 않는다
         *     - 대상 위치(선택): 숨기지 않은 그룹. 비우면 전체 기기
         */
        post: operations["SubmissionsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 운영 요약
         * @description 대시보드 수치. 목록을 세지 않고 서버가 한 번에 계산한다. 게시 중·예약·종료는 승인 건의 기간으로 판정하고, byStatus는 저장된 상태 그대로 센다.
         */
        get: operations["SubmissionsController_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 신청 상세
         * @description 신청자 본인과 검토자만 볼 수 있다.
         */
        get: operations["SubmissionsController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 신청 수정
         * @description 신청자 본인만 고친다. 보낸 필드 중 값이 실제로 바뀐 것만 반영한다. 선택 입력(상세 링크, 주최, 부제, 장소, 설명)은 null이나 빈 문자열이면 비운다.
         *
         *     | 현재 상태 | 수정 후 상태 |
         *     |---|---|
         *     | PENDING_REVIEW, REJECTED, SUSPENDED, DRAFT | 그대로 |
         *     | APPROVED, SCHEDULED (게시 시작 전) | **PENDING_REVIEW** (재승인 필요) |
         *     | 게시가 시작됐거나 그 외 상태 | 409 CONFLICT (중단은 운영자에게 요청) |
         *
         *     반려·중단된 신청은 고친 뒤 `POST /signage/submissions/{id}/submit`으로 다시 검토를 요청한다.
         */
        patch: operations["SubmissionsController_update"];
        trace?: never;
    };
    "/signage/submissions/{id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 재검토 요청
         * @description 반려(REJECTED)·중단(SUSPENDED)된 신청을 다시 검토 대기(PENDING_REVIEW)로 보낸다. 기간 규칙을 지금 시각으로 다시 검사하므로, 시작이 지났으면 먼저 기간을 고친다.
         */
        post: operations["SubmissionsController_submit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 신청 취소
         * @description 검토 대기·반려 건, 그리고 승인됐지만 게시 시작 전인 건을 취소한다. 취소한 공지는 다시 신청할 수 있다.
         */
        post: operations["SubmissionsController_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/audit-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 감사 로그
         * @description 누가 언제 무엇을 바꿨는지. 최신순이다.
         *
         *     - 검토자(REVIEWER·SUPER_ADMIN): 전체 로그. `targetType`·`targetId`·`action`으로 거를 수 있다
         *     - 그 외 사용자: 신청 상세 화면용으로 `targetType=SUBMISSION&targetId=<본인 신청 ID>`만 쓸 수 있다
         *     - 주기 작업이 바꾼 상태는 `actorType: SYSTEM`으로 남는다
         */
        get: operations["AuditLogsController_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 사용자 목록 (역할 관리)
         * @description 이름순. 역할을 줄 사람을 찾을 때 쓴다.
         *     사용자는 첫 로그인 때 만들어지므로, 한 번도 로그인하지 않은 사람은 목록에 없고 역할도 줄 수 없다.
         */
        get: operations["UsersController_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/users/{id}/roles/{role}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 역할 부여
         * @description 이미 가진 역할이면 아무것도 바꾸지 않는다(감사 로그도 없음). 새로 부여하면 감사 로그 USER_ROLE_GRANTED.
         *     대상의 다음 요청부터 바로 적용된다. 대상 화면의 메뉴는 세션(GET /auth/session)을 다시 불러와야 바뀐다.
         *     SUPER_ADMIN도 부여할 수 있다.
         */
        put: operations["UsersController_grant"];
        post?: never;
        /**
         * 역할 회수
         * @description 없는 역할이면 아무것도 바꾸지 않는다(감사 로그도 없음). 회수하면 감사 로그 USER_ROLE_REVOKED.
         *     대상의 다음 요청부터 바로 권한이 없어진다.
         *
         *     **본인의 역할은 회수할 수 없다(403).** 다른 SUPER_ADMIN이 회수해야 한다.
         *     그래서 SUPER_ADMIN이 한 명도 남지 않는 일은 없다. 두 관리자가 동시에 서로를 회수하면 먼저 처리된 쪽만 성공하고,
         *     다른 쪽은 이미 SUPER_ADMIN이 아니어서 403이다.
         */
        delete: operations["UsersController_revoke"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 검토 대기열
         * @description 오래 기다린 순(검토 요청 시각 오름차순). 대기 시간은 각 항목의 `submittedAt`과 응답의 `serverTime`으로 계산한다.
         */
        get: operations["ReviewsController_queue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions/{id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 승인
         * @description 검토 대기 중인 신청을 승인한다.
         *
         *     - 응답 상태는 시작 시각이 지났으면 `PUBLISHED`, 아니면 `SCHEDULED`다. 프론트는 계산하지 않고 이 값을 쓴다
         *     - 승인한 포스터의 checksum을 검토 이력에 고정한다
         *     - 게시 기간이 이미 끝난 신청은 승인할 수 없다(409). 기간 문제로 반려한다
         */
        post: operations["ReviewsController_approve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions/{id}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 반려
         * @description 검토 대기 중인 신청을 반려한다. `comment`는 신청자에게 그대로 보인다. 신청자는 고친 뒤 재검토를 요청할 수 있다.
         */
        post: operations["ReviewsController_reject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions/{id}/suspend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 게시 중단
         * @description 승인된 게시(APPROVED·SCHEDULED·PUBLISHED, 기간이 끝나지 않은 것)를 내린다.
         *
         *     - 사유는 신청자에게 보이고, 검토 이력에 `decision: SUSPENDED`로 남는다
         *     - 급하게 내리는 경우라 revision을 받지 않는다
         *     - 기기에는 다음 편성 동기화 때 반영된다
         */
        post: operations["ReviewsController_suspend"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/submissions/{id}/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 검토 이력
         * @description 승인·반려·중단 기록을 오래된 것부터 준다. 신청자 본인과 검토자만 볼 수 있다.
         */
        get: operations["ReviewsController_history"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/devices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 기기 목록
         * @description 이름순. 검토자 이상. `serverTime`과 각 기기의 `lastSeenAt`으로 마지막 연결 경과 시간을 계산한다.
         */
        get: operations["DevicesController_list"];
        put?: never;
        /**
         * 기기 등록
         * @description TV를 등록하고 기기 토큰을 발급한다. **토큰 원문은 이 응답에서만 볼 수 있다.**
         *
         *     TV 설정: 프론트가 `https://<프론트>/display/{id}#token={token}` 같은 설정 링크를 만들어 TV에서 한 번 연다.
         *     `#` 뒤는 서버로 전송되지 않아 로그에 남지 않는다. 이후 TV는 토큰을 `X-Device-Token` 헤더로 보낸다.
         */
        post: operations["DevicesController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/devices/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 기기 상세
         * @description 검토자 이상.
         */
        get: operations["DevicesController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 기기 수정
         * @description 보낸 필드만 바꾼다. `isActive: false`면 비활성(DISABLED)이 되어 토큰으로 접근할 수 없다. `groupIds`는 통째로 바꾼다.
         */
        patch: operations["DevicesController_update"];
        trace?: never;
    };
    "/signage/devices/{id}/rotate-token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 기기 토큰 재발급
         * @description 새 토큰을 발급하고 **이전 토큰은 즉시 무효**가 된다. 토큰을 잃어버렸거나 유출됐을 때 쓴다. 새 토큰은 이 응답에서만 볼 수 있다.
         */
        post: operations["DevicesController_rotateToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/devices/{deviceId}/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 기기 토큰 확인
         * @description TV 설정 화면에서 토큰이 맞는지, 어느 기기로 등록됐는지 확인한다. 경로의 deviceId는 토큰의 기기와 같아야 한다.
         */
        get: operations["DeviceRuntimeController_session"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/devices/{deviceId}/playlist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 편성 조회
         * @description TV가 `refreshAfterSeconds`마다 부른다. 지금 띄울 게시물만 준다.
         *
         *     - 승인됐고, 게시 기간 안이고, 이 기기가 대상인 게시물 (대상 그룹이 없는 게시물은 모든 기기)
         *     - 중단·취소된 게시물은 다음 요청부터 빠진다
         *     - 응답의 `ETag`(= `"playlistVersion"`)를 다음 요청의 `If-None-Match`로 보내면, 편성이 그대로일 때 **304**(본문 없음)를 준다
         */
        get: operations["PlaylistController_playlist"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/devices/{deviceId}/heartbeat": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * heartbeat
         * @description 60초마다 보낸다. 최신 상태 하나만 의미가 있어 서버는 덮어쓴다.
         *
         *     - 기기 상태(ONLINE·OFFLINE)는 서버가 받은 시각으로 판정한다. 3분 안에 오면 ONLINE이다
         *     - 실패해도 재생을 멈추지 않고 다음 주기를 기다린다(재전송 없음)
         *     - 응답 본문은 없다(204)
         */
        post: operations["DeviceTelemetryController_heartbeat"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/devices/{deviceId}/play-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 노출 이벤트
         * @description 30초마다, 그리고 네트워크가 복구되면 즉시 쌓인 이벤트를 보낸다.
         *
         *     - 사람이 본 횟수가 아니라 **기기가 포스터를 정상 렌더링한 기록**이다
         *     - 서버가 (기기, eventId)로 중복을 거른다. 전송 성공 응답을 받기 전에 죽어 같은 batch를 다시 보내도 된다
         *     - 한 번에 최대 300개. 오래 오프라인이었으면 나눠 보낸다
         *     - 2xx면 전송 성공이다. 이벤트를 지워도 된다
         */
        post: operations["DeviceTelemetryController_playEvents"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/signage/stats/impressions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 노출 통계
         * @description 기간 안의 게시물별 노출 수. 노출은 **디스플레이가 포스터를 정상 렌더링한 횟수**다(사람이 본 횟수가 아니다).
         *
         *     - 날짜는 서울 기준 하루 단위다. `from`·`to` 모두 포함
         *     - 기본 기간은 오늘까지 30일, 최대 366일
         *     - 집계는 10분마다 돈다. `aggregatedAt` 이후에 들어온 이벤트는 아직 반영되지 않았다
         *     - 원본 이벤트는 90일 보관하지만 집계는 계속 남아 오래된 기간도 볼 수 있다
         */
        get: operations["StatsController_impressions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        LoginRequestDto: {
            /**
             * @description IdP authorize 후 redirect로 받은 authorization code
             * @example NhhvTDYsFcdgNLnnLijcl7Ku7bEEeee
             */
            code: string;
            /**
             * @description authorize 요청에 썼던 redirect_uri와 정확히 같아야 한다
             * @example http://localhost:5173/auth/callback
             */
            redirectUri: string;
            /**
             * @description PKCE를 썼다면 code_challenge를 만든 원본 값
             * @example dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
             */
            codeVerifier?: string;
        };
        TokenResponseDto: {
            /**
             * @description 우리 서버가 발급한 access token. `Authorization: Bearer <accessToken>`으로 보낸다
             * @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
             */
            accessToken: string;
            /**
             * @description IdP refresh token. authorize 때 offline_access scope를 요청해야 내려온다
             * @example D43f5y0ahjqew82jZ4NViEr2YafMKhue
             */
            refreshToken?: string;
            /**
             * @description accessToken 유효 시간(초)
             * @example 3600
             */
            expiresIn: number;
        };
        ErrorResponseDto: {
            /**
             * @description 안정적인 오류 식별자. 프론트는 이 값으로 분기한다.
             *
             *     | 상태 | 기본 code |
             *     |---|---|
             *     | 400 | INVALID_REQUEST |
             *     | 401 | UNAUTHENTICATED |
             *     | 403 | FORBIDDEN |
             *     | 404 | NOT_FOUND |
             *     | 409 | CONFLICT, ALREADY_SUBMITTED |
             *     | 413 | PAYLOAD_TOO_LARGE |
             *     | 422 | VALIDATION_FAILED, IDEMPOTENCY_KEY_REUSED |
             *     | 429 | RATE_LIMITED |
             *     | 5xx | SERVER_ERROR |
             * @example VALIDATION_FAILED
             * @enum {string}
             */
            code: "INVALID_REQUEST" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "PAYLOAD_TOO_LARGE" | "VALIDATION_FAILED" | "RATE_LIMITED" | "SERVER_ERROR" | "ALREADY_SUBMITTED" | "IDEMPOTENCY_KEY_REUSED";
            /**
             * @description 디버깅용 설명. 화면에 그대로 노출하지 않는다
             * @example 입력값이 올바르지 않습니다.
             */
            message: string;
            /**
             * @description 요청 추적 ID. `x-request-id` 응답 헤더와 같은 값이다. 문의할 때 이 값으로 로그를 찾는다
             * @example req_Xk3p7QaZ1bN9vT2c
             */
            requestId: string;
            /**
             * @description 필드 경로별 오류 문구. 입력 검증 실패(422 VALIDATION_FAILED)일 때 온다. 중첩 필드는 `a.b`, 배열은 `a.0` 형식
             * @example {
             *       "endAt": "종료 시각은 시작 시각보다 뒤여야 합니다."
             *     }
             */
            fields?: {
                [key: string]: string;
            };
        };
        RefreshRequestDto: {
            /**
             * @description 로그인 응답으로 받은 IdP refresh token
             * @example D43f5y0ahjqew82jZ4NViEr2YafMKhue
             */
            refreshToken: string;
        };
        SessionUserDto: {
            /**
             * @description 사용자 ID
             * @example 79ad1364-82b4-4134-b2a3-d9cbe17cc444
             */
            id: string;
            /** @example 홍길동 */
            displayName: string;
            /** @example user@gm.gist.ac.kr */
            email: string;
            /**
             * @description SUBMITTER는 로그인한 모든 사용자가 가진다
             * @example [
             *       "SUBMITTER",
             *       "REVIEWER"
             *     ]
             */
            roles: ("SUBMITTER" | "REVIEWER" | "SUPER_ADMIN")[];
            /**
             * @description 항상 빈 배열. 조직 모델을 두지 않기로 해 호환용으로만 남아 있다 (주최는 신청마다 자유 입력)
             * @example []
             */
            organizationIds: string[];
        };
        SessionResponseDto: {
            user: components["schemas"]["SessionUserDto"];
            /**
             * @description 현재 access token 만료 시각 (UTC ISO 8601)
             * @example 2026-07-29T12:00:00.000Z
             */
            expiresAt: string;
        };
        SignageConfigDto: {
            /**
             * @description 포스터 최대 용량(바이트)
             * @example 10485760
             */
            maxUploadBytes: number;
            /**
             * @description 포스터 짧은 변 최소 픽셀
             * @example 1080
             */
            minShortEdgePx: number;
            /**
             * @description 제목 최대 글자 수 (앞뒤 공백 제외)
             * @example 80
             */
            titleMaxLength: number;
            /**
             * @description 최대 게시 기간(개월). 종료 시각은 시작 시각에서 이 개월 수를 더한 시각(Asia/Seoul 달력 기준) 이하여야 한다
             * @example 3
             */
            maxPublishMonths: number;
            /**
             * @description 게시 시작 전 최소 신청 시간(시간). 시작 시각은 신청 시각에서 이 시간 이상 뒤여야 한다. 0이면 제한 없음
             * @example 24
             */
            minLeadTimeHours: number;
            /**
             * @description 업로드 허용 MIME
             * @example [
             *       "image/jpeg",
             *       "image/png",
             *       "image/webp"
             *     ]
             */
            allowedMimeTypes: ("image/jpeg" | "image/png" | "image/webp")[];
            /**
             * @description 상세 링크(QR)로 허용하는 호스트. HTTPS만 허용한다
             * @example [
             *       "ziggle.gistory.me"
             *     ]
             */
            allowedDetailUrlHosts: string[];
        };
        CategoryDto: {
            /**
             * @description 카테고리 ID
             * @example performance
             */
            id: string;
            /**
             * @description 표시 이름
             * @example 공연
             */
            name: string;
        };
        TargetGroupDto: {
            /**
             * @description 그룹 ID. 관리 화면에서 만든 그룹은 서버가 정한다
             * @example grp_house_a
             */
            id: string;
            /**
             * @description 표시 이름
             * @example 학사기숙사 A동
             */
            name: string;
            /**
             * @description 그룹에 속한 활성 기기 수 (비활성 기기는 세지 않는다)
             * @example 2
             */
            deviceCount: number;
            /**
             * @description 숨긴 그룹. 기기·신청에 새로 고를 수 없지만, 이미 연결된 기기·신청과 편성은 그대로다. 선택 목록에서는 빼고, 과거 신청의 그룹 이름을 보여 줄 때는 쓴다
             * @example false
             */
            isHidden: boolean;
        };
        CreateTargetGroupDto: {
            /**
             * @description 표시 이름. 앞뒤 공백을 지운 뒤 1~40자. 대소문자를 무시하고 다른 그룹(숨긴 그룹 포함)과 겹치면 422 fields.name
             * @example 학사기숙사 A동
             */
            name: string;
        };
        UpdateTargetGroupDto: {
            /**
             * @description 표시 이름. 앞뒤 공백을 지운 뒤 1~40자. 대소문자를 무시하고 다른 그룹(숨긴 그룹 포함)과 겹치면 422 fields.name
             * @example 학사기숙사 A동
             */
            name?: string;
            /**
             * @description true면 숨긴다. 숨겨도 이미 연결된 기기·신청과 편성은 그대로이고, 기기·신청에 새로 추가하는 것만 막힌다
             * @example true
             */
            isHidden?: boolean;
        };
        PresignAssetRequestDto: {
            /**
             * @description 원본 파일 이름 (표시·로그용)
             * @example poster.jpg
             */
            fileName: string;
            /**
             * @description 브라우저가 판별한 파일 형식. 업로드할 때 이 값을 Content-Type으로 보내야 한다
             * @example image/jpeg
             * @enum {string}
             */
            mimeType: "image/jpeg" | "image/png" | "image/webp";
            /**
             * @description 파일 크기(바이트). 업로드할 파일의 크기와 정확히 같아야 한다
             * @example 3145728
             */
            sizeBytes: number;
            /**
             * @description 파일 내용의 sha256. 보내면 완료 처리 때 대조해 전송 중 손상을 잡는다
             * @example sha256:9f2b5c0e3a1d4f6b8c7e9a0d1f2e3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c
             */
            checksum?: string;
        };
        PresignAssetResponseDto: {
            /**
             * @description 완료 처리와 신청 생성에 쓰는 ID
             * @example 0f8e2c1a-5b7d-4e21-9a0c-1d8e5f6b2c34
             */
            assetId: string;
            /**
             * @description 브라우저가 파일을 직접 올릴 서명 URL. 우리 API 서버가 아니라 저장소 주소다
             * @example https://storage.example/flyer-g/uploads/0f8e2c1a-...?X-Amz-Signature=...
             */
            uploadUrl: string;
            /**
             * @example PUT
             * @enum {string}
             */
            method: "PUT";
            /**
             * @description 업로드 요청에 그대로 실어야 하는 헤더. 다르면 저장소가 서명 불일치로 거절한다
             * @example {
             *       "Content-Type": "image/jpeg"
             *     }
             */
            headers: {
                [key: string]: string;
            };
            /**
             * @description uploadUrl 만료 시각. 지나면 presign부터 다시 한다
             * @example 2026-07-29T06:45:00.000Z
             */
            expiresAt: string;
        };
        AssetVariantsDto: {
            /**
             * @description 목록 썸네일 (400x400 안)
             * @example https://cdn.example/assets/0f8e2c1a-.../thumb.webp
             */
            thumb: string;
            /**
             * @description 미리보기·검토 (1280x1280 안)
             * @example https://cdn.example/assets/0f8e2c1a-.../preview.webp
             */
            preview: string;
            /**
             * @description TV 재생 (1920x1080 안)
             * @example https://cdn.example/assets/0f8e2c1a-.../tv.webp
             */
            tv: string;
        };
        AssetDto: {
            /** @example 0f8e2c1a-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            assetId: string;
            /**
             * @description 업로드 직후 미리보기에 그릴 URL. variants.preview와 같다
             * @example https://cdn.example/assets/0f8e2c1a-.../preview.webp
             */
            url: string;
            /**
             * @description 파일 내용으로 판별한 원본 형식
             * @example image/jpeg
             * @enum {string}
             */
            mimeType: "image/jpeg" | "image/png" | "image/webp";
            /**
             * @description 원본 가로(px, EXIF 회전 적용 후)
             * @example 1536
             */
            width: number;
            /**
             * @description 원본 세로(px, EXIF 회전 적용 후)
             * @example 2048
             */
            height: number;
            /**
             * @description 원본 크기(바이트)
             * @example 2841221
             */
            sizeBytes: number;
            /**
             * @description 원본 내용의 sha256. 같은 asset이면 항상 같다
             * @example sha256:9f2b5c0e3a1d4f6b8c7e9a0d1f2e3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c
             */
            checksum: string;
            /**
             * @description 자동 검사(형식·해상도·파일 무결성) 결과. 통과한 asset만 응답하므로 항상 APPROVED. 내용 검토는 신청 승인 단계에서 사람이 한다
             * @example APPROVED
             * @enum {string}
             */
            moderationStatus: "APPROVED";
            /** @description EXIF(위치 정보 포함)를 제거한 webp 이미지 */
            variants: components["schemas"]["AssetVariantsDto"];
        };
        CreateSubmissionDto: {
            /**
             * @description 상세 링크(QR). 허용된 호스트의 HTTPS만. Ziggle 공지 주소면 서버가 공지 ID를 뽑아 중복 신청을 막는다
             * @example https://ziggle.gistory.me/notice/1041
             */
            detailUrl?: string | null;
            /**
             * @description 주최. 미리보기와 TV에 "주최"로 표시된다
             * @example 공연동아리 페이드인
             */
            organizerName?: string | null;
            /**
             * @description 부제 (예: 일시 안내)
             * @example 12월 셋째 주 금요일 저녁
             */
            subtitle?: string | null;
            /**
             * @description 장소
             * @example 대강당
             */
            location?: string | null;
            /**
             * @description 설명
             * @example null
             */
            description?: string | null;
            /**
             * @description 제목. 앞뒤 공백을 지운 뒤 1~80자
             * @example 겨울 정기 공연 〈한밤의 물리학〉
             */
            title: string;
            /**
             * @description GET /signage/categories의 id
             * @example performance
             */
            categoryId: string;
            /**
             * @description 업로드를 완료(complete)한 본인의 asset
             * @example 0f8e2c1a-5b7d-4e21-9a0c-1d8e5f6b2c34
             */
            assetId: string;
            /**
             * @description 게시 시작 (UTC ISO 8601)
             * @example 2026-07-30T00:00:00.000Z
             */
            startAt: string;
            /**
             * @description 게시 종료 (UTC ISO 8601)
             * @example 2026-08-06T14:59:59.000Z
             */
            endAt: string;
            /**
             * @description GET /signage/target-groups의 id 목록(숨긴 그룹 제외). 비우면 전체 기기가 대상
             * @default []
             * @example []
             */
            targetGroupIds?: string[];
        };
        SubmissionDetailDto: {
            /** @example 8d2f4a1e-3c5b-4e21-9a0c-1d8e5f6b2c34 */
            id: string;
            /**
             * @description detailUrl이 Ziggle 공지 주소일 때 서버가 뽑은 공지 ID
             * @example 1041
             */
            ziggleNoticeId: string | null;
            /** @example 6f1c2c1e-0000-4000-8000-000000000001 */
            requesterId: string;
            /**
             * @description 신청자 이름. 검토 화면에서 누가 올렸는지 보여준다
             * @example 홍길동
             */
            requesterName: string;
            /**
             * @example POSTER
             * @enum {string}
             */
            type: "POSTER";
            /** @example 겨울 정기 공연 〈한밤의 물리학〉 */
            title: string;
            /** @example performance */
            categoryId: string;
            /**
             * @description 카테고리 표시 이름
             * @example 공연
             */
            categoryName: string;
            /** @example 0f8e2c1a-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            assetId: string;
            /**
             * @description 포스터 미리보기 (1280x1280 안)
             * @example https://gsainfoteam-icarus-flyer-g-production.s3.ap-northeast-2.amazonaws.com/assets/0f8e2c1a-.../preview.webp
             */
            posterUrl: string;
            /**
             * @description 포스터 썸네일 (400x400 안). 목록 카드용
             * @example https://gsainfoteam-icarus-flyer-g-production.s3.ap-northeast-2.amazonaws.com/assets/0f8e2c1a-.../thumb.webp
             */
            posterThumbUrl: string;
            /** @example https://ziggle.gistory.me/notice/1041 */
            detailUrl: string | null;
            /** @example 2026-07-30T00:00:00.000Z */
            startAt: string;
            /** @example 2026-08-06T14:59:59.000Z */
            endAt: string;
            /**
             * @description 저장된 상태. APPROVED인데 시작 전이면 예약, 종료 후면 종료처럼 기간과 함께 판정한다(기준 시각은 serverTime)
             * @example PENDING_REVIEW
             * @enum {string}
             */
            status: "DRAFT" | "PENDING_REVIEW" | "REJECTED" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ENDED" | "SUSPENDED" | "CANCELED" | "ARCHIVED";
            /**
             * @description 편성 우선순위 (운영자가 정함)
             * @example 0
             */
            priority: number;
            /**
             * @description 대상 위치 그룹. 비어 있으면 전체 기기
             * @example []
             */
            targetGroupIds: string[];
            /**
             * @description 주최 (자유 입력)
             * @example 공연동아리 페이드인
             */
            organizerName: string | null;
            /** @example 12월 셋째 주 금요일 저녁 */
            subtitle: string | null;
            /** @example 대강당 */
            location: string | null;
            /** @example null */
            description: string | null;
            /**
             * @description 낙관적 잠금 버전. 수정·상태 변경 요청에 그대로 실어 보낸다
             * @example 1
             */
            version: number;
            /**
             * @description 마지막으로 검토를 요청한 시각
             * @example 2026-07-29T06:30:00.000Z
             */
            submittedAt: string | null;
            /** @example 2026-07-29T06:30:00.000Z */
            createdAt: string;
            /** @example 2026-07-29T06:30:00.000Z */
            updatedAt: string;
            /**
             * @description 서버 현재 시각(UTC). 표시 상태 판정은 이 값으로 한다
             * @example 2026-07-29T06:30:00.000Z
             */
            serverTime: string;
        };
        PageEnvelopeDto: {
            /**
             * @description 다음 페이지 cursor. 마지막 페이지면 null
             * @example WyIyMDI2LTA3LTI5VDA2OjMwOjAwLjAwMFoiLCJzdWJfMDEiXQ
             */
            nextCursor: string | null;
            /**
             * @description 필터에 맞는 전체 항목 수
             * @example 137
             */
            totalCount: number;
            /**
             * @description 서버 현재 시각(UTC). 상태·기간 판정은 클라이언트 시계 대신 이 값으로 한다
             * @example 2026-07-29T06:30:00.000Z
             */
            serverTime: string;
        };
        SubmissionDto: {
            /** @example 8d2f4a1e-3c5b-4e21-9a0c-1d8e5f6b2c34 */
            id: string;
            /**
             * @description detailUrl이 Ziggle 공지 주소일 때 서버가 뽑은 공지 ID
             * @example 1041
             */
            ziggleNoticeId: string | null;
            /** @example 6f1c2c1e-0000-4000-8000-000000000001 */
            requesterId: string;
            /**
             * @description 신청자 이름. 검토 화면에서 누가 올렸는지 보여준다
             * @example 홍길동
             */
            requesterName: string;
            /**
             * @example POSTER
             * @enum {string}
             */
            type: "POSTER";
            /** @example 겨울 정기 공연 〈한밤의 물리학〉 */
            title: string;
            /** @example performance */
            categoryId: string;
            /**
             * @description 카테고리 표시 이름
             * @example 공연
             */
            categoryName: string;
            /** @example 0f8e2c1a-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            assetId: string;
            /**
             * @description 포스터 미리보기 (1280x1280 안)
             * @example https://gsainfoteam-icarus-flyer-g-production.s3.ap-northeast-2.amazonaws.com/assets/0f8e2c1a-.../preview.webp
             */
            posterUrl: string;
            /**
             * @description 포스터 썸네일 (400x400 안). 목록 카드용
             * @example https://gsainfoteam-icarus-flyer-g-production.s3.ap-northeast-2.amazonaws.com/assets/0f8e2c1a-.../thumb.webp
             */
            posterThumbUrl: string;
            /** @example https://ziggle.gistory.me/notice/1041 */
            detailUrl: string | null;
            /** @example 2026-07-30T00:00:00.000Z */
            startAt: string;
            /** @example 2026-08-06T14:59:59.000Z */
            endAt: string;
            /**
             * @description 저장된 상태. APPROVED인데 시작 전이면 예약, 종료 후면 종료처럼 기간과 함께 판정한다(기준 시각은 serverTime)
             * @example PENDING_REVIEW
             * @enum {string}
             */
            status: "DRAFT" | "PENDING_REVIEW" | "REJECTED" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ENDED" | "SUSPENDED" | "CANCELED" | "ARCHIVED";
            /**
             * @description 편성 우선순위 (운영자가 정함)
             * @example 0
             */
            priority: number;
            /**
             * @description 대상 위치 그룹. 비어 있으면 전체 기기
             * @example []
             */
            targetGroupIds: string[];
            /**
             * @description 주최 (자유 입력)
             * @example 공연동아리 페이드인
             */
            organizerName: string | null;
            /** @example 12월 셋째 주 금요일 저녁 */
            subtitle: string | null;
            /** @example 대강당 */
            location: string | null;
            /** @example null */
            description: string | null;
            /**
             * @description 낙관적 잠금 버전. 수정·상태 변경 요청에 그대로 실어 보낸다
             * @example 1
             */
            version: number;
            /**
             * @description 마지막으로 검토를 요청한 시각
             * @example 2026-07-29T06:30:00.000Z
             */
            submittedAt: string | null;
            /** @example 2026-07-29T06:30:00.000Z */
            createdAt: string;
            /** @example 2026-07-29T06:30:00.000Z */
            updatedAt: string;
        };
        SubmissionStatusCountsDto: {
            DRAFT: number;
            PENDING_REVIEW: number;
            REJECTED: number;
            APPROVED: number;
            SCHEDULED: number;
            PUBLISHED: number;
            ENDED: number;
            SUSPENDED: number;
            CANCELED: number;
            ARCHIVED: number;
        };
        SubmissionSummaryDto: {
            /**
             * @description 집계 기준 시각. 아래 수치는 이 시각 기준이다
             * @example 2026-07-29T06:30:00.000Z
             */
            calculatedAt: string;
            /**
             * @description ARCHIVED를 뺀 전체
             * @example 42
             */
            total: number;
            /**
             * @description 지금 게시 중 (승인됐고 기간 안)
             * @example 7
             */
            published: number;
            /**
             * @description 승인됐고 시작 전
             * @example 5
             */
            scheduled: number;
            /**
             * @description 검토 대기
             * @example 3
             */
            pendingReview: number;
            /**
             * @description 게시가 끝남 (ENDED이거나 승인 건의 기간이 지남)
             * @example 27
             */
            ended: number;
            /** @description 저장된 상태별 건수. 목록 탭 배지용 (기간 보정 없음) */
            byStatus: components["schemas"]["SubmissionStatusCountsDto"];
        };
        UpdateSubmissionDto: {
            /**
             * @description 상세 링크(QR). 허용된 호스트의 HTTPS만. Ziggle 공지 주소면 서버가 공지 ID를 뽑아 중복 신청을 막는다
             * @example https://ziggle.gistory.me/notice/1041
             */
            detailUrl?: string | null;
            /**
             * @description 주최. 미리보기와 TV에 "주최"로 표시된다
             * @example 공연동아리 페이드인
             */
            organizerName?: string | null;
            /**
             * @description 부제 (예: 일시 안내)
             * @example 12월 셋째 주 금요일 저녁
             */
            subtitle?: string | null;
            /**
             * @description 장소
             * @example 대강당
             */
            location?: string | null;
            /**
             * @description 설명
             * @example null
             */
            description?: string | null;
            /**
             * @description 화면에서 본 version. 최신이 아니면 409 CONFLICT
             * @example 3
             */
            version: number;
            /** @example 겨울 정기 공연 */
            title?: string;
            /** @example performance */
            categoryId?: string;
            /**
             * @description 포스터를 바꿀 때 새로 업로드한 asset
             * @example 5a1b2c3d-5b7d-4e21-9a0c-1d8e5f6b2c34
             */
            assetId?: string;
            /** @example 2026-07-31T00:00:00.000Z */
            startAt?: string;
            /** @example 2026-08-07T14:59:59.000Z */
            endAt?: string;
            /**
             * @description 대상 위치를 통째로 바꾼다. 새로 추가한 그룹 중 없거나 숨긴 그룹이 있으면 422 fields.targetGroupIds. 이미 연결된 숨긴 그룹은 그대로 둘 수 있다
             * @example [
             *       "grp_house_a"
             *     ]
             */
            targetGroupIds?: string[];
        };
        SubmissionVersionDto: {
            /**
             * @description 화면에서 본 version. 최신이 아니면 409 CONFLICT
             * @example 3
             */
            version: number;
        };
        AuditLogDto: {
            /** @example 4a7b1c2d-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            id: string;
            /**
             * @description USER: 사용자, DEVICE: 기기, SYSTEM: 서버의 주기 작업
             * @example USER
             * @enum {string}
             */
            actorType: "USER" | "DEVICE" | "SYSTEM";
            /**
             * @description 행위자 ID. SYSTEM이면 null
             * @example 6f1c2c1e-0000-4000-8000-000000000002
             */
            actorId: string | null;
            /**
             * @description 행위자 이름 (사용자일 때). SYSTEM이거나 삭제된 사용자면 null
             * @example 김관리
             */
            actorName: string | null;
            /**
             * @description 행위. 신청: SUBMISSION_CREATED, _UPDATED, _RESUBMITTED, _CANCELED, _APPROVED, _REJECTED, _SUSPENDED, _SCHEDULED, _PUBLISHED, _ENDED
             *     기기: DEVICE_REGISTERED, DEVICE_UPDATED, DEVICE_TOKEN_ROTATED
             *     위치 그룹: GROUP_CREATED, GROUP_UPDATED, GROUP_DELETED
             *
             *     - GROUP_* metadata: _CREATED·_DELETED는 { name }, _UPDATED는 { changes: { name?: { from, to }, isHidden?: { from, to } } }
             * @example SUBMISSION_APPROVED
             */
            action: string;
            /**
             * @example SUBMISSION
             * @enum {string}
             */
            targetType: "SUBMISSION" | "DEVICE" | "GROUP" | "USER";
            /** @example 8d2f4a1e-3c5b-4e21-9a0c-1d8e5f6b2c34 */
            targetId: string;
            /**
             * @description 반려 의견·중단 사유 등
             * @example null
             */
            reason: string | null;
            /**
             * @description 행위별 부가 정보 (바뀐 필드, 이전·이후 상태, revision 등)
             * @example {
             *       "revision": 3,
             *       "toStatus": "SCHEDULED"
             *     }
             */
            metadata: {
                [key: string]: unknown;
            } | null;
            /** @example 2026-07-29T02:00:00.000Z */
            createdAt: string;
            /**
             * @description 이 변경을 만든 요청의 ID (x-request-id). 주기 작업이면 null
             * @example req_Xk3p7QaZ1bN9vT2c
             */
            requestId: string | null;
        };
        AdminUserDto: {
            /** @example 6f1c2c1e-0000-4000-8000-000000000002 */
            id: string;
            /**
             * @description IdP 이름
             * @example 김지스트
             */
            name: string;
            /**
             * @description IdP 이메일
             * @example gist@gm.gist.ac.kr
             */
            email: string;
            /**
             * @description 학번. IdP가 주지 않았으면 null
             * @example 20245001
             */
            studentId: string | null;
            /**
             * @description 따로 부여된 역할. 로그인한 모두가 가지는 SUBMITTER는 넣지 않는다. SUPER_ADMIN은 REVIEWER 권한도 가진 것으로 본다
             * @example [
             *       "REVIEWER"
             *     ]
             */
            grantedRoles: ("REVIEWER" | "SUPER_ADMIN")[];
            /** @example 2026-09-30T08:00:00.000Z */
            lastLoginAt: string;
            /**
             * @description 첫 로그인 시각
             * @example 2026-03-02T01:00:00.000Z
             */
            createdAt: string;
        };
        ApproveSubmissionDto: {
            /**
             * @description 검토자가 화면에서 본 신청 version. 최신이 아니면 409 CONFLICT (다른 관리자가 먼저 처리했거나 신청자가 고침)
             * @example 3
             */
            revision: number;
        };
        RejectSubmissionDto: {
            /**
             * @description 검토자가 화면에서 본 신청 version. 최신이 아니면 409 CONFLICT (다른 관리자가 먼저 처리했거나 신청자가 고침)
             * @example 3
             */
            revision: number;
            /**
             * @description 반려 사유 코드
             * @example LOW_RESOLUTION
             * @enum {string}
             */
            reasonCode: "LOW_RESOLUTION" | "ASPECT_RATIO" | "INFO_MISMATCH" | "INAPPROPRIATE" | "PERIOD" | "DUPLICATE" | "OTHER";
            /**
             * @description 신청자에게 그대로 보이는 의견. 앞뒤 공백 제거 후 1~1000자
             * @example 짧은 변이 800px이라 TV에서 뭉개집니다. 1080px 이상으로 다시 올려주세요.
             */
            comment: string;
        };
        SuspendSubmissionDto: {
            /**
             * @description 중단 사유. 신청자에게 그대로 보인다. 앞뒤 공백 제거 후 1~1000자
             * @example 행사가 취소되어 즉시 내립니다.
             */
            reason: string;
        };
        ReviewDto: {
            /** @example 2b7c9d1e-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            id: string;
            /** @example 8d2f4a1e-3c5b-4e21-9a0c-1d8e5f6b2c34 */
            submissionId: string;
            /**
             * @description 검토자가 보고 결정한 신청 version
             * @example 2
             */
            revision: number;
            /**
             * @description SUSPENDED는 게시 중단 기록이다
             * @example REJECTED
             * @enum {string}
             */
            decision: "APPROVED" | "REJECTED" | "SUSPENDED";
            /**
             * @description 반려일 때만 값이 있다
             * @example LOW_RESOLUTION
             * @enum {string|null}
             */
            reasonCode: "LOW_RESOLUTION" | "ASPECT_RATIO" | "INFO_MISMATCH" | "INAPPROPRIATE" | "PERIOD" | "DUPLICATE" | "OTHER" | null;
            /**
             * @description 반려 의견 또는 중단 사유. 승인이면 null
             * @example 짧은 변이 800px이라...
             */
            comment: string | null;
            /** @example 6f1c2c1e-0000-4000-8000-000000000002 */
            reviewerId: string;
            /** @example 김관리 */
            reviewerName: string;
            /** @example 2026-07-28T01:20:00.000Z */
            reviewedAt: string;
        };
        ResolutionDto: {
            /** @example 1920 */
            width: number;
            /** @example 1080 */
            height: number;
        };
        DeviceLayoutDto: {
            /**
             * @example FOUR_GRID
             * @enum {string}
             */
            type: "SINGLE" | "FOUR_GRID";
            /**
             * @description 포스터 전환 간격(초)
             * @example 10
             */
            rotationSeconds: number;
        };
        DeviceDto: {
            /** @example 3c1e9a7b-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            id: string;
            /** @example A동 로비 TV */
            name: string;
            /** @example 학사기숙사 A동 1층 */
            location: string | null;
            /**
             * @example [
             *       "grp_house_a"
             *     ]
             */
            groupIds: string[];
            /**
             * @example LANDSCAPE
             * @enum {string}
             */
            orientation: "LANDSCAPE" | "PORTRAIT";
            /** @description 기기가 마지막으로 알려 준 해상도. heartbeat 전에는 null */
            resolution: components["schemas"]["ResolutionDto"] | null;
            /**
             * @description 마지막 heartbeat 시각
             * @example 2026-07-29T06:29:50.000Z
             */
            lastSeenAt: string | null;
            /** @example 0.4.2 */
            appVersion: string | null;
            /**
             * @description 기기가 heartbeat로 알린, 지금 재생 중인 편성 버전. 편성 API의 최신 playlistVersion과 다르면 동기화가 밀린 것이다
             * @example 9f2b5c0e3a1d4f6b
             */
            lastPlaylistVersion: string | null;
            /**
             * @description 기기가 마지막으로 포스터를 정상 렌더링한 시각(기기 시계 기준)
             * @example 2026-07-29T06:29:50.000Z
             */
            lastRenderOkAt: string | null;
            /**
             * @description DISABLED: 비활성. ONLINE: 3분 안에 heartbeat가 옴. OFFLINE: 그 외(한 번도 안 온 경우 포함)
             * @example ONLINE
             * @enum {string}
             */
            status: "ONLINE" | "OFFLINE" | "DISABLED";
            layout: components["schemas"]["DeviceLayoutDto"];
            /**
             * @description 편성 갱신 주기(초)
             * @example 60
             */
            refreshAfterSeconds: number;
            /**
             * @description 현재 토큰을 발급한 시각. 재발급하면 바뀐다
             * @example 2026-07-20T02:00:00.000Z
             */
            tokenIssuedAt: string;
            /** @example 2026-07-20T02:00:00.000Z */
            createdAt: string;
            /** @example 2026-07-20T02:00:00.000Z */
            updatedAt: string;
        };
        DeviceListDto: {
            /**
             * @description 서버 현재 시각(UTC). lastSeenAt과 비교해 마지막 연결 경과 시간을 계산한다
             * @example 2026-07-29T06:30:00.000Z
             */
            serverTime: string;
            /** @description 이름순 */
            items: components["schemas"]["DeviceDto"][];
        };
        CreateDeviceDto: {
            /**
             * @description 설치 위치 설명
             * @example 학사기숙사 A동 1층
             */
            location?: string | null;
            /**
             * @description 기기가 속한 위치 그룹 (GET /signage/target-groups의 id). 수정할 때는 통째로 바꾼다. 숨긴 그룹은 새로 추가할 수 없지만 이미 연결된 것은 그대로 둘 수 있다
             * @example [
             *       "grp_house_a"
             *     ]
             */
            groupIds?: string[];
            /**
             * @description MVP는 LANDSCAPE만 쓴다
             * @default LANDSCAPE
             * @enum {string}
             */
            orientation?: "LANDSCAPE" | "PORTRAIT";
            /**
             * @description 편성 응답의 layout.type
             * @default FOUR_GRID
             * @enum {string}
             */
            layout?: "SINGLE" | "FOUR_GRID";
            /**
             * @description 포스터 전환 간격(초)
             * @default 10
             */
            rotationSeconds?: number;
            /**
             * @description 편성 갱신 주기(초). 게시 중단이 기기에 반영되기까지의 최대 시간이다
             * @default 60
             */
            refreshAfterSeconds?: number;
            /**
             * @description 기기 이름
             * @example A동 로비 TV
             */
            name: string;
        };
        DeviceWithTokenDto: {
            /** @example 3c1e9a7b-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            id: string;
            /** @example A동 로비 TV */
            name: string;
            /** @example 학사기숙사 A동 1층 */
            location: string | null;
            /**
             * @example [
             *       "grp_house_a"
             *     ]
             */
            groupIds: string[];
            /**
             * @example LANDSCAPE
             * @enum {string}
             */
            orientation: "LANDSCAPE" | "PORTRAIT";
            /** @description 기기가 마지막으로 알려 준 해상도. heartbeat 전에는 null */
            resolution: components["schemas"]["ResolutionDto"] | null;
            /**
             * @description 마지막 heartbeat 시각
             * @example 2026-07-29T06:29:50.000Z
             */
            lastSeenAt: string | null;
            /** @example 0.4.2 */
            appVersion: string | null;
            /**
             * @description 기기가 heartbeat로 알린, 지금 재생 중인 편성 버전. 편성 API의 최신 playlistVersion과 다르면 동기화가 밀린 것이다
             * @example 9f2b5c0e3a1d4f6b
             */
            lastPlaylistVersion: string | null;
            /**
             * @description 기기가 마지막으로 포스터를 정상 렌더링한 시각(기기 시계 기준)
             * @example 2026-07-29T06:29:50.000Z
             */
            lastRenderOkAt: string | null;
            /**
             * @description DISABLED: 비활성. ONLINE: 3분 안에 heartbeat가 옴. OFFLINE: 그 외(한 번도 안 온 경우 포함)
             * @example ONLINE
             * @enum {string}
             */
            status: "ONLINE" | "OFFLINE" | "DISABLED";
            layout: components["schemas"]["DeviceLayoutDto"];
            /**
             * @description 편성 갱신 주기(초)
             * @example 60
             */
            refreshAfterSeconds: number;
            /**
             * @description 현재 토큰을 발급한 시각. 재발급하면 바뀐다
             * @example 2026-07-20T02:00:00.000Z
             */
            tokenIssuedAt: string;
            /** @example 2026-07-20T02:00:00.000Z */
            createdAt: string;
            /** @example 2026-07-20T02:00:00.000Z */
            updatedAt: string;
            /**
             * @description 기기 토큰 원문. **다시 조회할 수 없다.** TV에서 `X-Device-Token` 헤더로 보낸다.
             *     TV 설정 링크는 프론트가 `https://<프론트>/display/{id}#token={token}`처럼 만든다 (#뒤는 서버로 전송되지 않는다).
             * @example fgd_q8Zb2kX1n3VwY7tJ0rLmA9cD4eF6gH5iK2oP1sU3wX8
             */
            token: string;
        };
        UpdateDeviceDto: {
            /**
             * @description 설치 위치 설명
             * @example 학사기숙사 A동 1층
             */
            location?: string | null;
            /**
             * @description 기기가 속한 위치 그룹 (GET /signage/target-groups의 id). 수정할 때는 통째로 바꾼다. 숨긴 그룹은 새로 추가할 수 없지만 이미 연결된 것은 그대로 둘 수 있다
             * @example [
             *       "grp_house_a"
             *     ]
             */
            groupIds?: string[];
            /**
             * @description MVP는 LANDSCAPE만 쓴다
             * @default LANDSCAPE
             * @enum {string}
             */
            orientation?: "LANDSCAPE" | "PORTRAIT";
            /**
             * @description 편성 응답의 layout.type
             * @default FOUR_GRID
             * @enum {string}
             */
            layout?: "SINGLE" | "FOUR_GRID";
            /**
             * @description 포스터 전환 간격(초)
             * @default 10
             */
            rotationSeconds?: number;
            /**
             * @description 편성 갱신 주기(초). 게시 중단이 기기에 반영되기까지의 최대 시간이다
             * @default 60
             */
            refreshAfterSeconds?: number;
            /** @example A동 로비 TV (왼쪽) */
            name?: string;
            /**
             * @description false면 비활성(DISABLED). 토큰이 있어도 편성을 받을 수 없다
             * @example true
             */
            isActive?: boolean;
        };
        DeviceSessionDto: {
            /** @example 3c1e9a7b-5b7d-4e21-9a0c-1d8e5f6b2c34 */
            deviceId: string;
            /** @example A동 로비 TV */
            name: string;
            /** @example 학사기숙사 A동 1층 */
            location: string | null;
            /**
             * @example LANDSCAPE
             * @enum {string}
             */
            orientation: "LANDSCAPE" | "PORTRAIT";
            /**
             * @description 서버 현재 시각. 기기 시계 보정에 쓴다
             * @example 2026-07-29T06:30:00.000Z
             */
            serverTime: string;
        };
        PlaylistItemDto: {
            /** @example 8d2f4a1e-3c5b-4e21-9a0c-1d8e5f6b2c34 */
            submissionId: string;
            /**
             * @description 신청 version. 내용이 바뀌면 오른다
             * @example 3
             */
            revision: number;
            /** @example 겨울 정기 공연 〈한밤의 물리학〉 */
            title: string;
            /**
             * @description 카테고리 표시 이름
             * @example 공연
             */
            category: string;
            /**
             * @description TV용 포스터(1920x1080 안, webp). fetch()로 읽을 수 있어야 한다(버킷 CORS에 GET 필요)
             * @example https://gsainfoteam-icarus-flyer-g-production.s3.ap-northeast-2.amazonaws.com/assets/0f8e2c1a-.../tv.webp
             */
            assetUrl: string;
            /**
             * @description 상세 링크(QR). 없으면 null
             * @example https://ziggle.gistory.me/notice/1041
             */
            detailUrl: string | null;
            /** @example 2026-07-30T00:00:00.000Z */
            startsAt: string;
            /** @example 2026-08-06T14:59:59.000Z */
            endsAt: string;
            /**
             * @description 높을수록 앞에 온다
             * @example 0
             */
            priority: number;
            /**
             * @description 포스터 내용의 sha256. 미디어 캐시 key다. 내용이 같으면 항상 같고, 다르면 반드시 다르다
             * @example sha256:9f2b5c0e3a1d4f6b8c7e9a0d1f2e3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c
             */
            checksum: string;
            /** @example 12월 셋째 주 금요일 저녁 */
            subtitle: string | null;
            /** @example 대강당 */
            location: string | null;
            /**
             * @description 주최 (신청의 organizerName)
             * @example 공연동아리 페이드인
             */
            organizerName: string | null;
        };
        PlaylistDto: {
            /**
             * @description 서버 현재 시각. 게시 기간 판정과 오프라인 시각 보정의 기준이다
             * @example 2026-07-29T06:30:00.000Z
             */
            serverTime: string;
            /**
             * @description 편성 내용(항목, 기기 이름, 기기 화면 설정)의 해시. 같으면 내용이 같다. ETag 헤더와 같은 값이다
             * @example 9f2b5c0e3a1d4f6b
             */
            playlistVersion: string;
            /**
             * @description 기기 이름. 관리자가 바꾸면 다음 편성에 반영된다
             * @example A동 로비 TV
             */
            deviceName: string;
            /**
             * @description 다음 편성 요청까지 기다릴 시간(초)
             * @example 60
             */
            refreshAfterSeconds: number;
            layout: components["schemas"]["DeviceLayoutDto"];
            /** @description 지금 띄울 게시물. 우선순위 높은 순, 같으면 시작이 이른 순. 없으면 빈 배열(오류 아님) */
            items: components["schemas"]["PlaylistItemDto"][];
        };
        ResolutionInputDto: {
            /** @example 1920 */
            width: number;
            /** @example 1080 */
            height: number;
        };
        HeartbeatDto: {
            /**
             * @description 플레이어 앱 버전
             * @example 0.4.2
             */
            appVersion: string;
            /**
             * @description 지금 재생 중인 편성의 playlistVersion. 첫 로드 전이면 null
             * @example 9f2b5c0e3a1d4f6b
             */
            playlistVersion?: string | null;
            /**
             * @description 마지막으로 포스터를 정상 렌더링한 시각(기기 시계). 아직 렌더 전이면 null
             * @example 2026-07-29T06:29:50.000Z
             */
            lastRenderOkAt?: string | null;
            resolution: components["schemas"]["ResolutionInputDto"];
        };
        PlayEventDto: {
            /**
             * @description 이벤트마다 기기가 만드는 UUID. 서버가 이 값으로 중복을 거른다
             * @example 5d1f0c2e-7b5d-4e21-9a0c-1d8e5f6b2c34
             */
            eventId: string;
            /**
             * @description 플레이어 프로세스 하나를 가리키는 ID
             * @example ses_01J8ZK
             */
            sessionId: string;
            /** @example 8d2f4a1e-3c5b-4e21-9a0c-1d8e5f6b2c34 */
            submissionId: string;
            /**
             * @description 편성 항목의 revision. 모르면 null
             * @example 3
             */
            revision?: number | null;
            /**
             * @description 렌더링을 시작한 시각(기기 시계, UTC ISO 8601)
             * @example 2026-07-29T06:28:00.000Z
             */
            startedAt: string;
            /**
             * @description 노출 시간(ms)
             * @example 10000
             */
            durationMs: number;
            /**
             * @description 전환 간격을 다 채웠는지. 중간에 편성이 바뀌어 끊겼으면 false
             * @example true
             */
            completed: boolean;
        };
        PlayEventsDto: {
            /** @description 노출 이벤트 목록. 한 번에 최대 300개. 비어 있어도 된다 */
            events: components["schemas"]["PlayEventDto"][];
        };
        PlayEventsResultDto: {
            /**
             * @description 새로 저장한 이벤트 수
             * @example 12
             */
            accepted: number;
            /**
             * @description 이미 받은 이벤트라 건너뛴 수 (재전송·같은 batch 안 중복)
             * @example 0
             */
            duplicates: number;
        };
        ImpressionStatsItemDto: {
            /** @example 8d2f4a1e-3c5b-4e21-9a0c-1d8e5f6b2c34 */
            submissionId: string;
            /** @example 겨울 정기 공연 〈한밤의 물리학〉 */
            title: string;
            /**
             * @description 디스플레이가 포스터를 정상 렌더링한 횟수. 사람이 본 횟수가 아니다
             * @example 1840
             */
            impressions: number;
            /**
             * @description 그중 전환 간격을 다 채운 횟수
             * @example 1795
             */
            completedImpressions: number;
            /**
             * @description 기간 안에 한 번이라도 띄운 기기 수
             * @example 3
             */
            deviceCount: number;
        };
        ImpressionStatsDto: {
            /**
             * @description 시작 날짜(서울, 포함)
             * @example 2026-07-01
             */
            from: string;
            /**
             * @description 끝 날짜(서울, 포함)
             * @example 2026-07-29
             */
            to: string;
            /**
             * @description 집계가 마지막으로 끝난 시각. 이후에 들어온 이벤트는 아직 반영되지 않았다(집계는 10분마다). 한 번도 안 돌았으면 null
             * @example 2026-07-29T06:30:00.000Z
             */
            aggregatedAt: string | null;
            /** @description 노출이 많은 순. 기간 안에 노출이 없는 게시물은 없다 */
            items: components["schemas"]["ImpressionStatsItemDto"][];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    AppController_getHello: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": string;
                };
            };
        };
    };
    HealthController_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The Health Check is successful */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @example ok
                         * @enum {string}
                         */
                        status?: "ok" | "degraded";
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       }
                         *     }
                         */
                        info?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /** @example {} */
                        error?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       }
                         *     }
                         */
                        details?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        };
                    };
                };
            };
            /** @description The Health Check is not successful */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @example error
                         * @enum {string}
                         */
                        status?: "error" | "shutting_down";
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       }
                         *     }
                         */
                        info?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /**
                         * @example {
                         *       "redis": {
                         *         "status": "down",
                         *         "message": "Could not connect",
                         *         "responseTime": 3005
                         *       }
                         *     }
                         */
                        error?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        } | null;
                        /**
                         * @example {
                         *       "database": {
                         *         "status": "up",
                         *         "responseTime": 12
                         *       },
                         *       "redis": {
                         *         "status": "down",
                         *         "message": "Could not connect",
                         *         "responseTime": 3005
                         *       }
                         *     }
                         */
                        details?: {
                            [key: string]: {
                                /** @enum {string} */
                                status: "up" | "degraded" | "down";
                                /** @description Time the health indicator took to respond, in ms */
                                responseTime?: number;
                            } & {
                                [key: string]: unknown;
                            };
                        };
                    };
                };
            };
        };
    };
    AuthController_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponseDto"];
                };
            };
            /** @description code 만료·재사용, redirectUri 또는 codeVerifier 불일치 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 입력 검증 실패 (VALIDATION_FAILED, fields에 필드별 오류) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description IdP 장애 */
            502: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    AuthController_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponseDto"];
                };
            };
            /** @description refresh token 만료·무효. 다시 로그인해야 한다 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 입력 검증 실패 (VALIDATION_FAILED, fields에 필드별 오류) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description IdP 장애 */
            502: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    AuthController_getSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponseDto"];
                };
            };
            /** @description 토큰 없음·만료·무효, 또는 삭제된 사용자 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    AuthController_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    PolicyController_getConfig: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SignageConfigDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    CategoriesController_findAll: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryDto"][];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    TargetGroupsController_findAll: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TargetGroupDto"][];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    TargetGroupsController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTargetGroupDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TargetGroupDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 이름 검증 실패: 비었거나 40자 초과, 대소문자를 무시하고 다른 그룹(숨긴 그룹 포함)과 중복. 모두 fields.name */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    TargetGroupsController_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 그룹 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 삭제됨 */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 그룹 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 기기나 신청이 쓰고 있는 그룹 (code CONFLICT) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    TargetGroupsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 그룹 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTargetGroupDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TargetGroupDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 그룹 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 이름 검증 실패: 비었거나 40자 초과, 대소문자를 무시하고 다른 그룹(숨긴 그룹 포함)과 중복. 모두 fields.name */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    AssetsController_presign: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PresignAssetRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PresignAssetResponseDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 최대 용량 초과 (PAYLOAD_TOO_LARGE, fields.sizeBytes에 한도 안내) */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 입력 검증 실패 (허용하지 않는 형식 등) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    AssetsController_complete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description presign 응답의 assetId */
                assetId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssetDto"];
                };
            };
            /** @description 아직 파일을 올리지 않았다 (INVALID_REQUEST). 업로드 후 다시 부른다 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 asset이거나 남의 asset */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 이미지 거절 (VALIDATION_FAILED). fields.file에 사용자에게 보여 줄 사유 (예: "짧은 변이 1080px 이상이어야 합니다. (현재 800px)") */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    SubmissionsController_list: {
        parameters: {
            query?: {
                /** @description 이전 응답의 nextCursor. 첫 페이지는 비운다 */
                cursor?: string;
                /** @description 한 페이지 항목 수 */
                limit?: number;
                /** @description me: 내 신청. all: 전체 신청 (REVIEWER·SUPER_ADMIN만, 아니면 403) */
                scope?: "me" | "all";
                /** @description 상태 복수 필터 (쉼표 구분). 비우면 ARCHIVED를 뺀 전체. ARCHIVED는 명시해야 나온다 */
                statuses?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageEnvelopeDto"] & {
                        items: components["schemas"]["SubmissionDto"][];
                    };
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description scope=all인데 검토자가 아님 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 알 수 없는 scope·status, 잘못된 limit */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    SubmissionsController_create: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 시도 하나당 UUID 하나. 재시도에는 같은 값을 다시 쓴다.
                 *
                 *     - 같은 key로 이미 성공한 요청이면 처리하지 않고 처음 응답을 그대로 준다 (`Idempotent-Replayed: true` 헤더)
                 *     - 같은 key의 요청이 처리 중이면 끝날 때까지 기다렸다가 같은 응답을 준다. 너무 오래 걸리면 409 `CONFLICT`
                 *     - 같은 key로 내용이 다른 요청을 보내면 422 `IDEMPOTENCY_KEY_REUSED`
                 *     - 헤더가 없거나 형식이 틀리면 400 `INVALID_REQUEST`
                 *     - 실패한 요청은 기억하지 않는다. 같은 key로 다시 보내면 다시 처리한다
                 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSubmissionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 같은 공지로 진행 중인 신청이 있음 (ALREADY_SUBMITTED, fields.detailUrl). 반려·중단된 신청은 새로 만들지 말고 수정 후 다시 제출한다 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 입력 검증 실패 (VALIDATION_FAILED). fields에 필드별 문구: 제목, 카테고리, 포스터(assetId), 기간(startAt·endAt), 상세 링크, 대상 위치 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    SubmissionsController_summary: {
        parameters: {
            query?: {
                /** @description me: 내 신청. all: 전체 신청 (REVIEWER·SUPER_ADMIN만, 아니면 403) */
                scope?: "me" | "all";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionSummaryDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description scope=all인데 검토자가 아님 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    SubmissionsController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청이거나 볼 수 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    SubmissionsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSubmissionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청이거나 볼 수 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description version이 최신이 아니거나 고칠 수 없는 상태 (CONFLICT), 바꾼 상세 링크의 공지로 이미 신청함 (ALREADY_SUBMITTED) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 입력 검증 실패 (VALIDATION_FAILED). fields에 필드별 문구: 제목, 카테고리, 포스터(assetId), 기간(startAt·endAt), 상세 링크, 대상 위치 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    SubmissionsController_submit: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 시도 하나당 UUID 하나. 재시도에는 같은 값을 다시 쓴다.
                 *
                 *     - 같은 key로 이미 성공한 요청이면 처리하지 않고 처음 응답을 그대로 준다 (`Idempotent-Replayed: true` 헤더)
                 *     - 같은 key의 요청이 처리 중이면 끝날 때까지 기다렸다가 같은 응답을 준다. 너무 오래 걸리면 409 `CONFLICT`
                 *     - 같은 key로 내용이 다른 요청을 보내면 422 `IDEMPOTENCY_KEY_REUSED`
                 *     - 헤더가 없거나 형식이 틀리면 400 `INVALID_REQUEST`
                 *     - 실패한 요청은 기억하지 않는다. 같은 key로 다시 보내면 다시 처리한다
                 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmissionVersionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청이거나 볼 수 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description version이 최신이 아니거나 REJECTED·SUSPENDED·DRAFT가 아님 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 기간이 지금 기준으로 맞지 않음. 기간을 고친 뒤 다시 요청한다 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    SubmissionsController_cancel: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 시도 하나당 UUID 하나. 재시도에는 같은 값을 다시 쓴다.
                 *
                 *     - 같은 key로 이미 성공한 요청이면 처리하지 않고 처음 응답을 그대로 준다 (`Idempotent-Replayed: true` 헤더)
                 *     - 같은 key의 요청이 처리 중이면 끝날 때까지 기다렸다가 같은 응답을 준다. 너무 오래 걸리면 409 `CONFLICT`
                 *     - 같은 key로 내용이 다른 요청을 보내면 422 `IDEMPOTENCY_KEY_REUSED`
                 *     - 헤더가 없거나 형식이 틀리면 400 `INVALID_REQUEST`
                 *     - 실패한 요청은 기억하지 않는다. 같은 key로 다시 보내면 다시 처리한다
                 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmissionVersionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청이거나 볼 수 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description version이 최신이 아니거나 취소할 수 없는 상태. 이미 게시 중이면 운영자에게 중단을 요청한다 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    AuditLogsController_list: {
        parameters: {
            query?: {
                /** @description 대상 종류. 검토자가 아니면 SUBMISSION을 보내야 한다 (targetId를 비우면 본인 신청 전체). USER는 SUPER_ADMIN만 */
                targetType?: "SUBMISSION" | "DEVICE" | "GROUP" | "USER";
                /** @description 대상 ID (신청 ID, 기기 ID, 그룹 ID) */
                targetId?: string;
                /** @description 행위 필터 */
                action?: string;
                /** @description 이전 응답의 nextCursor. 첫 페이지는 비운다 */
                cursor?: string;
                /** @description 한 페이지 항목 수 */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageEnvelopeDto"] & {
                        items: components["schemas"]["AuditLogDto"][];
                    };
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 검토자가 아닌데 본인 신청이 아닌 로그를 요청함 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 알 수 없는 대상 종류·행위 형식, 잘못된 limit */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    UsersController_list: {
        parameters: {
            query?: {
                /** @description 이름·이메일·학번에 포함된 문자열 (대소문자 무시, 최대 100자). %와 _도 글자 그대로 찾는다 */
                q?: string;
                /** @description 이 역할을 부여받은 사용자만. 부여된 역할 그대로 거른다(REVIEWER로 거르면 REVIEWER 없이 SUPER_ADMIN만 가진 사용자는 빠진다) */
                role?: "REVIEWER" | "SUPER_ADMIN";
                /** @description 이전 응답의 nextCursor. 첫 페이지는 비운다 */
                cursor?: string;
                /** @description 한 페이지 항목 수 */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageEnvelopeDto"] & {
                        items: components["schemas"]["AdminUserDto"][];
                    };
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 검색어가 너무 김, 알 수 없는 역할, 잘못된 limit */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    UsersController_grant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 사용자 ID */
                id: string;
                /** @description 역할. SUBMITTER는 모두가 가지므로 부여·회수할 수 없다 */
                role: "REVIEWER" | "SUPER_ADMIN";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 부여 후의 사용자 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminUserDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 사용자 (로그인한 적 없는 사람 포함) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN이 아닌 역할 (fields.role) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    UsersController_revoke: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 사용자 ID */
                id: string;
                /** @description 역할. SUBMITTER는 모두가 가지므로 부여·회수할 수 없다 */
                role: "REVIEWER" | "SUPER_ADMIN";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 회수됨 (원래 없던 역할이어도 204) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN이 아님(처리 도중 다른 관리자에게 회수된 경우 포함), 또는 본인의 역할을 회수하려 함 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 사용자 (로그인한 적 없는 사람 포함) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 마지막 SUPER_ADMIN을 회수하려 함 (code CONFLICT). 위 규칙상 일어나지 않지만 안전장치로 막는다 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN이 아닌 역할 (fields.role) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    ReviewsController_queue: {
        parameters: {
            query?: {
                /** @description 볼 상태. 기본은 검토 대기 */
                status?: "DRAFT" | "PENDING_REVIEW" | "REJECTED" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ENDED" | "SUSPENDED" | "CANCELED" | "ARCHIVED";
                /** @description 카테고리 필터 (GET /signage/categories의 id) */
                categoryId?: string;
                /** @description 이전 응답의 nextCursor. 첫 페이지는 비운다 */
                cursor?: string;
                /** @description 한 페이지 항목 수 */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageEnvelopeDto"] & {
                        items: components["schemas"]["SubmissionDto"][];
                    };
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 알 수 없는 상태, 잘못된 limit */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    ReviewsController_approve: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 시도 하나당 UUID 하나. 재시도에는 같은 값을 다시 쓴다.
                 *
                 *     - 같은 key로 이미 성공한 요청이면 처리하지 않고 처음 응답을 그대로 준다 (`Idempotent-Replayed: true` 헤더)
                 *     - 같은 key의 요청이 처리 중이면 끝날 때까지 기다렸다가 같은 응답을 준다. 너무 오래 걸리면 409 `CONFLICT`
                 *     - 같은 key로 내용이 다른 요청을 보내면 422 `IDEMPOTENCY_KEY_REUSED`
                 *     - 헤더가 없거나 형식이 틀리면 400 `INVALID_REQUEST`
                 *     - 실패한 요청은 기억하지 않는다. 같은 key로 다시 보내면 다시 처리한다
                 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApproveSubmissionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description revision이 최신이 아님(다른 관리자가 먼저 처리했거나 신청자가 고침), 검토 대기가 아님, 기간이 끝남 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    ReviewsController_reject: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 시도 하나당 UUID 하나. 재시도에는 같은 값을 다시 쓴다.
                 *
                 *     - 같은 key로 이미 성공한 요청이면 처리하지 않고 처음 응답을 그대로 준다 (`Idempotent-Replayed: true` 헤더)
                 *     - 같은 key의 요청이 처리 중이면 끝날 때까지 기다렸다가 같은 응답을 준다. 너무 오래 걸리면 409 `CONFLICT`
                 *     - 같은 key로 내용이 다른 요청을 보내면 422 `IDEMPOTENCY_KEY_REUSED`
                 *     - 헤더가 없거나 형식이 틀리면 400 `INVALID_REQUEST`
                 *     - 실패한 요청은 기억하지 않는다. 같은 key로 다시 보내면 다시 처리한다
                 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RejectSubmissionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description revision이 최신이 아니거나 검토 대기가 아님 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 반려 사유 코드가 없거나 의견이 비어 있음 (fields) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    ReviewsController_suspend: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 시도 하나당 UUID 하나. 재시도에는 같은 값을 다시 쓴다.
                 *
                 *     - 같은 key로 이미 성공한 요청이면 처리하지 않고 처음 응답을 그대로 준다 (`Idempotent-Replayed: true` 헤더)
                 *     - 같은 key의 요청이 처리 중이면 끝날 때까지 기다렸다가 같은 응답을 준다. 너무 오래 걸리면 409 `CONFLICT`
                 *     - 같은 key로 내용이 다른 요청을 보내면 422 `IDEMPOTENCY_KEY_REUSED`
                 *     - 헤더가 없거나 형식이 틀리면 400 `INVALID_REQUEST`
                 *     - 실패한 요청은 기억하지 않는다. 같은 key로 다시 보내면 다시 처리한다
                 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SuspendSubmissionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionDetailDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 중단할 수 없는 상태이거나 이미 끝난 게시 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 사유가 비어 있음 (fields.reason) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    ReviewsController_history: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 신청 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReviewDto"][];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 신청이거나 볼 수 없는 신청 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DevicesController_list: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeviceListDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN만 볼 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DevicesController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDeviceDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeviceWithTokenDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 입력 검증 실패. 새로 추가한 그룹 중 없거나 숨긴 그룹이 있으면 fields.groupIds (이미 연결된 숨긴 그룹은 그대로 둘 수 있다) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DevicesController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 기기 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeviceDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description REVIEWER·SUPER_ADMIN만 볼 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 기기 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DevicesController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 기기 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDeviceDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeviceDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 기기 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 입력 검증 실패. 새로 추가한 그룹 중 없거나 숨긴 그룹이 있으면 fields.groupIds (이미 연결된 숨긴 그룹은 그대로 둘 수 있다) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DevicesController_rotateToken: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 기기 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeviceWithTokenDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description SUPER_ADMIN만 쓸 수 있다 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 없는 기기 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DeviceRuntimeController_session: {
        parameters: {
            query?: never;
            header: {
                /** @description 관리자가 기기를 등록·재발급할 때 받은 기기 토큰 (fgd_...) */
                "X-Device-Token": string;
            };
            path: {
                /** @description 기기 ID */
                deviceId: unknown;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeviceSessionDto"];
                };
            };
            /** @description 토큰이 없거나 틀렸거나, 비활성 기기이거나, 재발급으로 무효가 된 토큰 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 경로의 deviceId가 토큰의 기기와 다름 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    PlaylistController_playlist: {
        parameters: {
            query?: never;
            header: {
                /** @description 이전 응답의 ETag. 예: "9f2b5c0e3a1d4f6b" */
                "If-None-Match"?: string;
                /** @description 관리자가 기기를 등록·재발급할 때 받은 기기 토큰 (fgd_...) */
                "X-Device-Token": string;
            };
            path: {
                /** @description 기기 ID (토큰의 기기와 같아야 한다) */
                deviceId: unknown;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    /** @description "playlistVersion" (따옴표 포함) */
                    ETag?: unknown;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaylistDto"];
                };
            };
            /** @description 편성이 바뀌지 않았다. 캐시한 편성을 계속 재생한다 */
            304: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 기기 토큰이 없거나 틀림, 비활성 기기 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 경로의 deviceId가 토큰의 기기와 다름 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DeviceTelemetryController_heartbeat: {
        parameters: {
            query?: never;
            header: {
                /** @description 관리자가 기기를 등록·재발급할 때 받은 기기 토큰 (fgd_...) */
                "X-Device-Token": string;
            };
            path: {
                /** @description 기기 ID (토큰의 기기와 같아야 한다) */
                deviceId: unknown;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HeartbeatDto"];
            };
        };
        responses: {
            /** @description 기록함 */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 기기 토큰이 없거나 틀림, 비활성 기기 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 경로의 deviceId가 토큰의 기기와 다름 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 형식이 틀림 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    DeviceTelemetryController_playEvents: {
        parameters: {
            query?: never;
            header: {
                /** @description 관리자가 기기를 등록·재발급할 때 받은 기기 토큰 (fgd_...) */
                "X-Device-Token": string;
            };
            path: {
                /** @description 기기 ID (토큰의 기기와 같아야 한다) */
                deviceId: unknown;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlayEventsDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlayEventsResultDto"];
                };
            };
            /** @description 기기 토큰이 없거나 틀림, 비활성 기기 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 경로의 deviceId가 토큰의 기기와 다름 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 형식이 틀리거나 300개를 넘음. fields는 events.0.eventId 형식 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    StatsController_impressions: {
        parameters: {
            query?: {
                /** @description 시작 날짜(서울, 포함). 기본은 to의 29일 전 (30일) */
                from?: string;
                /** @description 끝 날짜(서울, 포함). 기본은 오늘 */
                to?: string;
                /** @description me: 내 게시물. all: 전체 (REVIEWER·SUPER_ADMIN만, 아니면 403) */
                scope?: "me" | "all";
                /** @description 묶는 기준. 지금은 submission만 */
                groupBy?: "submission";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImpressionStatsDto"];
                };
            };
            /** @description 로그인 필요 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description scope=all인데 검토자가 아님 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description 날짜 형식이 틀리거나 없는 날짜, 시작이 끝보다 늦음, 366일 초과 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
}
