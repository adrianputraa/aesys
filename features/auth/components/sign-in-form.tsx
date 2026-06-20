"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Input } from "@/components/ui/input"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { signInAction } from "@/features/auth/server/actions"
import { idleActionState } from "@/features/auth/types"

export function SignInForm({
  from,
  defaultEmail,
  defaultPassword,
}: {
  from?: string
  defaultEmail?: string
  defaultPassword?: string
}) {
  const [state, formAction] = useActionState(signInAction, idleActionState)
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      {from ? <input type="hidden" name="from" value={from} /> : null}

      <FormField id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail}
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </FormField>

      <FormField id="password" label="Password" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue={defaultPassword}
          required
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
      </FormField>

      <div className="-mt-1 flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
        <input
          type="checkbox"
          name="rememberMe"
          defaultChecked
          className="size-4 accent-primary"
        />
        Keep me signed in
      </label>

      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  )
}
