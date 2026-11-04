import { useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DisplayDevice, TargetGroup } from "@/entities/device/model/types";
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
import { isApiError, toUserMessage } from "@/shared/api/error";
import { FormField, PageState } from "@/shared/components";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  useLineup,
  useLineupPreview,
  useLineupPrograms,
  useSaveLineup,
} from "../model/use-lineup";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-body";
const days = ["월", "화", "수", "목", "금", "토", "일"];
type DraftBlock = LineupInput["blocks"][number] & { key: string };

export function LineupDialog({
  group,
  devices,
  onClose,
}: {
  group: TargetGroup;
  devices: DisplayDevice[];
  onClose(): void;
}) {
  const query = useLineup(group.id);
  const programs = useLineupPrograms();
  const [reload, setReload] = useState(0);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{group.name} 편성</DialogTitle>
          <DialogDescription>
            이 그룹을 편성 그룹으로 쓰는 TV에 적용됩니다. 저장 후 다음 편성 갱신
            때 반영됩니다.
          </DialogDescription>
        </DialogHeader>
        {query.error &&
        isApiError(query.error) &&
        query.error.status === 404 ? (
          <p role="alert" className="text-body text-ink-muted">
            편성 API를 사용할 수 없습니다. 백엔드 편성 API 배포와 그룹 존재
            여부를 확인하세요.
          </p>
        ) : (
          <PageState
            isLoading={query.isPending}
            error={query.error}
            onRetry={() => void query.refetch()}
          >
            {query.data && (
              <LineupForm
                key={`${group.id}:${reload}`}
                lineup={query.data}
                devices={devices}
                programs={programs.data ?? []}
                programsError={programs.error}
                onReload={async () => {
                  const result = await query.refetch();
                  if (result.isSuccess) setReload((n) => n + 1);
                }}
                onClose={onClose}
              />
            )}
          </PageState>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LineupForm({
  lineup,
  devices,
  programs,
  programsError,
  onReload,
  onClose,
}: {
  lineup: Lineup;
  devices: DisplayDevice[];
  programs: (LineupProgram & { id: string })[];
  programsError: unknown;
  onReload(): Promise<void>;
  onClose(): void;
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
  const assigned = devices.filter((d) => d.programGroupId === lineup.groupId);
  const preview = useLineupPreview(assigned[0]?.id);
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
  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
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
          toast.success("편성 저장 완료");
          onClose();
        } catch (cause) {
          const collision = isApiError(cause) && cause.status === 409;
          setConflict(collision);
          setError(
            collision
              ? "다른 운영자가 편성을 변경했습니다. 현재 입력을 확인한 뒤 최신 편성을 다시 불러오세요."
              : isApiError(cause)
                ? [
                    toUserMessage(cause),
                    ...Object.values(cause.fields ?? {}),
                  ].join(" · ")
                : "편성을 저장하지 못했습니다.",
          );
        }
      }}
    >
      <fieldset disabled={save.isPending} className="min-w-0 space-y-5">
        <div className="rounded-lg bg-surface-muted p-4 text-caption text-ink-muted">
          <p className="font-bold text-ink">
            적용 TV {assigned.length}대
            {assigned.length
              ? ` · ${assigned.map((d) => d.name).join(", ")}`
              : " · 연결된 TV 없음"}
          </p>
          <p className="mt-1">
            기기별 예외 설정이 있으면 그 값이 우선합니다. 기존 위젯은 TV별
            비율에 따라 편성 블록 사이에 표시되며, 시간대 고정과 진행 중 게임은
            순환에 우선합니다.
          </p>
          {assigned[0] && (
            <Link
              className="mt-2 inline-block underline underline-offset-4"
              to={`/display/${encodeURIComponent(assigned[0].id)}?preview=1&operator=1`}
            >
              저장된 편성 미리보기 · {assigned[0].name}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-subhead font-bold">표시 순서</h2>
          <p className="text-label tabular-nums">
            설정 합계 {total}초{" "}
            <span className="text-ink-subtle">· 위젯 제외</span>
          </p>
        </div>
        <p className="text-caption text-ink-muted">
          비중은 켜진 블록의 설정 시간 기준입니다. 빈 블록·시간대 밖 블록은
          건너뜁니다. 내용이 많아지면 비중 대신 각 게시물의 재등장 간격이
          길어집니다.
        </p>
        {preview.data && (
          <div
            className="grid gap-2 sm:grid-cols-3"
            aria-label="예상 재노출 간격"
          >
            {(Object.keys(LINEUP_LABELS) as LineupSubmissionType[]).map(
              (type) => {
                const count =
                  type === "POSTER"
                    ? preview.data!.items.length
                    : type === "EVENT_BANNER"
                      ? preview.data!.eventBanners.length
                      : preview.data!.stories.length;
                const visits = blocks
                  .filter((b) => b.enabled && b.submissionType === type)
                  .reduce(
                    (sum, b) => sum + Math.min(count, b.perVisit ?? 1),
                    0,
                  );
                const seconds =
                  visits > 0 ? total * Math.max(1, count / visits) : null;
                return (
                  <div
                    key={type}
                    className="rounded-md bg-surface-muted p-3 text-caption"
                  >
                    <p className="font-bold">
                      {LINEUP_LABELS[type]} {count}건
                    </p>
                    <p className="mt-1 text-ink-muted">
                      {!count
                        ? "현재 게시물 없음"
                        : seconds === null
                          ? "편성에 없음"
                          : `한 건이 평균 약 ${Math.ceil(seconds / 60)}분마다`}
                    </p>
                  </div>
                );
              },
            )}
            <p className="text-caption text-ink-subtle sm:col-span-3">
              {assigned[0]?.name}의 현재 게시물 기준. 모든 블록이 활성인 경우의
              설정 시간으로 계산하며 위젯·영상 연장 시간은 제외합니다.
            </p>
          </div>
        )}
        <ol className="space-y-3">
          {blocks.map((b, index) => {
            const label = labelOf(b);
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
            return (
              <li key={b.key} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-caption tabular-nums text-ink-subtle">
                    {index + 1}
                  </span>
                  <h3 className="min-w-0 flex-1 text-label font-bold">
                    {label}
                  </h3>
                  <span className="text-caption tabular-nums">
                    {b.enabled && total > 0
                      ? Math.round((b.durationSeconds / total) * 100)
                      : 0}
                    %
                  </span>
                  <label className="flex items-center gap-1.5 text-caption">
                    <input
                      type="checkbox"
                      checked={b.enabled}
                      onChange={(e) =>
                        patch(b.key, { enabled: e.target.checked })
                      }
                    />
                    표시
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    aria-label={`${index + 1}번 ${label} 위로`}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === blocks.length - 1}
                    aria-label={`${index + 1}번 ${label} 아래로`}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${index + 1}번 ${label} 삭제`}
                    onClick={() =>
                      setBlocks((list) =>
                        list.filter((item) => item.key !== b.key),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <FormField label="블록 표시 시간(초)">
                    {(control) => (
                      <Input
                        {...control}
                        type="number"
                        min={5}
                        max={300}
                        step={1}
                        required
                        value={b.durationSeconds || ""}
                        onChange={(e) =>
                          patch(b.key, {
                            durationSeconds: Number(e.target.value),
                          })
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
                          value={b.perVisit || ""}
                          onChange={(e) =>
                            patch(b.key, { perVisit: Number(e.target.value) })
                          }
                        />
                      )}
                    </FormField>
                  )}
                </div>
                {b.source === "SUBMISSIONS" && minimum > b.durationSeconds && (
                  <p className="mt-2 text-caption text-warning-strong">
                    읽을 시간을 위해 최대 {minScenes}화면에 최소 {minimum}초가
                    필요합니다. 실제 재생 시간이 설정 시간보다 길어질 수
                    있습니다.
                  </p>
                )}
                <div className="mt-3">
                  <ScheduleFields
                    schedule={b.schedule}
                    onChange={(schedule) => patch(b.key, { schedule })}
                  />
                </div>
              </li>
            );
          })}
        </ol>
        {blocks.length === 0 && (
          <p className="py-6 text-center text-ink-muted">
            편성이 비어 있습니다. TV에 대기 화면이 표시됩니다.
          </p>
        )}
        <div className="flex items-center gap-2">
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
            <Plus />
            추가
          </Button>
        </div>
        {!!programsError && (
          <p className="text-caption text-ink-muted">
            운영 콘텐츠 목록을 불러오지 못했습니다. 기존 운영 콘텐츠 블록은
            유지됩니다.
          </p>
        )}
        <details className="rounded-lg border border-line p-4">
          <summary className="cursor-pointer text-label font-bold">
            포스터 화면과 운영 시간
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <FormField label="포스터 화면">
              {(control) => (
                <select
                  {...control}
                  className={selectClass}
                  value={settings.posterLayout}
                  onChange={(e) =>
                    setSettings({
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
                  value={settings.rotationSeconds || ""}
                  onChange={(e) =>
                    setSettings({
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
                  value={settings.refreshAfterSeconds || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      refreshAfterSeconds: Number(e.target.value),
                    })
                  }
                />
              )}
            </FormField>
          </div>
          <p className="mt-4 text-label font-bold">
            화면 끄는 시간 · 한국 시간
          </p>
          {settings.quietHours.map((range, index) => (
            <div key={index} className="mt-2 flex items-center gap-2">
              <Input
                type="time"
                required
                aria-label={`화면 끄기 ${index + 1} 시작`}
                value={range.start}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quietHours: settings.quietHours.map((r, i) =>
                      i === index ? { ...r, start: e.target.value } : r,
                    ),
                  })
                }
              />
              <span>~</span>
              <Input
                type="time"
                required
                aria-label={`화면 끄기 ${index + 1} 종료`}
                value={range.end}
                onChange={(e) =>
                  setSettings({
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
                aria-label={`화면 끄기 ${index + 1} 삭제`}
                onClick={() =>
                  setSettings({
                    ...settings,
                    quietHours: settings.quietHours.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                삭제
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
              setSettings({
                ...settings,
                quietHours: [
                  ...settings.quietHours,
                  { start: "02:00", end: "06:00" },
                ],
              })
            }
          >
            화면 끄는 시간 추가
          </Button>
        </details>
      </fieldset>
      <p className="text-caption text-ink-subtle">
        영상 길이와 읽기 최소 시간에 따라 실제 비중이 달라질 수 있습니다. 위젯
        비율과 시간대 고정은 TV 관리의 기존 설정에서 조절합니다.
      </p>
      {error && (
        <p role="alert" className="text-body text-danger-strong">
          {error}
        </p>
      )}
      {conflict && (
        <Button type="button" variant="outline" onClick={() => void onReload()}>
          현재 입력을 버리고 최신 편성 불러오기
        </Button>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={save.isPending}
        >
          닫기
        </Button>
        <Button type="submit" disabled={save.isPending || conflict}>
          {save.isPending ? "저장 중" : "편성 저장"}
        </Button>
      </div>
    </form>
  );
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
                className="space-y-2 rounded-md bg-surface-muted p-3"
              >
                <div className="flex flex-wrap gap-3">
                  {days.map((day, d) => (
                    <label
                      key={day}
                      className="flex items-center gap-1 text-caption"
                    >
                      <input
                        type="checkbox"
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
                <div className="flex gap-2">
                  <Input
                    aria-label={`시간대 ${index + 1} 시작`}
                    required
                    type="time"
                    value={w.start}
                    onChange={(e) => patch({ start: e.target.value })}
                  />
                  <span>~</span>
                  <Input
                    aria-label={`시간대 ${index + 1} 종료`}
                    required
                    type="time"
                    value={w.end}
                    onChange={(e) => patch({ end: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={schedule.windows.length === 1}
                    onClick={() =>
                      onChange({
                        ...schedule,
                        windows: schedule.windows.filter((_, i) => i !== index),
                      })
                    }
                  >
                    삭제
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
            시간대 추가
          </Button>
          <p className="text-caption text-ink-subtle">
            한국 시간 기준. 자정을 넘는 시간대는 시작 요일에 속합니다.
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
