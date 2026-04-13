import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        gradient: "bg-gradient-to-r from-[#0F9DE4] to-[#0025B8] text-white border-transparent hover:opacity-90",
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-8 text-sm",
        lg: "h-14 px-12 text-lg",
        icon: "size-10",
      },
      border: {
        true: "border-2",
        false: "border-0",
      },
      hasBg: {
        true: "",
        false: "bg-none bg-transparent",
      }
    },
    defaultVariants: {
      variant: "gradient",
      size: "md",
      border: false,
      hasBg: true,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  border,
  hasBg,
  asChild = false,
  ...props
}: ButtonProps) {
  // radix-ui එකේ Slot භාවිතා කිරීමෙන් asChild පහසුකම ලැබේ
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, border, hasBg, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }