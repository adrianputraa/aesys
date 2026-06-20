"use client"

import { PencilIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MODIFIABLE_FIELDS } from "@/features/sales/lib/modifiable"
import { modifyOrderAction } from "@/features/sales/server/order-actions"

export function ModifyOrderDialog({
  orderPublicId,
}: {
  orderPublicId: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [field, setField] = React.useState(MODIFIABLE_FIELDS[0].key)
  const [value, setValue] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [pending, startTransition] = React.useTransition()

  const meta = MODIFIABLE_FIELDS.find((f) => f.key === field)

  function reset() {
    setValue("")
    setReason("")
    setErrors({})
  }

  function submit() {
    setErrors({})
    if (!reason.trim()) {
      setErrors({ reason: "Please state a reason." })
      return
    }
    startTransition(async () => {
      const r = await modifyOrderAction(orderPublicId, field, value, reason)
      if (r.status === "success") {
        toast.success("Order modified.")
        reset()
        setOpen(false)
        router.refresh()
      } else {
        if (r.fieldErrors) setErrors(r.fieldErrors as Record<string, string>)
        else toast.error(r.message)
      }
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <PencilIcon />
          Modify
        </Button>
      }
      title="Modify order"
      description="Changes are recorded with a reason in the order's history."
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="modify-field">Field</FieldLabel>
          <Select
            value={field}
            onValueChange={(v) => {
              setField(v)
              setValue("")
            }}
          >
            <SelectTrigger id="modify-field" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODIFIABLE_FIELDS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={Boolean(errors.newValue)}>
          <FieldLabel htmlFor="modify-value">New value</FieldLabel>
          <Input
            id="modify-value"
            type={meta?.type === "number" ? "number" : "text"}
            step={meta?.type === "number" ? "any" : undefined}
            min={meta?.type === "number" ? "0" : undefined}
            value={value}
            autoComplete="off"
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(errors.newValue)}
          />
          <FieldError
            errors={
              errors.newValue ? [{ message: errors.newValue }] : undefined
            }
          />
        </Field>

        <Field data-invalid={Boolean(errors.reason)}>
          <FieldLabel htmlFor="modify-reason">Reason</FieldLabel>
          <Textarea
            id="modify-reason"
            rows={2}
            value={reason}
            placeholder="Why is this being changed?"
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(errors.reason)}
          />
          <FieldDescription>
            Required — saved to the order history.
          </FieldDescription>
          <FieldError
            errors={errors.reason ? [{ message: errors.reason }] : undefined}
          />
        </Field>
      </FieldGroup>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save change"}
        </Button>
      </div>
    </ResponsiveDialog>
  )
}
