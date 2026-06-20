"use client"

import { SearchIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLES } from "@/lib/permissions"

const FIELD_OPTIONS = [
  { value: "all", label: "Name or email" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
]

export function UserFilters({
  q,
  field,
  role,
}: {
  q: string
  field: string
  role: string
}) {
  const router = useRouter()
  const [fieldValue, setFieldValue] = useState(field)
  const [roleValue, setRoleValue] = useState(role)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextQ = String(new FormData(event.currentTarget).get("q") ?? "").trim()
    const params = new URLSearchParams()
    if (nextQ) params.set("q", nextQ)
    if (fieldValue !== "all") params.set("field", fieldValue)
    if (roleValue !== "all") params.set("role", roleValue)
    const qs = params.toString()
    router.push(qs ? `/admin/users?${qs}` : "/admin/users")
  }

  const hasFilters = Boolean(q) || field !== "all" || role !== "all"

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="q" className="text-xs text-muted-foreground">
          Search
        </Label>
        <Input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Search users…"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field" className="text-xs text-muted-foreground">
          In
        </Label>
        <Select value={fieldValue} onValueChange={setFieldValue}>
          <SelectTrigger id="field" className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role" className="text-xs text-muted-foreground">
          Role
        </Label>
        <Select value={roleValue} onValueChange={setRoleValue}>
          <SelectTrigger id="role" className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">
          <SearchIcon />
          Search
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="icon" aria-label="Clear filters">
            <Link href="/admin/users">
              <XIcon />
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  )
}
