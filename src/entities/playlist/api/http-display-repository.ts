import { parsePlaybackLineup } from "@/entities/lineup/api/parse";
import { parseSubmissionPage } from "@/entities/submission/api/http-submission-repository";
import type { SignageSubmissionExpanded } from "@/entities/submission/model/types";
import { ApiError, isApiError } from "@/shared/api/error";
import type { HttpClient } from "@/shared/api/http-client";
import {
  readArray,
  readIsoDate,
  readNullableNumber,
  readNullableString,
  readNumber,
  readObject,
  readString,
} from "@/shared/api/parse";
import type { JsonObject } from "@/shared/api/parse";
import type { DisplayRepository } from "@/shared/api/repositories";
import type { DeviceCredentials } from "@/shared/lib/device-credential";
import {
  clampRotationSeconds,
  CONTENT_KINDS,
  DEFAULT_LAYOUT_TYPE,
  PREVIEW_DEVICE_ID,
  readLayoutType,
} from "../model/types";
import {
  EVENT_BANNER_MODES,
  EVENT_BANNER_OCCASIONS,
  STORY_TAGS,
} from "@/entities/submission/model/types";
import type {
  ContentKind,
  Playlist,
  PlaylistEventBanner,
  PlaylistItem,
  PlaylistStory,
  PlaylistVideo,
} from "../model/types";

/**
 * TV 편성의 실제 구현 (`API-CHANGES-BACKEND.md` 8절).
 *
 * - `GET /signage/devices/{id}/playlist`를 기기 토큰(`X-Device-Token`)으로 부른다.
 *   사용자 세션과 무관하다.
 * - 받은 `ETag`를 다음 요청의 `If-None-Match`로 보낸다. 편성이 그대로면 서버가
 *   304(본문 없음)를 주고, 마지막 편성을 계속 쓴다. 이때 `serverTime`은 마지막으로
 *   받은 뒤 흐른 시간만큼 옮긴다 — 오프라인 시각 보정이 이 값에 기댄다.
 * - 기기 이름도 편성에 담겨 온다. 관리자가 이름을 바꾸면 편성 버전이 바뀌어 다음
 *   편성에서 TV에 반영된다.
 * - 기기 인증 실패는 `DEVICE_*` code로 바꾼다. 401을 그대로 두면 같은 브라우저에
 *   로그인한 관리자 세션까지 "로그인 만료"로 끊긴다.
 *
 * 미리보기(`PREVIEW_DEVICE_ID`)는 기기가 아니라 로그인한 사용자의 게시 중 신청으로
 * 편성을 만든다. 기기별 대상 위치는 반영하지 않는 "전체 게시물" 미리보기다.
 */
export interface HttpDisplayRepositoryOptions {
  /** 인증 헤더 없이 부르는 client. 기기 토큰은 요청마다 싣는다. */
  deviceClient: HttpClient;
  /** 미리보기에서 신청 목록을 부르는 사용자 client */
  userClient: HttpClient;
  credentials: DeviceCredentials;
  now?: () => number;
}

interface DeviceState {
  playlist: Playlist;
  etag: string | null;
  /** 이 편성을 받은(또는 304로 확인한) 기기 시각(ms) */
  receivedAt: number;
}

const PREVIEW_LAYOUT = { type: DEFAULT_LAYOUT_TYPE, rotationSeconds: 10 };

function deviceNotRegistered(): ApiError {
  return new ApiError({
    kind: "unknown",
    code: "DEVICE_NOT_REGISTERED",
    message: "이 기기의 토큰이 없습니다.",
  });
}

/** 기기 토큰이 거절되면(없음·틀림·재발급·비활성, 다른 기기) 기기 전용 code로 바꾼다. */
function asDeviceError(error: unknown): unknown {
  if (isApiError(error) && (error.status === 401 || error.status === 403)) {
    return new ApiError({
      kind: "http",
      code: "DEVICE_UNAUTHORIZED",
      message: "기기 토큰이 거절되었습니다.",
      status: error.status,
      requestId: error.requestId,
    });
  }
  return error;
}

/**
 * 편성 응답. v2(`?v=2`, 배포 ⑥)는 종류별 `submissions`와 `settings`로 오고, 이를 지금
 * 재생기가 쓰는 모양으로 옮긴다. 블록·설정·운영 컨텐츠를 캐시까지 보존한다. `?v=2`를 모르는 서버는 v1로 답한다.
 */
