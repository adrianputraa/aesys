"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Replaces characters that are unsafe in a filename. */
function sanitize(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Triggers the browser print dialog (Save as PDF works there). Browsers default
 * the PDF filename to `document.title`, so we set it to
 * `[ORDER ID] - [BUYER] - [PAID STATUS] - [DATE]` for the print, then restore.
 */
export function PrintButton({
  orderCode,
  buyerName,
  paidStatus,
}: {
  orderCode: string
  buyerName: string
  paidStatus: string
}) {
  function print() {
    const previous = document.title
    const date = new Date()
      .toLocaleDateString("en-CA") // YYYY-MM-DD
      .replace(/[^0-9-]/g, "")
    document.title = sanitize(
      `${orderCode} - ${buyerName} - ${paidStatus} - ${date}`
    )
    const restore = () => {
      document.title = previous
    }
    window.addEventListener("afterprint", restore, { once: true })
    window.print()
    // Fallback restore in case `afterprint` doesn't fire.
    setTimeout(restore, 2000)
  }

  return (
    <Button type="button" onClick={print} className="print:hidden">
      <PrinterIcon />
      Print / Save PDF
    </Button>
  )
}
