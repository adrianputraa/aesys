/**
 * Order fields an admin may modify via the "modify with reason" flow. Plain
 * metadata (not a `"use server"` export) so both the client dialog and the
 * server action can import it. The action maps `key` → the actual column.
 */
export type ModifiableFieldType = "text" | "number"

export type ModifiableField = {
  key: string
  label: string
  type: ModifiableFieldType
}

export const MODIFIABLE_FIELDS: ModifiableField[] = [
  { key: "buyerName", label: "Buyer name", type: "text" },
  { key: "buyerEmail", label: "Buyer email", type: "text" },
  { key: "buyerPhone", label: "Buyer phone", type: "text" },
  { key: "buyerAddress", label: "Buyer address", type: "text" },
  { key: "buyerCountry", label: "Buyer country", type: "text" },
  { key: "paidAmount", label: "Paid amount", type: "number" },
  { key: "shippingFee", label: "Shipping fee", type: "number" },
  { key: "grandTotal", label: "Grand total", type: "number" },
  { key: "notes", label: "Notes", type: "text" },
]