export function parsePlaylist(payload: unknown): Playlist {
  const body = readObject(payload);
  if (body.submissions === undefined || body.submissions === null) {
    return parseV1Playlist(body);
  }
  const submissions = readObject(body.submissions, "submissions");
  const settings = readObject(body.settings, "settings");
  return {
    ...parseV1Playlist({
      ...body,
      layout: {
        type: settings.posterLayout,
        rotationSeconds: settings.rotationSeconds,
      },
      items: submissions.POSTER ?? [],
    }),
    ...(body.blocks !== undefined ? { lineup: parsePlaybackLineup(body) } : {}),
    eventBanners: readArray(
      submissions.EVENT_BANNER ?? [],
      "submissions.EVENT_BANNER",
    ).flatMap(parseEventBanner),
    stories: readArray(submissions.STORY ?? [], "submissions.STORY").flatMap(
      parseStory,
    ),
  };
}

function parseEventBanner(raw: unknown, index: number): PlaylistEventBanner[] {
  const path = `submissions.EVENT_BANNER[${index}]`;
  const item = readObject(raw, path);
  const at = (key: string) => `${path}.${key}`;
  const mode = readString(item, "mode", at("mode"));
  const occasion = readNullableString(item, "occasion", at("occasion"));
  // 모르는 값 한 건 때문에 편성 전체를 버리지 않는다. 그 건만 뺀다.
  if (
    !EVENT_BANNER_MODES.some((known) => known === mode) ||
    (occasion !== null &&
      !EVENT_BANNER_OCCASIONS.some((known) => known === occasion))
  ) {
    return [];
  }
  return [
    {
      submissionId: readString(item, "submissionId", at("submissionId")),
      revision: readNumber(item, "revision", at("revision")),
      startsAt: readIsoDate(item, "startsAt", at("startsAt")),
      endsAt: readIsoDate(item, "endsAt", at("endsAt")),
      checksum: readString(item, "checksum", at("checksum")),
      mode: mode as PlaylistEventBanner["mode"],
      occasion: occasion as PlaylistEventBanner["occasion"],
      recipient: readString(item, "recipient", at("recipient")),
      headline: readNullableString(item, "headline", at("headline")),
      message: readNullableString(item, "message", at("message")),
      sender: readNullableString(item, "sender", at("sender")),
      photoUrl: readNullableString(item, "photoUrl", at("photoUrl")),
      assetUrl: readNullableString(item, "assetUrl", at("assetUrl")),
    },
  ];
}

function parseStory(raw: unknown, index: number): PlaylistStory[] {
  const path = `submissions.STORY[${index}]`;
  const item = readObject(raw, path);
  const at = (key: string) => `${path}.${key}`;
  const tag = readString(item, "tag", at("tag"));
  if (!STORY_TAGS.some((known) => known === tag)) return [];
  return [
    {
      submissionId: readString(item, "submissionId", at("submissionId")),
      revision: readNumber(item, "revision", at("revision")),
      startsAt: readIsoDate(item, "startsAt", at("startsAt")),
      endsAt: readIsoDate(item, "endsAt", at("endsAt")),
      checksum: readString(item, "checksum", at("checksum")),
      storyNumber: readNullableNumber(item, "storyNumber", at("storyNumber")),
      tag: tag as PlaylistStory["tag"],
      body: readString(item, "body", at("body")),
    },
  ];
}

