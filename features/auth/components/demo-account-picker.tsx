"use client"

import { RoleBadge } from "@/features/admin/components/role-badge"
import { DEMO_PASSWORD, type DemoAccount } from "@/lib/demo"

/**
 * Demo-only helper shown above the sign-in form. Clicking an account fills the
 * email/password inputs (by id) so the visitor can sign in as any role —
 * including full admin — in one click.
 */
export function DemoAccountPicker({ accounts }: { accounts: DemoAccount[] }) {
  function fill(account: DemoAccount) {
    const email = document.getElementById("email")
    const password = document.getElementById("password")
    if (email instanceof HTMLInputElement) email.value = account.email
    if (password instanceof HTMLInputElement) password.value = account.password
    if (email instanceof HTMLInputElement) email.focus()
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Demo mode — pick an account to fill, then Sign in. Password for all:{" "}
        <code className="font-mono">{DEMO_PASSWORD}</code>
      </p>
      <div className="flex flex-col gap-1">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => fill(account)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-background"
          >
            <span className="min-w-0 flex-1 truncate">{account.email}</span>
            <RoleBadge role={account.role} />
          </button>
        ))}
      </div>
    </div>
  )
}
