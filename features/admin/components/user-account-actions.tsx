"use client"

import {
  KeyRoundIcon,
  MailIcon,
  ShieldCheckIcon,
  ShieldIcon,
} from "lucide-react"
import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { ResponsiveConfirm } from "@/components/responsive-confirm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  restrictUserAction,
  sendUserPasswordResetAction,
  setUserPasswordAction,
  unrestrictUserAction,
} from "@/features/admin/server/actions"
import { FormField } from "@/features/auth/components/form-field"
import { FormMessage } from "@/features/auth/components/form-message"
import { SubmitButton } from "@/features/auth/components/submit-button"
import { MIN_PASSWORD_LENGTH } from "@/features/auth/lib/validation"
import { idleActionState, type ActionState } from "@/features/auth/types"

function notify(result: ActionState) {
  if (result.status === "success") toast.success(result.message ?? "Done.")
  else toast.error(result.message ?? "Something went wrong.")
}

export function UserAccountActions({
  userPublicId,
  banned,
  banReason,
  canPassword,
  canRestrict,
}: {
  userPublicId: string
  banned: boolean
  banReason: string | null
  canPassword: boolean
  canRestrict: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      {canPassword ? (
        <>
          <SetPasswordSection userPublicId={userPublicId} />
          <SendResetSection userPublicId={userPublicId} />
        </>
      ) : null}
      {canPassword && canRestrict ? <Separator /> : null}
      {canRestrict ? (
        <RestrictSection
          userPublicId={userPublicId}
          banned={banned}
          banReason={banReason}
        />
      ) : null}
    </div>
  )
}

function SetPasswordSection({ userPublicId }: { userPublicId: string }) {
  const action = setUserPasswordAction.bind(null, userPublicId)
  const [state, formAction] = useActionState(action, idleActionState)
  const formRef = useRef<HTMLFormElement>(null)
  const errors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Set a new password</h3>
        <p className="text-xs text-muted-foreground">
          Immediately replaces the user&apos;s password.
        </p>
      </div>
      <FormMessage state={state} />
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
      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">
          <KeyRoundIcon />
          Set password
        </SubmitButton>
      </div>
    </form>
  )
}

function SendResetSection({ userPublicId }: { userPublicId: string }) {
  const [pending, startTransition] = useTransition()

  function send() {
    startTransition(async () => {
      notify(await sendUserPasswordResetAction(userPublicId))
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-medium">Email a reset link</h3>
        <p className="text-xs text-muted-foreground">
          Lets the user choose their own new password.
        </p>
      </div>
      <Button variant="outline" size="sm" disabled={pending} onClick={send}>
        <MailIcon />
        {pending ? "Sending…" : "Send reset email"}
      </Button>
    </div>
  )
}

function RestrictSection({
  userPublicId,
  banned,
  banReason,
}: {
  userPublicId: string
  banned: boolean
  banReason: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState("")

  function restrict() {
    startTransition(async () => {
      notify(await restrictUserAction(userPublicId, reason))
    })
  }

  function unrestrict() {
    startTransition(async () => {
      notify(await unrestrictUserAction(userPublicId))
    })
  }

  if (banned) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-destructive/5 p-3">
        <div className="flex items-center gap-2">
          <Badge variant="destructive">Restricted</Badge>
        </div>
        {banReason ? (
          <p className="text-xs text-muted-foreground">Reason: {banReason}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          This account can&apos;t sign in, and all its sessions are revoked.
        </p>
        <div>
          <ResponsiveConfirm
            trigger={
              <Button variant="outline" size="sm" disabled={pending}>
                <ShieldCheckIcon />
                {pending ? "Working…" : "Lift restriction"}
              </Button>
            }
            title="Lift restriction?"
            description="The user will be able to sign in again."
            confirmLabel="Lift restriction"
            onConfirm={unrestrict}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Restrict account</h3>
        <p className="text-xs text-muted-foreground">
          Blocks sign-in and immediately signs the user out of every device.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ban-reason">Reason (optional)</Label>
        <Input
          id="ban-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why is this account being restricted?"
        />
      </div>
      <div>
        <ResponsiveConfirm
          trigger={
            <Button variant="destructive" size="sm" disabled={pending}>
              <ShieldIcon />
              {pending ? "Restricting…" : "Restrict account"}
            </Button>
          }
          title="Restrict this account?"
          description="The user will be signed out everywhere and blocked from signing in until you lift the restriction."
          confirmLabel="Restrict account"
          onConfirm={restrict}
        />
      </div>
    </div>
  )
}
