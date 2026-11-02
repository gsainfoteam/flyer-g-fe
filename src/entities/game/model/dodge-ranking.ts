/**
 * 전단지 피하기 순위. TV마다 따로 남긴다(전체 순위는 아직 없다). 높은 점수가 앞이고,
 * 같으면 먼저 세운 기록이 앞이다. 상위 5개만 남긴다.
 */
export const RANKING_SIZE = 5;

export interface DodgeRecord {
  name: string;
  score: number;
  /** 기록한 시각(ms) */
  at: number;
}

/** 기록을 넣은 새 순위와 그 기록의 순위(1부터). 5위 밖이면 null */
export function addDodgeRecord(
  ranking: readonly DodgeRecord[],
  record: DodgeRecord,
): { ranking: DodgeRecord[]; rank: number | null } {
  const sorted = [...ranking, record].sort((a, b) => b.score - a.score || a.at - b.at);
  const top = sorted.slice(0, RANKING_SIZE);
  const index = top.indexOf(record);
  return { ranking: top, rank: index >= 0 ? index + 1 : null };
}

/** 저장소에서 읽은 순위. 모양이 틀린 항목은 버린다. */
export function readDodgeRanking(raw: unknown): DodgeRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item): DodgeRecord[] => {
      if (typeof item !== "object" || item === null) return [];
      const { name, score, at } = item as Record<string, unknown>;
      return typeof name === "string" &&
        typeof score === "number" &&
        Number.isFinite(score) &&
        typeof at === "number"
        ? [{ name: name.slice(0, 12), score, at }]
        : [];
    })
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, RANKING_SIZE);
}
