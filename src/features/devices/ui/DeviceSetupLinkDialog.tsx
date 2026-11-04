import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { setupLinkOf } from "../model/setup-link";
import type { SetupLinkResult } from "../model/setup-link";

/**
 * TV 설정 링크 (`API-CHANGES-BACKEND.md` 8절 "TV 설정 흐름").
 *
 * 등록·재발급 응답의 토큰으로 `https://<프론트>/display/{id}#token={token}`을 만든다.
 * TV에서 이 링크를 한 번 열면 토큰이 저장되고 주소에서 지워진다. `#` 뒤는 서버로
 * 가지 않는다.
 *
 * 토큰은 서버에 해시만 있어 다시 볼 수 없다. 창을 닫으면 링크도 사라지므로, 닫기
 * 전에 복사하라고 알린다. 잃어버리면 재발급한다.
 */
export function DeviceSetupLinkDialog({
  result,
  onClose,
}: {
  result: SetupLinkResult | null;
  onClose: () => void;
}) {
  const link = result ? setupLinkOf(result.deviceId, result.token) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("설정 링크 복사 완료");
    } catch {
      toast.error("복사하지 못했습니다", {
        description: "링크를 직접 선택해 복사하세요.",
      });
    }
  };

  return (
    <Dialog
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {result?.reason === "rotated"
              ? `${result.deviceName} 토큰 재발급 완료`
              : `${result?.deviceName ?? ""} 기기 등록 완료`}
          </DialogTitle>
          <DialogDescription>
            TV에서 아래 링크를 열면 연결됩니다.
            {result?.reason === "rotated" &&
              " 이전 링크로 연결된 TV의 연결이 해제되었습니다."}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <AlertDescription>
            이 링크는 한 번만 표시됩니다. 창을 닫기 전에 복사하세요. 분실하면 토큰을 재발급해야 합니다.
          </AlertDescription>
        </Alert>

        <Input
          readOnly
          value={link}
          aria-label="TV 설정 링크"
          onFocus={(event) => event.currentTarget.select()}
        />

        <DialogFooter>
          <Button variant="outline" className="sm:mr-auto" asChild>
            <a href={link} target="_blank" rel="noreferrer noopener">
              <ExternalLink aria-hidden="true" />이 브라우저에서 열기
            </a>
          </Button>
          <Button variant="secondary" onClick={() => void copy()}>
            <Copy aria-hidden="true" />
            링크 복사
          </Button>
          <Button onClick={onClose}>완료</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
