import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn 컴포넌트와 앱 전체가 공유하는 단일 class 병합 utility. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
