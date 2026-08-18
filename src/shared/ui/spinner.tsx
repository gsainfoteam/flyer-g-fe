import { cn } from "@/shared/lib/utils"
import { Loader2Icon } from "lucide-react"

// shadcn 생성본에서 수정한 부분: 접근성 이름을 한국어로 바꿨다.

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="불러오는 중" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
