import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  ArrowDown,
  ArrowUp,
  Blocks,
  ChevronDown,
  MonitorPlay,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { DisplayDevice } from "@/entities/device/model/types";
import {
  parseLineupBlock,
  parseLineupSettings,
} from "@/entities/lineup/api/parse";
import {
  LINEUP_LABELS,
  newSubmissionBlock,
} from "@/entities/lineup/model/types";
import type {
  BlockSchedule,
  Lineup,
  LineupInput,
  LineupProgram,
  LineupSubmissionType,
} from "@/entities/lineup/model/types";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { TypeIcon } from "@/entities/submission/ui/TypeIcon";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { FormField, IconTile } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import {
  useLineupPreview,
  useSaveLineup,
} from "../model/use-lineup";

/**
 * 위치 그룹 하나의 편성 편집 (9.3). 편성 화면(`LineupPage`)이 쓴다.
 *
 * 왼쪽은 표시 순서(블록 목록)와 화면 설정, 오른쪽은 따라 내려오는 "한 바퀴" 요약이다.
 * 한 바퀴 요약은 켜진 블록의 설정 시간으로 비율 막대와 순서를 그리고, 지금 게시물 수로
 * 한 건이 다시 나오는 간격을 어림한다. 저장 줄은 화면 아래에 고정된다.
 */
const selectClass =
  "h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const days = ["월", "화", "수", "목", "금", "토", "일"];
type DraftBlock = LineupInput["blocks"][number] & { key: string };

/** 운영 콘텐츠 블록은 종류 색이 없어 중립 회색을 쓴다. */
const PROGRAM_BAR = "bg-zinc-400";

function barOf(block: DraftBlock): string {
  return block.submissionType
    ? KIND_STYLE[block.submissionType].bar
    : PROGRAM_BAR;
}