function parseV1Playlist(body: JsonObject): Playlist {
  const layout = readObject(body.layout, "layout");
  const rawType = readString(layout, "type", "layout.type");
  const type = readLayoutType(rawType);
  if (type === null) {
    throw new ApiError({
      kind: "parse",
      code: "INVALID_RESPONSE",
      message: `알 수 없는 레이아웃: ${rawType}`,
    });
  }
  return {
    serverTime: readIsoDate(body, "serverTime"),
    playlistVersion: readString(body, "playlistVersion"),
    deviceName: readString(body, "deviceName"),
    refreshAfterSeconds: readNumber(body, "refreshAfterSeconds"),
    layout: {
      type,
      rotationSeconds: clampRotationSeconds(
        readNumber(layout, "rotationSeconds", "layout.rotationSeconds"),
      ),
    },
    items: readArray(body.items, "items").map((raw, index): PlaylistItem => {
      const path = `items[${index}]`;
      const item = readObject(raw, path);
      const at = (key: string) => `${path}.${key}`;
      return {
        submissionId: readString(item, "submissionId", at("submissionId")),
        revision: readNumber(item, "revision", at("revision")),
        title: readString(item, "title", at("title")),
        category: readString(item, "category", at("category")),
        assetUrl: readString(item, "assetUrl", at("assetUrl")),
        detailUrl: readNullableString(item, "detailUrl", at("detailUrl")),
        startsAt: readIsoDate(item, "startsAt", at("startsAt")),
        endsAt: readIsoDate(item, "endsAt", at("endsAt")),
        priority: readNumber(item, "priority", at("priority")),
        checksum: readString(item, "checksum", at("checksum")),
        // 크기·종류가 빠졌다고 재생을 멈추지 않는다. 모르면 세로 포스터로 보고 그린다.
        kind: readContentKind(item, at("kind")),
        width: readNullableNumber(item, "width", at("width")) ?? 0,
        height: readNullableNumber(item, "height", at("height")) ?? 0,
        durationMs: readNullableNumber(item, "durationMs", at("durationMs")),
        video: readVideo(item, at("video")),
        subtitle: readNullableString(item, "subtitle", at("subtitle")),
        location: readNullableString(item, "location", at("location")),
        organizerName: readNullableString(
          item,
          "organizerName",
          at("organizerName"),
        ),
      };
    }),
    eventBanners: [],
    stories: [],
  };
}

/** 영상 재생 정보. 영상 배포(①) 전 서버는 필드를 보내지 않는다. */
function readVideo(
  item: Record<string, unknown>,
  path: string,
): PlaylistVideo | null {
  if (item.video === undefined || item.video === null) return null;
  const video = readObject(item.video, path);
  return {
    url: readString(video, "url", `${path}.url`),
    hasAudio: video.hasAudio === true,
  };
}

function readContentKind(
  item: Record<string, unknown>,
  path: string,
): ContentKind {
  const value = readNullableString(item, "kind", path);
  if (value === null) return "IMAGE";
  if (!(CONTENT_KINDS as readonly string[]).includes(value)) {
    throw new ApiError({
      kind: "parse",
      code: "INVALID_RESPONSE",
      message: `알 수 없는 콘텐츠 종류: ${value}`,
    });
  }
  return value as ContentKind;
}

/** 게시 중 이벤트 배너·제보 → 편성 항목. 미리보기가 쓴다. */
function toPreviewEventBanner(
  submission: SignageSubmissionExpanded,
): PlaylistEventBanner | null {
  const banner = submission.eventBanner;
  if (!banner || !submission.startAt || !submission.endAt) return null;
  return {
    submissionId: submission.id,
    revision: submission.version,
    startsAt: submission.startAt,
    endsAt: submission.endAt,
    checksum: `preview-${submission.id}@${submission.version}`,
    mode: banner.mode,
    occasion: banner.occasion,
    recipient: banner.recipient,
    headline: banner.headline,
    message: banner.message,
    sender: banner.sender,
    photoUrl: banner.photoUrl,
    assetUrl: banner.assetUrl,
  };
}

function toPreviewStory(
  submission: SignageSubmissionExpanded,
): PlaylistStory | null {
  const story = submission.story;
  if (!story || !submission.startAt || !submission.endAt) return null;
  return {
    submissionId: submission.id,
    revision: submission.version,
    startsAt: submission.startAt,
    endsAt: submission.endAt,
    checksum: `preview-${submission.id}@${submission.version}`,
    storyNumber: story.storyNumber,
    tag: story.tag,
    body: story.body,
  };
}

/**
 * 게시 중 신청 → 편성 항목. 포스터는 미리보기 변형(1280px 안)을 쓴다.
 *
 * 편성 v1은 포스터만 싣는다(이벤트 배너·제보는 편성 v2부터). 포스터 필드가 비어
 * 있는 신청은 그릴 수 없어 뺀다.
 */
