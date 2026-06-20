"use client"

import { useActionState, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createUserAction } from "@/features/admin/server/actions"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { MIN_PASSWORD_LENGTH } from "@/features/auth/lib/validation"
import { idleActionState } from "@/features/auth/types"
import { DEFAULT_ROLE, ROLES } from "@/lib/permissions"

export function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, idleActionState)
  const errors = state.fieldErrors ?? {}
  // Controlled so the value is mirrored into a hidden input the server action's
  // FormData reads (6 roles → Select, not Combobox; see CLAUDE.md).
  const [role, setRole] = useState<string>(DEFAULT_ROLE)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      <FormField id="name" label="Name" error={errors.name}>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </FormField>

      <FormField id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </FormField>

      <FormField
        id="password"
        label="Temporary password"
        error={errors.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Share it securely.`}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
      </FormField>

      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Role</Label>
        <input type="hidden" name="role" value={role} />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger
            id="role"
            className="w-full"
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? "role-error" : undefined}
          >
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role ? (
          <p id="role-error" className="text-xs text-destructive">
            {errors.role}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingText="Creating…">Create user</SubmitButton>
      </div>
    </form>
  )
}
