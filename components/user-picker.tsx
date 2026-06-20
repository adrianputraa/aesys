"use client"

import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

export type PickerUser = {
  publicId: string
  name: string
  email: string
  image?: string | null
}

/** Shared predicate: matches a user by email OR name (username). */
function matchUser(user: PickerUser, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    user.email.toLowerCase().includes(q) || user.name.toLowerCase().includes(q)
  )
}

function initials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

/**
 * Reusable, searchable picker over the registered-user directory. Searches by
 * email *and* name, and writes the selected user's `email` or `publicId`
 * (per `valueKey`) into a hidden input named `name` so it reaches a Server
 * Action's `FormData`. When the typed text matches no registered user, a "not
 * registered" message is shown — both in the dropdown and inline below it.
 *
 * Uncontrolled: it owns its selection. Remount it (change its `key`) to reset.
 * Use `onSelect` to react to selection (e.g. enable a submit button).
 */
export function UserPicker({
  users,
  name,
  valueKey = "email",
  id,
  placeholder = "Search by email or name…",
  invalid = false,
  disabled = false,
  notRegisteredMessage,
  onSelect,
}: {
  users: PickerUser[]
  name: string
  valueKey?: "email" | "publicId"
  id?: string
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  notRegisteredMessage?: (query: string) => string
  onSelect?: (user: PickerUser | null) => void
}) {
  const [selected, setSelected] = React.useState<PickerUser | null>(null)
  const [query, setQuery] = React.useState("")

  const hiddenValue = selected ? selected[valueKey] : ""

  const q = query.trim().toLowerCase()
  const selectedMatchesQuery =
    selected != null && selected.email.toLowerCase() === q
  const hasMatch = users.some((u) => matchUser(u, query))
  const showNotRegistered = q.length > 0 && !hasMatch && !selectedMatchesQuery

  const message = notRegisteredMessage
    ? notRegisteredMessage(query.trim())
    : `"${query.trim()}" is not a registered user.`

  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={name} value={hiddenValue} />
      <Combobox
        items={users}
        value={selected}
        onValueChange={(value: PickerUser | null) => {
          setSelected(value)
          onSelect?.(value)
        }}
        onInputValueChange={(value: string) => setQuery(value)}
        itemToStringLabel={(user: PickerUser) => user?.email ?? ""}
        itemToStringValue={(user: PickerUser) => user?.[valueKey] ?? ""}
        isItemEqualToValue={(a: PickerUser, b: PickerUser) =>
          a?.publicId === b?.publicId
        }
        filter={(item: PickerUser, search: string) => matchUser(item, search)}
        disabled={disabled}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          aria-invalid={invalid || showNotRegistered}
          autoComplete="off"
          disabled={disabled}
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>No registered user matches.</ComboboxEmpty>
          <ComboboxList>
            {(user: PickerUser) => (
              <ComboboxItem key={user.publicId} value={user}>
                <Avatar className="size-7">
                  {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                  <AvatarFallback className="text-[10px]">
                    {initials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{user.email}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.name}
                  </span>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {showNotRegistered ? (
        <p className={cn("text-xs text-destructive")}>{message}</p>
      ) : null}
    </div>
  )
}