function toPreviewItem(
  submission: SignageSubmissionExpanded,
): PlaylistItem | null {
  if (
    submission.type !== "POSTER" ||
    submission.categoryName === null ||
    submission.posterUrl === null ||
    submission.assetId === null ||
    submission.startAt === null ||
    submission.endAt === null
  ) {
    return null;
  }
  return {
    submissionId: submission.id,
    revision: submission.version,
    title: submission.title,
    category: submission.categoryName,
    assetUrl: submission.posterUrl,
    detailUrl: submission.detailUrl,
    startsAt: submission.startAt,
    endsAt: submission.endAt,
    priority: submission.priority,
    // asset은 내용이 바뀌지 않는다. 포스터를 바꾸면 새 asset이 된다.
    checksum: submission.assetId,
    kind: submission.posterKind ?? "IMAGE",
    width: submission.posterWidth ?? 0,
    height: submission.posterHeight ?? 0,
    durationMs: submission.posterDurationMs,
    video: submission.posterVideoUrl
      ? { url: submission.posterVideoUrl, hasAudio: false }
      : null,
    subtitle: submission.subtitle,
    location: submission.location,
    organizerName: submission.organizerName,
  };
}

export function createHttpDisplayRepository({
  deviceClient,
  userClient,
  credentials,
  now = Date.now,
}: HttpDisplayRepositoryOptions): DisplayRepository {
  const states = new Map<string, DeviceState>();

  const devicePath = (deviceId: string) =>
    `/signage/devices/${encodeURIComponent(deviceId)}`;

  const previewPlaylist = async (signal?: AbortSignal): Promise<Playlist> => {
    // 종류마다 따로 받는다. 제보가 많아도 포스터가 첫 페이지에서 밀리지 않게 한다.
    // 관리자는 전체 게시물을, 게시자는 자기 게시물을 본다.
    const published = async (type: string, limit: number) =>
      parseSubmissionPage(
        await userClient
          .request({
            path: "/signage/submissions",
            query: { statuses: "PUBLISHED", type, limit, scope: "all" },
            signal,
          })
          .catch((error: unknown) => {
            if (isApiError(error) && error.status === 403) {
              return userClient.request({
                path: "/signage/submissions",
                query: { statuses: "PUBLISHED", type, limit, scope: "me" },
                signal,
              });
            }
            throw error;
          }),
      );
    const [posters, content] = await Promise.all([
      published("POSTER", 100),
      published("EVENT_BANNER,STORY", 50),
    ]);
    const items = posters.items
      .map(toPreviewItem)
      .filter((item): item is PlaylistItem => item !== null);
    const eventBanners = content.items
      .map(toPreviewEventBanner)
      .filter((item): item is PlaylistEventBanner => item !== null);
    const stories = content.items
      .map(toPreviewStory)
      .filter((item): item is PlaylistStory => item !== null);
    return {
      serverTime: posters.serverTime,
      deviceName: null,
      playlistVersion: [...items, ...eventBanners, ...stories]
        .map((item) => `${item.submissionId}@${item.revision}`)
        .sort()
        .join("|"),
      refreshAfterSeconds: 60,
      layout: PREVIEW_LAYOUT,
      items,
      eventBanners,
      stories,
    };
  };

  return {
    async getPlaylist(deviceId, signal) {
      if (deviceId === PREVIEW_DEVICE_ID) return previewPlaylist(signal);

      const token = credentials.get(deviceId);
      if (token === null) throw deviceNotRegistered();
      const auth = { "X-Device-Token": token };
      const previous = states.get(deviceId);

      let etag: string | null = null;
      let payload: unknown;
      try {
        payload = await deviceClient.request({
          path: `${devicePath(deviceId)}/playlist`,
          query: { v: 2 },
          headers: previous?.etag
            ? { ...auth, "If-None-Match": previous.etag }
            : auth,
          allowNotModified: previous !== undefined,
          onResponse: (response) => {
            etag = response.headers.get("ETag");
          },
          signal,
        });
      } catch (error) {
        throw asDeviceError(error);
      }
      const receivedAt = now();

      if (payload === undefined && previous) {
        // 304: 편성은 그대로다. 서버 시각만 흐른 만큼 옮긴다.
        const playlist: Playlist = {
          ...previous.playlist,
          serverTime: new Date(
            previous.playlist.serverTime.getTime() +
              (receivedAt - previous.receivedAt),
          ),
        };
        states.set(deviceId, { playlist, etag: previous.etag, receivedAt });
        return playlist;
      }

      const playlist = parsePlaylist(payload);
      states.set(deviceId, { playlist, etag, receivedAt });
      return playlist;
    },
  };
}
