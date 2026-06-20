"use client"

import { useActionState } from "react"

import { Input } from "@/components/ui/input"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { updateProfileAction } from "@/features/auth/server/actions"
import { idleActionState } from "@/features/auth/types"

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState(
    updateProfileAction,
    idleActionState
  )
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      <FormField id="name" label="Name" error={errors.name}>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={defaultName}
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </FormField>

      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  )
}
