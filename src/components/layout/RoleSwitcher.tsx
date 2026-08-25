import { useAuth } from "@/features/auth/model/auth-context";
import { getRoleLabel } from "@/features/auth/model/types";
import type { Role } from "@/features/auth/model/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

/**
 * 개발 전용 역할 전환.
 *
 * mock 세션일 때만 그린다. production 빌드에서는 mock 인증 자체가 선택되지 않아
 * `switchRole`이 null이므로 이 컴포넌트는 아무것도 그리지 않는다.
 * (`readAppEnv()`가 production + mock 조합을 시작 시점에 막는다.)
 */
export function RoleSwitcher() {
  const { state, switchRole, availableRoles } = useAuth();

  if (!switchRole || availableRoles.length === 0) return null;
  if (state.status !== "authenticated") return null;

  const current: Role = availableRoles.includes("SUPER_ADMIN")
    ? state.user.roles.includes("SUPER_ADMIN")
      ? "SUPER_ADMIN"
      : state.user.roles.includes("REVIEWER")
        ? "REVIEWER"
        : "SUBMITTER"
    : "SUBMITTER";

  return (
    <Select value={current} onValueChange={(role) => switchRole(role as Role)}>
      <SelectTrigger
        size="sm"
        aria-label="개발용 역할 전환"
        className="hidden w-[132px] md:flex"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableRoles.map((role) => (
          <SelectItem key={role} value={role}>
            {getRoleLabel(role)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
