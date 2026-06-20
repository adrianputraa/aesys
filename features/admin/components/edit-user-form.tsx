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
import { editUserAction } from "@/features/admin/server/actions"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { idleActionState } from "@/features/auth/types"
import { ROLES } from "@/lib/permissions"

export function EditUserForm({
  userPublicId,
  defaultName,
  defaultEmail,
  defaultRole,
  defaultEmailVerified,
  allowSuperAdmin,
}: {
  userPublicId: string
  defaultName: string
  defaultEmail: string
  defaultRole: string
  defaultEmailVerified: boolean
  allowSuperAdmin: boolean
}) {
  const action = editUserAction.bind(null, userPublicId)
  const [state, formAction] = useActionState(action, idleActionState)
  const errors = state.fieldErrors ?? {}
  const [role, setRole] = useState(defaultRole || "")

  const roleOptions = allowSuperAdmin
    ? ROLES
    : ROLES.filter((r) => r !== "SUPER_ADMIN")

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      <FormField id="name" label="Name" error={errors.name}>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="off"
          defaultValue={defaultName}
          required
        />
      </FormField>

      <FormField id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={defaultEmail}
          required
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
          >
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role ? (
          <p className="text-xs text-destructive">{errors.role}</p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
        <input
          type="checkbox"
          name="emailVerified"
          defaultChecked={defaultEmailVerified}
          className="size-4 accent-primary"
        />
        Email verified
      </label>

      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  )
}
