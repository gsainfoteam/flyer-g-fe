import {
  TARGET_GROUP_LIMITS,
  findSameNameGroup,
} from "@/entities/device/model/types";
import type { TargetGroup } from "@/entities/device/model/types";
import { serverTextLength } from "@/shared/lib/text-length";

/**
 * 그룹 이름을 서버 규칙으로 미리 검사한다(`target-group-input.dto.ts`). 서버가 최종
 * 판단하고, 다른 운영자가 방금 만든 이름과 겹치면 422 `fields.name`이 온다.
 *
 * @param exceptId 이름을 바꾸는 그룹. 자기 이름과는 겹쳐도 된다.
 */
export function validateGroupName(
  name: string,
  groups: readonly TargetGroup[],
  exceptId?: string,
): string | null {
  const trimmed = name.trim();
  const max = TARGET_GROUP_LIMITS.nameMaxLength;
  if (trimmed.length === 0) return "그룹 이름을 입력해 주세요.";
  if (serverTextLength(trimmed) > max)
    return `그룹 이름은 ${max}자까지 쓸 수 있어요.`;
  const same = findSameNameGroup(groups, trimmed, exceptId);
  if (same) {
    return same.isHidden
      ? "같은 이름의 숨긴 그룹이 있어요. 그 그룹을 다시 표시해 주세요."
      : "같은 이름의 그룹이 이미 있어요.";
  }
  return null;
}
