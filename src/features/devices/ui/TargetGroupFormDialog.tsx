import { useState } from "react";
import { toast } from "sonner";
import { TARGET_GROUP_LIMITS } from "@/entities/device/model/types";
import type {
  TargetGroup,
  UpdateTargetGroupInput,
} from "@/entities/device/model/types";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { ConfirmActionDialog, FormField } from "@/shared/components";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { validateGroupName } from "../model/target-group-form";
import {
  useCreateTargetGroup,
  useUpdateTargetGroup,
} from "../model/use-target-group-mutations";

/**
 * 위치 그룹 추가·수정. 수정에서는 숨길 수 있다.
 *
 * 숨긴 그룹은 새 기기·신청에서 고를 수 없지만, 이미 연결된 TV와 게시물은 그대로다.
 * 쓰는 곳이 있어 지울 수 없는 그룹을 정리할 때 쓴다.
 */
interface TargetGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 없으면 추가, 있으면 그 그룹을 수정한다. */
  group: TargetGroup | null;
  /** 이름 중복을 미리 막는 데 쓴다. 숨긴 그룹도 포함한다. */
  groups: readonly TargetGroup[];
}

/** 이름을 고치지 않았을 때 확인 버튼이 창을 닫지 않게 던진다. */
class IncompleteForm extends Error {}

export function TargetGroupFormDialog({
  open,
  onOpenChange,
  group,
  groups,
}: TargetGroupFormDialogProps) {
  const [name, setName] = useState(group?.name ?? "");
  const [isHidden, setIsHidden] = useState(group?.isHidden ?? false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreateTargetGroup();
  const update = useUpdateTargetGroup();

  const nameError = validateGroupName(name, groups, group?.id) ?? serverError;

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={group ? `${group.name} 수정` : "위치 그룹 추가"}
      description={
        group ? undefined : "만든 뒤 기기 수정에서 TV를 이 그룹에 넣어요."
      }
      confirmLabel={group ? "저장" : "추가"}
      onConfirm={async () => {
        setShowErrors(true);
        if (nameError) throw new IncompleteForm();
        const trimmed = name.trim();
        if (!group) {
          await create.mutateAsync({ name: trimmed });
          toast.success(`${trimmed} 그룹을 추가했어요`);
          return;
        }
        const input: UpdateTargetGroupInput = {
          ...(trimmed !== group.name ? { name: trimmed } : {}),
          ...(isHidden !== group.isHidden ? { isHidden } : {}),
        };
        if (Object.keys(input).length === 0) return;
        await update.mutateAsync({ id: group.id, input });
        toast.success("그룹을 저장했어요");
      }}
      onError={(error) => {
        if (error instanceof IncompleteForm) return;
        const fieldError = isApiError(error) ? error.fields?.name : undefined;
        if (fieldError) {
          // 다른 운영자가 방금 같은 이름을 만든 경우다. 칸에 붙이고 창은 열어 둔다.
          setServerError(fieldError);
          return;
        }
        toast.error(group ? "저장하지 못했어요" : "추가하지 못했어요", {
          description: isApiError(error)
            ? toUserMessage(error)
            : "잠시 후 다시 시도해 주세요.",
        });
      }}
    >
      <div className="space-y-4">
        <FormField
          label="그룹 이름"
          required
          error={showErrors ? nameError : null}
        >
          {(control) => (
            <Input
              {...control}
              value={name}
              maxLength={TARGET_GROUP_LIMITS.nameMaxLength * 2}
              placeholder="예: 학사기숙사 A동"
              onChange={(event) => {
                setName(event.target.value);
                setServerError(null);
              }}
            />
          )}
        </FormField>

        {group && (
          <FormField
            label="선택 목록"
            description="숨기면 새 기기·신청에서 고를 수 없어요. 이미 연결된 TV와 게시물은 그대로예요."
          >
            {(control) => (
              <Select
                value={isHidden ? "hidden" : "shown"}
                onValueChange={(value) => {
                  if (value) setIsHidden(value === "hidden");
                }}
              >
                <SelectTrigger id={control.id} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shown">표시</SelectItem>
                  <SelectItem value="hidden">숨김</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
      </div>
    </ConfirmActionDialog>
  );
}
