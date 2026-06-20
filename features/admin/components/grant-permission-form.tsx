"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { grantPermissionAction } from "@/features/admin/server/actions"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { idleActionState } from "@/features/auth/types"

export function GrantPermissionForm({
  permissionPublicId,
}: {
  permissionPublicId: string
}) {
  const action = grantPermissionAction.bind(null, permissionPublicId)
  const [state, formAction] = useActionState(action, idleActionState)
  const formRef = useRef<HTMLFormElement>(null)
  const [effect, setEffect] = useState("allow")
  const errors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField
          id="grant-email"
          label="User email"
          error={errors.email}
          className="flex-1"
        >
          <Input
            id="grant-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="user@example.com"
            required
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <Label htmlFor="grant-effect">Effect</Label>
          <input type="hidden" name="effect" value={effect} />
          <Select value={effect} onValueChange={setEffect}>
            <SelectTrigger id="grant-effect" className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allow">Allow</SelectItem>
              <SelectItem value="deny">Deny</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SubmitButton pendingText="Saving…">Add</SubmitButton>
      </div>
    </form>
  )
}
