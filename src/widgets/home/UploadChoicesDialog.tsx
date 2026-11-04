import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { UploadChoicesCompact } from "./UploadChoices";

export function UploadChoicesDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>무엇을 올릴까요?</DialogTitle>
          <DialogDescription>올릴 콘텐츠 종류를 선택하세요.</DialogDescription>
        </DialogHeader>
        <UploadChoicesCompact />
      </DialogContent>
    </Dialog>
  );
}