export function LineupEditor({
  lineup,
  devices,
  programs,
  programsError,
  onReload,
}: {
  lineup: Lineup;
  /** 이 그룹을 편성 그룹으로 쓰는 TV */
  devices: DisplayDevice[];
  programs: (LineupProgram & { id: string })[];
  programsError: unknown;
  onReload(): Promise<void>;
}) {
  const [blocks, setBlocks] = useState<DraftBlock[]>(() =>
    lineup.blocks.map((b) => ({ ...b, key: b.id })),
  );
  const [settings, setSettings] = useState(() =>
    structuredClone(lineup.settings),
  );
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [adding, setAdding] = useState("POSTER");
  const save = useSaveLineup(lineup.groupId);
  const preview = useLineupPreview(devices[0]?.id);
  const total = blocks
    .filter((b) => b.enabled)
    .reduce((sum, b) => sum + b.durationSeconds, 0);
  const patch = (key: string, update: Partial<DraftBlock>) =>
    setBlocks((list) =>
      list.map((b) => (b.key === key ? { ...b, ...update } : b)),
    );
  const move = (index: number, direction: number) =>
    setBlocks((list) => {
      const next = [...list];
      [next[index], next[index + direction]] = [
        next[index + direction]!,
        next[index]!,
      ];
      return next;
    });
  const labelOf = (b: DraftBlock) =>
    b.submissionType
      ? LINEUP_LABELS[b.submissionType]
      : (programs.find((p) => p.id === b.programId)?.name ?? "운영 콘텐츠");

  const submit = async () => {
    if (save.isPending || conflict) return;
    setError(null);
    try {
      parseLineupSettings(settings);
      blocks.forEach((b) => parseLineupBlock({ ...b, id: b.id ?? b.key }));
    } catch {
      setError(
        "표시 시간은 5~300초, 건수는 1~10건입니다. 시간대·기간의 시작과 끝도 확인하세요.",
      );
      return;
    }
    try {
      const input: LineupInput = {
        version: lineup.version,
        settings,
        blocks: blocks.map(({ key, ...b }) => {
          void key;
          return b;
        }),
      };
      await save.mutateAsync(input);
      toast.success("편성 저장 완료", {
        description: "다음 편성 확인 때 TV에 반영됩니다.",
      });
    } catch (cause) {
      const collision = isApiError(cause) && cause.status === 409;
      setConflict(collision);
      setError(
        collision
          ? "다른 운영자가 편성을 변경했습니다. 현재 입력을 확인한 뒤 최신 편성을 다시 불러오세요."
          : isApiError(cause)
            ? [toUserMessage(cause), ...Object.values(cause.fields ?? {})].join(
                " · ",
              )
            : "편성을 저장하지 못했습니다.",
      );
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:gap-8">
        <fieldset
          disabled={save.isPending}
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex items-baseline gap-2">
            <h2 className="text-heading text-ink">표시 순서</h2>
            <span className="text-label text-ink-muted tabular-nums">
              블록 {blocks.length}개
            </span>
          </div>

          {blocks.length === 0 ? (
            <p className="rounded-block bg-surface px-5 py-8 text-center text-label text-ink-muted ring-1 ring-line">
              편성이 비어 있습니다. TV에 대기 화면이 표시됩니다.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {blocks.map((b, index) => (
                <BlockCard
                  key={b.key}
                  block={b}
                  index={index}
                  count={blocks.length}
                  label={labelOf(b)}
                  total={total}
                  settings={settings}
                  onPatch={(update) => patch(b.key, update)}
                  onMove={(direction) => move(index, direction)}
                  onRemove={() =>
                    setBlocks((list) =>
                      list.filter((item) => item.key !== b.key),
                    )
                  }
                />
              ))}
            </ol>
          )}

          <div className="flex items-center gap-2 rounded-block border border-dashed border-line-strong p-3">
            <select
              aria-label="추가할 콘텐츠"
              className={selectClass}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
            >
              {Object.entries(LINEUP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              disabled={blocks.length >= 30}
              onClick={() => {
                const b =
                  adding in LINEUP_LABELS
                    ? newSubmissionBlock(adding as LineupSubmissionType)
                    : {
                        source: "PROGRAM" as const,
                        programId: adding,
                        submissionType: null,
                        perVisit: null,
                        durationSeconds: 15,
                        enabled: true,
                        schedule: { type: "ALWAYS" as const },
                      };
                setBlocks((list) => [
                  ...list,
                  { ...b, key: crypto.randomUUID() },
                ]);
              }}
            >
              <Plus aria-hidden="true" />
              추가
            </Button>
          </div>
          {!!programsError && (
            <p className="text-caption text-ink-muted">
              운영 콘텐츠 목록을 불러오지 못했습니다. 기존 운영 콘텐츠 블록은
              유지됩니다.
            </p>
          )}

          <ScreenSettings settings={settings} onChange={setSettings} />
        </fieldset>

        <CyclePanel
          blocks={blocks}
          labelOf={labelOf}
          total={total}
          device={devices[0]}
          counts={
            preview.data
              ? {
                  POSTER: preview.data.items.length,
                  EVENT_BANNER: preview.data.eventBanners.length,
                  STORY: preview.data.stories.length,
                }
              : null
          }
        />
      </div>

      {(error || conflict) && (
        <div className="flex flex-wrap items-center gap-3">
          {error && (
            <p role="alert" className="text-body text-danger-strong">
              {error}
            </p>
          )}
          {conflict && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void onReload()}
            >
              현재 입력을 버리고 최신 편성 불러오기
            </Button>
          )}
        </div>
      )}

      {/* 블록이 많아도 저장 버튼이 화면 안에 있다. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-block lg:border lg:px-5">
        <p className="hidden min-w-0 text-caption text-ink-muted sm:block">
          저장하면 다음 편성 확인 때 TV에 반영. 기기별 예외 설정이 우선
        </p>
        <Button
          type="submit"
          className="ml-auto shrink-0"
          disabled={save.isPending || conflict}
        >
          {save.isPending && <Spinner aria-hidden="true" />}
          편성 저장
        </Button>
      </div>
    </form>
  );
}

function BlockCard({
  block: b,
  index,
  count,
  label,
  total,
  settings,
  onPatch,
  onMove,
  onRemove,
}: {
  block: DraftBlock;
  index: number;
  count: number;
  label: string;
  total: number;
  settings: Lineup["settings"];
  onPatch(update: Partial<DraftBlock>): void;
  onMove(direction: number): void;
  onRemove(): void;
}) {
  const minScenes =
    b.submissionType === "STORY"
      ? Math.ceil((b.perVisit ?? 2) / 2)
      : b.submissionType === "POSTER" &&
          settings.posterLayout === "WALL" &&
          (b.perVisit ?? 3) > 1
        ? (b.perVisit ?? 3) + Math.ceil((b.perVisit ?? 3) / 3)
        : (b.perVisit ?? 1);
  const minimum =
    minScenes *
    (b.submissionType === "STORY"
      ? Math.max(15, settings.rotationSeconds)
      : b.submissionType === "EVENT_BANNER"
        ? Math.max(10, settings.rotationSeconds)
        : settings.rotationSeconds);
  const share =
    b.enabled && total > 0 ? Math.round((b.durationSeconds / total) * 100) : 0;

  return (
    <li
      className={cn(
        "rounded-block bg-surface p-4 ring-1 ring-line sm:p-5",
        !b.enabled && "bg-surface-muted",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="w-4 text-center text-caption text-ink-subtle tabular-nums">
          {index + 1}
        </span>
        {b.submissionType ? (
          <TypeIcon kind={b.submissionType} size="sm" />
        ) : (
          <IconTile
            icon={Blocks}
            size="sm"
            className="bg-surface-muted text-ink-muted"
          />
        )}
        {/* 좁은 화면에서는 제목을 지키고 조작 버튼이 다음 줄로 내려간다. */}
        <h3
          className={cn(
            "min-w-24 flex-1 truncate text-subhead",
            b.enabled ? "text-ink" : "text-ink-muted",
          )}
        >
          {label}
        </h3>
        <span className="text-label font-bold text-ink tabular-nums">
          {share}%
        </span>
        <span className="flex basis-full items-center gap-1 sm:basis-auto">
        <label className="flex items-center gap-1.5 rounded-pill bg-surface-muted px-2.5 py-1 text-caption font-semibold text-ink">
          <input
            type="checkbox"
            className="accent-ink"
            checked={b.enabled}
            onChange={(e) => onPatch({ enabled: e.target.checked })}
          />
          표시
        </label>
        <span className="ml-auto flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            aria-label={`${index + 1}번 ${label} 위로`}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === count - 1}
            aria-label={`${index + 1}번 ${label} 아래로`}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${index + 1}번 ${label} 삭제`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </span>
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField label="블록 표시 시간(초)">
          {(control) => (
            <Input
              {...control}
              type="number"
              min={5}
              max={300}
              step={1}
              required
              className="h-10"
              value={b.durationSeconds || ""}
              onChange={(e) =>
                onPatch({ durationSeconds: Number(e.target.value) })
              }
            />
          )}
        </FormField>
        {b.source === "SUBMISSIONS" && (
          <FormField
            label="한 번에 보여 줄 건수"
            description={
              b.submissionType === "STORY"
                ? "두 건씩 한 화면에 표시"
                : "다음 차례에는 다음 게시물부터 표시"
            }
          >
            {(control) => (
              <Input
                {...control}
                type="number"
                required
                min={1}
                max={10}
                step={1}
                className="h-10"
                value={b.perVisit || ""}
                onChange={(e) => onPatch({ perVisit: Number(e.target.value) })}
              />
            )}
          </FormField>
        )}
      </div>
      {b.source === "SUBMISSIONS" && minimum > b.durationSeconds && (
        <p className="mt-2 text-caption text-warning-strong">
          읽을 시간을 위해 최대 {minScenes}화면에 최소 {minimum}초 필요. 실제
          재생은 설정 시간보다 길어질 수 있음
        </p>
      )}
      <div className="mt-3">
        <ScheduleFields
          schedule={b.schedule}
          onChange={(schedule) => onPatch({ schedule })}
        />
      </div>
    </li>
  );
}

/**
 * 한 바퀴 요약. 켜진 블록이 설정 시간만큼 차지하는 비율 막대와 순서, 그리고 지금
 * 게시물 수로 어림한 한 건의 재등장 간격. 누를 수 없는 정보라 상자 대신 막대와 글로 둔다.
 */
function CyclePanel({
  blocks,
  labelOf,
  total,
  device,
  counts,
}: {
  blocks: DraftBlock[];
  labelOf(block: DraftBlock): string;
  total: number;
  device: DisplayDevice | undefined;
  counts: Record<LineupSubmissionType, number> | null;
}) {
  const enabled = blocks.filter((b) => b.enabled && b.durationSeconds > 0);

  return (
    <aside
      aria-labelledby="cycle-title"
      className="flex min-w-0 flex-col gap-4 rounded-block bg-surface p-5 ring-1 ring-line lg:sticky lg:top-[calc(var(--layout-header-height)+1.5rem)]"
    >
      <div className="flex items-baseline gap-2">
        <h2 id="cycle-title" className="text-subhead text-ink">
          한 바퀴
        </h2>
        <span className="ml-auto text-label font-bold text-ink tabular-nums">
          {formatSeconds(total)}
        </span>
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "flex h-3 gap-[3px] overflow-hidden rounded-pill",
          enabled.length === 0 && "bg-surface-muted",
        )}
      >
        {enabled.map((b) => (
          <div
            key={b.key}
            className={barOf(b)}
            style={{ flexGrow: b.durationSeconds, flexBasis: 0 }}
          />
        ))}
      </div>

      {enabled.length === 0 ? (
        <p className="text-label text-ink-muted">켜진 블록 없음</p>
      ) : (
        <ol className="flex flex-col gap-1.5 text-label">
          {enabled.map((b) => (
            <li key={b.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn("size-2.5 shrink-0 rounded-[3px]", barOf(b))}
              />
              <span className="min-w-0 flex-1 truncate text-ink">
                {labelOf(b)}
              </span>
              <span className="shrink-0 text-ink-muted tabular-nums">
                {b.durationSeconds}초 ·{" "}
                {Math.round((b.durationSeconds / total) * 100)}%
              </span>
            </li>
          ))}
        </ol>
      )}

      {counts && (
        <div className="border-t border-surface-muted pt-4">
          <h3 className="text-label font-bold text-ink">
            한 건이 다시 나오는 간격
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-label">
            {(Object.keys(LINEUP_LABELS) as LineupSubmissionType[]).map(
              (type) => (
                <li key={type} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 shrink-0 rounded-[3px]",
                      KIND_STYLE[type].bar,
                    )}
                  />
                  <span className="text-ink">
                    {LINEUP_LABELS[type]} {counts[type]}건
                  </span>
                  <span className="ml-auto text-ink-muted">
                    {revisitText(type, counts[type], blocks, total)}
                  </span>
                </li>
              ),
            )}
          </ul>
          <p className="mt-2 text-caption text-ink-subtle">
            {device?.name} 현재 게시물 기준 · 위젯·영상 연장 제외
          </p>
        </div>
      )}

      {device && (
        <Button variant="outline" size="sm" asChild>
          <Link
            to={`${to.display(device.id, { preview: true })}&operator=1`}
            target="_blank"
            rel="noreferrer"
          >
            <MonitorPlay aria-hidden="true" />
            저장된 편성을 TV 화면으로 보기
          </Link>
        </Button>
      )}
    </aside>
  );
}

function revisitText(
  type: LineupSubmissionType,
  count: number,
  blocks: DraftBlock[],
  total: number,
): string {
  if (!count) return "게시물 없음";
  const visits = blocks
    .filter((b) => b.enabled && b.submissionType === type)
    .reduce((sum, b) => sum + Math.min(count, b.perVisit ?? 1), 0);
  if (visits === 0) return "편성에 없음";
  const seconds = total * Math.max(1, count / visits);
  return `약 ${Math.ceil(seconds / 60)}분마다`;
}

/** "95초 · 약 2분" */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  return `${seconds}초 · 약 ${Math.round(seconds / 60)}분`;
}

function ScreenSettings({
  settings,
  onChange,
}: {
  settings: Lineup["settings"];
  onChange(next: Lineup["settings"]): void;
}) {
  return (
    <details className="group rounded-block bg-surface ring-1 ring-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-block px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <span className="text-subhead text-ink">포스터 화면과 운영 시간</span>
        <span className="hidden text-caption text-ink-muted sm:inline">
          {settings.posterLayout === "WALL" ? "모아 보기" : "흐르는 띠"} ·{" "}
          {settings.rotationSeconds}초 · 화면 끔 {settings.quietHours.length}개
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="ml-auto text-ink-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-surface-muted px-5 pt-4 pb-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="포스터 화면">
            {(control) => (
              <select
                {...control}
                className={selectClass}
                value={settings.posterLayout}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    posterLayout: e.target.value as "WALL" | "STRIP",
                  })
                }
              >
                <option value="WALL">모아 보기 + 크게 보기</option>
                <option value="STRIP">흐르는 띠</option>
              </select>
            )}
          </FormField>
          <FormField label="포스터 최소 표시 시간(초)">
            {(control) => (
              <Input
                {...control}
                required
                type="number"
                min={5}
                max={60}
                className="h-10"
                value={settings.rotationSeconds || ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    rotationSeconds: Number(e.target.value),
                  })
                }
              />
            )}
          </FormField>
          <FormField label="편성 갱신 주기(초)">
            {(control) => (
              <Input
                {...control}
                required
                type="number"
                min={15}
                max={300}
                className="h-10"
                value={settings.refreshAfterSeconds || ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    refreshAfterSeconds: Number(e.target.value),
                  })
                }
              />
            )}
          </FormField>
        </div>
        <p className="mt-5 text-label font-bold text-ink">
          화면 끄는 시간 · 한국 시간
        </p>
        {settings.quietHours.map((range, index) => (
          <div key={index} className="mt-2 flex items-center gap-2">
            <Input
              type="time"
              required
              className="h-10"
              aria-label={`화면 끄기 ${index + 1} 시작`}
              value={range.start}
              onChange={(e) =>
                onChange({
                  ...settings,
                  quietHours: settings.quietHours.map((r, i) =>
                    i === index ? { ...r, start: e.target.value } : r,
                  ),
                })
              }
            />
            <span aria-hidden="true">~</span>
            <Input
              type="time"
              required
              className="h-10"
              aria-label={`화면 끄기 ${index + 1} 종료`}
              value={range.end}
              onChange={(e) =>
                onChange({
                  ...settings,
                  quietHours: settings.quietHours.map((r, i) =>
                    i === index ? { ...r, end: e.target.value } : r,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`화면 끄기 ${index + 1} 삭제`}
              onClick={() =>
                onChange({
                  ...settings,
                  quietHours: settings.quietHours.filter((_, i) => i !== index),
                })
              }
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          className="mt-2"
          type="button"
          variant="outline"
          size="sm"
          disabled={settings.quietHours.length >= 4}
          onClick={() =>
            onChange({
              ...settings,
              quietHours: [
                ...settings.quietHours,
                { start: "02:00", end: "06:00" },
              ],
            })
          }
        >
          <Plus aria-hidden="true" />
          화면 끄는 시간 추가
        </Button>
        <Note>
          위젯 비율과 시간대 고정은 TV 관리의 기존 설정에서 조절. 시간대 고정과
          진행 중 게임은 순환보다 우선
        </Note>
      </div>
    </details>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-caption text-ink-subtle">{children}</p>;
}

function ScheduleFields({
  schedule,
  onChange,
}: {
  schedule: BlockSchedule;
  onChange(next: BlockSchedule): void;
}) {
  return (
    <div className="space-y-3">
      <FormField label="나오는 시간">
        {(control) => (
          <select
            {...control}
            className={selectClass}
            value={schedule.type}
            onChange={(e) => {
              onChange(
                e.target.value === "ALWAYS"
                  ? { type: "ALWAYS" }
                  : e.target.value === "WINDOWS"
                    ? {
                        type: "WINDOWS",
                        windows: [
                          {
                            days: [1, 2, 3, 4, 5, 6, 7],
                            start: "09:00",
                            end: "18:00",
                          },
                        ],
                      }
                    : { type: "DATE_RANGE", from: "", to: "" },
              );
            }}
          >
            <option value="ALWAYS">항상</option>
            <option value="WINDOWS">요일·시간대</option>
            <option value="DATE_RANGE">기간</option>
          </select>
        )}
      </FormField>
      {schedule.type === "WINDOWS" && (
        <>
          {schedule.windows.map((w, index) => {
            const patch = (update: Partial<typeof w>) =>
              onChange({
                ...schedule,
                windows: schedule.windows.map((old, i) =>
                  i === index ? { ...old, ...update } : old,
                ),
              });
            return (
              <div
                key={index}
                className="space-y-2 rounded-tile bg-surface-muted p-3"
              >
                <div className="flex flex-wrap gap-3">
                  {days.map((day, d) => (
                    <label
                      key={day}
                      className="flex items-center gap-1 text-caption"
                    >
                      <input
                        type="checkbox"
                        className="accent-ink"
                        checked={w.days.includes(d + 1)}
                        onChange={(e) =>
                          patch({
                            days: e.target.checked
                              ? [...w.days, d + 1].sort()
                              : w.days.filter((v) => v !== d + 1),
                          })
                        }
                      />
                      {day}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`시간대 ${index + 1} 시작`}
                    required
                    type="time"
                    className="h-10"
                    value={w.start}
                    onChange={(e) => patch({ start: e.target.value })}
                  />
                  <span aria-hidden="true">~</span>
                  <Input
                    aria-label={`시간대 ${index + 1} 종료`}
                    required
                    type="time"
                    className="h-10"
                    value={w.end}
                    onChange={(e) => patch({ end: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`시간대 ${index + 1} 삭제`}
                    disabled={schedule.windows.length === 1}
                    onClick={() =>
                      onChange({
                        ...schedule,
                        windows: schedule.windows.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={schedule.windows.length >= 8}
            onClick={() =>
              onChange({
                ...schedule,
                windows: [
                  ...schedule.windows,
                  { days: [1, 2, 3, 4, 5, 6, 7], start: "18:00", end: "21:00" },
                ],
              })
            }
          >
            <Plus aria-hidden="true" />
            시간대 추가
          </Button>
          <p className="text-caption text-ink-subtle">
            한국 시간 기준. 자정을 넘는 시간대는 시작 요일에 속함
          </p>
        </>
      )}
      {schedule.type === "DATE_RANGE" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["from", "to"] as const).map((key) => (
            <FormField
              key={key}
              label={key === "from" ? "시작(한국 시간)" : "종료(한국 시간)"}
            >
              {(control) => (
                <Input
                  {...control}
                  type="datetime-local"
                  required
                  className="h-10"
                  value={
                    schedule[key]
                      ? new Date(Date.parse(schedule[key]) + 9 * 3600000)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    onChange({
                      ...schedule,
                      [key]: e.target.value ? `${e.target.value}:00+09:00` : "",
                    })
                  }
                />
              )}
            </FormField>
          ))}
        </div>
      )}
    </div>
  );
}
