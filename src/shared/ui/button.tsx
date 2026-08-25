import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

/*
 * shadcn 생성본에서 수정한 부분: variant와 size를 제품 디자인에 맞췄다.
 *
 * 단색 체계라 버튼은 두 가지뿐이다 — 주 작업은 강조색 채움, 나머지는 중성 채움.
 * destructive도 별도의 빨강을 쓰지 않는다. 이 체계에서 빨강은 이미 "지금 하는
 * 작업"을 뜻하므로, 확인 dialog의 실행 버튼이 곧 강조색이다.
 * 크기는 한국어 문구가 들어가는 실제 버튼에 맞춰 키웠다.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-on hover:bg-accent-600 active:bg-accent-700",
        destructive:
          "bg-accent text-accent-on hover:bg-accent-600 active:bg-accent-700",
        secondary:
          "bg-surface-muted text-ink hover:bg-line-strong active:bg-line-strong",
        outline:
          "border-line bg-surface text-ink hover:bg-surface-muted",
        ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
        link: "text-accent-800 underline-offset-4 hover:text-accent hover:underline",
      },
      size: {
        default: "h-11 px-6 text-[16px]",
        sm: "h-10 px-[18px] text-[15px]",
        xs: "h-8 px-3 text-[14px]",
        lg: "h-12 px-7 text-[17px]",
        icon: "size-11",
        "icon-sm": "size-10",
        "icon-xs": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
