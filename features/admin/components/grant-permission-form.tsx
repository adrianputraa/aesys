"use client"

import { useActionState, useState } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPicker, type PickerUser } from "@/components/user-picker"
import { grantPermissionAction } from "@/features/admin/server/actions"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { idleActionState } from "@/features/auth/types"

export function GrantPermissionForm({
  permissionPublicId,
  users,
}: {
  permissionPublicId: string
  users: PickerUser[]
}) {
  const action = grantPermissionAction.bind(null, permissionPublicId)
  const [state, formAction] = useActionState(action, idleActionState)
  const [effect, setEffect] = useState("allow")
  const [selected, setSelected] = useState<PickerUser | null>(null)
  // Remounting the picker (new key) clears its internal selection after a
  // successful grant — a native form reset can't reach its React state.
  const [pickerKey, setPickerKey] = useState(0)
  const [handled, setHandled] = useState(state)
  const errors = state.fieldErrors ?? {}

  // Reset the form once per successful submission (adjust-state-during-render —
  // the recommended alternative to a setState-in-effect).
  if (state !== handled) {
    setHandled(state)
    if (state.status === "success") {
      setSelected(null)
      setEffect("allow")
      setPickerKey((k) => k + 1)
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField
          id="grant-email"
          label="User"
          error={errors.email}
          className="flex-1"
        >
          <UserPicker
            key={pickerKey}
            id="grant-email"
            name="email"
            users={users}
            valueKey="email"
            placeholder="Search by email or name…"
            invalid={Boolean(errors.email)}
            onSelect={setSelected}
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

        <SubmitButton pendingText="Saving…" disabled={!selected}>
          Add
        </SubmitButton>
      </div>
    </form>
  )
}
