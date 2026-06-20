"use client"

import { Loader2Icon } from "lucide-react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

/**
 * Submit button that reflects the enclosing form's pending state via
 * `useFormStatus`. Must be rendered inside the `<form>` it submits.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  variant,
  size,
  disabled = false,
}: {
  children: React.ReactNode
  pendingText?: string
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={className}
      variant={variant}
      size={size}
    >
      {pending && <Loader2Icon className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  )
}
