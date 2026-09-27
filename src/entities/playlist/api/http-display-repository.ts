import { parseSubmissionPage } from "@/entities/submission/api/http-submission-repository";
import type { SignageSubmissionExpanded } from "@/entities/submission/model/types";
import { ApiError, isApiError } from "@/shared/api/error";
import type { HttpClient } from "@/shared/api/http-client";
import {
  readArray,
  readIsoDate,
  readNullableString,
  readNumber,
  readObject,
  readString,
} from "@/shared/api/parse";
import type { DisplayRepository } from "@/shared/api/repositories";
import type { DeviceCredentials } from "@/shared/lib/device-credential";
import {
  clampRotationSeconds,
  LAYOUT_TYPES,
  PREVIEW_DEVICE_ID,
} from "../model/types";
import type { LayoutType, Playlist, PlaylistItem } from "../model/types";

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

const PREVIEW_LAYOUT = { type: "SINGLE" as LayoutType, rotationSeconds: 10 };

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

export function parsePlaylist(payload: unknown): Playlist {
  const body = readObject(payload);
  const layout = readObject(body.layout, "layout");
  const type = readString(layout, "type", "layout.type");
  if (!(LAYOUT_TYPES as readonly string[]).includes(type)) {
    throw new ApiError({
      kind: "parse",
      code: "INVALID_RESPONSE",
      message: `알 수 없는 레이아웃: ${type}`,
    });
  }
  return {
    serverTime: readIsoDate(body, "serverTime"),
    playlistVersion: readString(body, "playlistVersion"),
    deviceName: readString(body, "deviceName"),
    refreshAfterSeconds: readNumber(body, "refreshAfterSeconds"),
    layout: {
      type: type as LayoutType,
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
        subtitle: readNullableString(item, "subtitle", at("subtitle")),
        location: readNullableString(item, "location", at("location")),
        organizerName: readNullableString(
          item,
          "organizerName",
          at("organizerName"),
        ),
      };
    }),
  };
}

/** 게시 중 신청 → 편성 항목. 포스터는 미리보기 변형(1280px 안)을 쓴다. */
function toPreviewItem(submission: SignageSubmissionExpanded): PlaylistItem {
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
    const query = { statuses: "PUBLISHED", limit: 100 };
    // 관리자는 전체 게시물을, 게시자는 자기 게시물을 본다.
    const page = parseSubmissionPage(
      await userClient
        .request({
          path: "/signage/submissions",
          query: { ...query, scope: "all" },
          signal,
        })
        .catch((error: unknown) => {
          if (isApiError(error) && error.status === 403) {
            return userClient.request({
              path: "/signage/submissions",
              query: { ...query, scope: "me" },
              signal,
            });
          }
          throw error;
        }),
    );
    const items = page.items.map(toPreviewItem);
    return {
      serverTime: page.serverTime,
      deviceName: null,
      playlistVersion: items
        .map((item) => `${item.submissionId}@${item.revision}`)
        .sort()
        .join("|"),
      refreshAfterSeconds: 60,
      layout: PREVIEW_LAYOUT,
      items,
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
