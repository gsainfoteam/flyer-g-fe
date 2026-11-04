import type { HttpClient } from "@/shared/api/http-client";
import type { LineupRepository } from "@/shared/api/repositories";
import { readArray, readObject, readString } from "@/shared/api/parse";
import { parseLineup, parseProgram } from "./parse";
import { parsePlaylist } from "@/entities/playlist/api/http-display-repository";

export function createHttpLineupRepository(
  client: HttpClient,
): LineupRepository {
  const path = (id: string) =>
    `/signage/target-groups/${encodeURIComponent(id)}/lineup`;
  return {
    async preview(id, signal) {
      return parsePlaylist(
        await client.request({
          path: `/signage/devices/${encodeURIComponent(id)}/playlist-preview`,
          signal,
        }),
      );
    },
    async get(id, signal) {
      return parseLineup(await client.request({ path: path(id), signal }));
    },
    async save(id, input, signal) {
      return parseLineup(
        await client.request({
          path: path(id),
          method: "PUT",
          body: input,
          signal,
        }),
      );
    },
    async listPrograms(signal) {
      return readArray(
        await client.request({ path: "/signage/programs", signal }),
      ).map((raw) => {
        const o = readObject(raw);
        return { ...parseProgram(o), id: readString(o, "id") };
      });
    },
  };
}
