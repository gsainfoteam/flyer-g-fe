import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { StoryScene, SceneFrame } from "@/entities/scene";
import type { StorySceneItem } from "@/entities/scene";
import { useSignageConfig } from "@/entities/submission/api/queries";
import {
  STORY_BODY_LIMITS,
  checkStory,
} from "@/entities/submission/model/content-rules";
import {
  STORY_TAGS,
  STORY_TAG_LABELS,
} from "@/entities/submission/model/types";
import type { StoryTag } from "@/entities/submission/model/types";
import {
  useRecentStories,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { useCreateContent } from "@/features/submissions/create/model/use-create-content";
import { ChoicePills, FormField, PillField } from "@/shared/components";
import { toUserMessage } from "@/shared/api/error";
import { to } from "@/shared/config/routes";
import { seoulDayDiff } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { UploadFrame } from "@/widgets/upload/UploadFrame";

/**
 * 소식 제보 쓰기 (기획 2-1, 배포 ④).
 *
 * 말머리와 140자 본문만 받는다. TV에는 이름 없이 나가고, 승인되면 그때부터 정해진
 * 날 수만큼 모든 TV에 걸린다. 반려되면 고쳐 낼 수 없어 새로 써야 하므로, 쓰기 전에
 * 무엇이 반려되는지 먼저 알린다. 포스터·이벤트 배너와 같은 틀(`UploadFrame`)이고,
 * 미리보기는 실제 TV 장면(카드 두 장)이다.
 */
const TAG_OPTIONS = STORY_TAGS.map((tag) => ({
  value: tag,
  label: STORY_TAG_LABELS[tag],
}));

export function NewStoryPage() {
  const navigate = useNavigate();
  const config = useSignageConfig();
  const create = useCreateContent();
  const recent = useRecentStories(1);
  const mine = useSubmissionViews({ scope: "me", types: ["STORY"], limit: 20 });

  const [tag, setTag] = useState<StoryTag | null>(null);
  const [body, setBody] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const errors: Record<string, string> = {
    ...(tag === null ? { "story.tag": "말머리를 고르세요." } : {}),
    ...checkStory({ tag: tag ?? "", body }),
    ...serverErrors,
  };
  const errorOf = (key: string) => (showErrors ? (errors[key] ?? null) : null);

  const displayDays = config.data?.storyDisplayDays ?? 2;
  const dailyLimit = config.data?.dailySubmissionLimits.STORY;
  // 서울 하루에 만든 제보를 센다. 취소·반려까지 서버가 센다.
  const usedToday = mine.data
    ? mine.data.items.filter(
        (item) => seoulDayDiff(item.createdAt, mine.data.serverTime) === 0,
      ).length
    : null;
  const remaining =
    dailyLimit !== undefined && usedToday !== null
      ? Math.max(0, dailyLimit - usedToday)
      : null;

  const edit = () => {
    setServerErrors({});
    create.markInputChanged();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0 || tag === null) return;
    create.mutate(
      { type: "STORY", story: { tag, body: body.trim() } },
      {
        onSuccess: (created) => {
          toast.success("제보 접수 완료", {
            description: "승인 후 TV에 작성자 이름 없이 게시됩니다.",
          });
          void navigate(to.submissionDetail(created.id), { replace: true });
        },
        onError: (error) => {
          if (error.kind === "canceled") return;
          if (error.fields) setServerErrors(error.fields);
          toast.error("제보를 보내지 못했습니다", {
            description: toUserMessage(error),
          });
        },
      },
    );
  };

  const other = recent.data?.[0];
  const previewItems: StorySceneItem[] = [
    {
      tag: tag ?? "NEWS",
      body: body.trim() || "본문 입력 후 미리보기",
      storyNumber: null,
      highlighted: true,
    },
    other
      ? { tag: other.tag, body: other.body, storyNumber: other.storyNumber }
      : {
          tag: "NEWS",
          body: "다른 제보와 함께 두 장씩 표시",
          storyNumber: null,
          placeholder: true,
        },
  ];

  return (
    <UploadFrame
      kind="STORY"
      back={{ to: to.home(), label: "홈" }}
      title="소식 제보 올리기"
      description={`작성자 이름 없이 승인 후 ${displayDays}일 동안 게시`}
      onSubmit={submit}
      meta={remaining !== null && `오늘 남은 제보 ${remaining}건`}
      submit={
        <Button
          type="submit"
          disabled={create.isPending || remaining === 0}
        >
          {create.isPending && <Spinner aria-hidden="true" />}
          심사 요청
        </Button>
      }
      preview={
        <SceneFrame>
          <StoryScene
            items={previewItems}
            qrValue={`${window.location.origin}${to.newStory()}`}
          />
        </SceneFrame>
      }
      previewNote="승인 시 번호 부여 · 테두리로 표시된 카드가 내 제보"
    >
      <PillField label="말머리" error={errorOf("story.tag")}>
        <ChoicePills
          label="말머리"
          options={TAG_OPTIONS}
          value={tag}
          invalid={Boolean(errorOf("story.tag"))}
          onChange={(next) => {
            setTag(next);
            edit();
          }}
        />
      </PillField>

      <FormField
        label="본문"
        required
        error={errorOf("story.body")}
        description={`${body.trim().length} / ${STORY_BODY_LIMITS.max}자 · ${STORY_BODY_LIMITS.min}자 이상`}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={6}
            maxLength={STORY_BODY_LIMITS.max + 20}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              edit();
            }}
            placeholder="예: B동 3층 세탁실 건조기 2번이 고쳐졌어요. 관리실에 연락해 주신 분 고맙습니다!"
            className="text-body"
          />
        )}
      </FormField>

      <ul className="list-disc space-y-1 pl-5 text-label text-ink-muted">
        <li>악용 방지를 위해 시스템 운영자만 작성자를 확인할 수 있습니다.</li>
        <li>특정인을 식별할 수 있는 내용은 반려됩니다.</li>
        <li>반려된 제보는 수정·재신청할 수 없습니다. 새 제보로 작성해야 합니다.</li>
      </ul>

    </UploadFrame>
  );
}
