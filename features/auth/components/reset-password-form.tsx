"use client"

import { useActionState } from "react"

import { Input } from "@/components/ui/input"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { resetPasswordAction } from "@/features/auth/server/actions"
import { MIN_PASSWORD_LENGTH } from "@/features/auth/lib/validation"
import { idleActionState } from "@/features/auth/types"

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(
    resetPasswordAction,
    idleActionState
  )
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      <input type="hidden" name="token" value={token} />

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
        />
      </FormField>

      <SubmitButton className="w-full" pendingText="Updating…">
        Reset password
      </SubmitButton>
    </form>
  )
}
