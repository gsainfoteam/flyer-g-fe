import { IconTile } from "@/shared/components/IconTile";
import type { IconTileSize } from "@/shared/components/IconTile";
import { KIND_INFO } from "../model/kind";
import type { SubmissionKind } from "../model/kind";
import { KIND_STYLE } from "./kind-style";

/**
 * 종류 아이콘 사각형. 목록 맨 앞에서 무슨 컨텐츠인지 먼저 알린다.
 *
 * 옆에 종류 이름이 없으면 `labelled`로 화면 읽기 프로그램에 이름을 알린다.
 */
export function TypeIcon({
  kind,
  size = "md",
  labelled = false,
  className,
}: {
  kind: SubmissionKind;
  size?: IconTileSize;
  labelled?: boolean;
  className?: string;
}) {
  const style = KIND_STYLE[kind];
  return (
    <IconTile
      icon={style.icon}
      size={size}
      className={`${style.soft} ${className ?? ""}`}
      label={labelled ? KIND_INFO[kind].name : undefined}
    />
  );
}
