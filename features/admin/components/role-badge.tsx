import { Badge } from "@/components/ui/badge"

const VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SUPER_ADMIN: "default",
  ADMIN: "default",
  STAFF: "secondary",
  MERCHANT: "secondary",
  CUSTOMER: "outline",
  GUEST: "outline",
}

export function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <Badge variant="outline">No role</Badge>
  return <Badge variant={VARIANT[role] ?? "outline"}>{role}</Badge>
}
