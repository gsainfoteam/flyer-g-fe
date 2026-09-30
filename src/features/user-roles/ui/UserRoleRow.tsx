import { useState } from "react";
import { toast } from "sonner";
import { ROLES, getRoleLabel, roleLevelOf } from "@/entities/user";
import type { AdminUser, Role } from "@/entities/user";
import { toUserMessage } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { ConfirmActionDialog } from "@/shared/components";
import { formatTimeAgo } from "@/shared/lib/datetime";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useChangeUserRole } from "../model/use-change-user-role";

const SELF_HINT = "본인 역할은 다른 운영자가 바꿔야 해요";

/**
 * 표의 한 줄. 사용자 한 명과 역할 선택.
 *
 * 역할은 셋 중 하나를 고른다. 시스템 운영자로 올리기 전에는 한 번 묻는다 — 받은 사람은
 * 다른 사람의 역할까지 바꿀 수 있다. 본인 행은 바꿀 수 없다. 서버도 본인 회수를 403으로
 * 막는다.
 */
interface UserRoleRowProps {
  user: AdminUser;
  isSelf: boolean;
  /** 목록을 만든 서버 시각. 마지막 로그인을 센다. */
  serverNow: Date;
}

export function UserRoleRow({ user, isSelf, serverNow }: UserRoleRowProps) {
  const change = useChangeUserRole();
  const [confirming, setConfirming] = useState(false);
  const level = roleLevelOf(user.grantedRoles);
  // 요청 중에는 고른 값을 보여 준다. 응답 전에 이전 값으로 튀지 않게.
  const shown = change.isPending ? change.variables.target : level;

  const run = (target: Role) =>
    change.mutateAsync({ user, target }).then(() => {
      toast.success(`${user.name}님을 ${getRoleLabel(target)}로 바꿨어요`);
    });

  const handleSelect = (value: string) => {
    const target = value as Role;
    if (target === level) return;
    if (target === "SUPER_ADMIN") {
      setConfirming(true);
      return;
    }
    run(target).catch((error: ApiError) => notifyFailure(error));
  };

  const cell = "px-4 py-2.5 first:pl-5 last:pr-5";
  const selfHintId = `${user.id}-self-hint`;

  return (
    <tr className="text-label text-ink">
      <td className={cell}>
        <p className="truncate font-bold">
          {user.name}
          {isSelf && (
            <span className="ml-1.5 font-normal text-ink-muted">(나)</span>
          )}
        </p>
        {/* 좁은 화면에서는 이메일 칸이 빠진다. 동명이인을 가릴 수 있게 이름 아래에 둔다. */}
        <p className="truncate text-caption text-ink-muted md:hidden">
          {user.email}
        </p>
      </td>
      <td className={`${cell} hidden truncate text-ink-muted md:table-cell`}>
        {user.email}
      </td>
      <td
        className={`${cell} hidden text-ink-muted tabular-nums lg:table-cell`}
      >
        {user.studentId ?? "—"}
      </td>
      <td className={`${cell} hidden text-ink-muted lg:table-cell`}>
        {formatTimeAgo(user.lastLoginAt, serverNow)}
      </td>
      <td className={cell}>
        <Select
          value={shown}
          onValueChange={handleSelect}
          disabled={isSelf || change.isPending}
        >
          <SelectTrigger
            size="sm"
            aria-label={`${user.name} 역할`}
            aria-describedby={isSelf ? selfHintId : undefined}
            title={isSelf ? SELF_HINT : undefined}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {getRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelf && (
          <span id={selfHintId} className="sr-only">
            {SELF_HINT}
          </span>
        )}

        <ConfirmActionDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={`${user.name}님을 시스템 운영자로 바꿀까요?`}
          description="시스템 운영자는 기기와 위치 그룹을 관리하고, 다른 사람의 역할도 바꿀 수 있어요."
          confirmLabel="시스템 운영자로 바꾸기"
          onConfirm={() => run("SUPER_ADMIN")}
          onError={(error) => {
            const apiError = error as ApiError;
            // 권한이 사라졌거나 사람이 없으면 다시 눌러도 같다. 대화상자를 닫는다.
            if (apiError.status === 403 || apiError.status === 404) {
              setConfirming(false);
            }
            notifyFailure(apiError);
          }}
        />
      </td>
    </tr>
  );
}

/**
 * 실패 안내. 403이면 세션을 다시 불러오는 일은 `SessionSync`가 한다. 목록은
 * `useChangeUserRole`이 늘 다시 받는다.
 */
function notifyFailure(error: ApiError) {
  if (error.status === 404) {
    toast.error("사용자를 찾지 못했어요", {
      description: "목록을 새로 불러왔어요.",
    });
    return;
  }
  toast.error("역할을 바꾸지 못했어요", {
    description: toUserMessage(error),
  });
}
