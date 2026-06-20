"use client"

import { useActionState, useEffect, useRef } from "react"

import { Input } from "@/components/ui/input"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { changePasswordAction } from "@/features/auth/server/actions"
import { MIN_PASSWORD_LENGTH } from "@/features/auth/lib/validation"
import { idleActionState } from "@/features/auth/types"

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(
    changePasswordAction,
    idleActionState
  )
  const errors = state.fieldErrors ?? {}
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the password fields after a successful change.
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset()
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
    >
      <FormMessage state={state} />

      <FormField
        id="currentPassword"
        label="Current password"
        error={errors.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors.currentPassword)}
          aria-describedby={
            errors.currentPassword ? "currentPassword-error" : undefined
          }
        />
      </FormField>

      <FormField
        id="newPassword"
        label="New password"
        error={errors.newPassword}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.newPassword)}
          aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
        />
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm new password"
        error={errors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? "confirmPassword-error" : undefined
          }
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
        <input
          type="checkbox"
          name="revokeOtherSessions"
          defaultChecked
          className="size-4 accent-primary"
        />
        Sign out other devices
      </label>

      <div className="flex justify-end">
        <SubmitButton pendingText="Updating…">Change password</SubmitButton>
      </div>
    </form>
  )
}
