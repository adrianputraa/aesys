import { Badge } from "@/components/ui/badge"
import { env } from "@/lib/env"

/** Renders a small "Demo" badge when running against the embedded demo database. */
export function DemoBadge() {
  if (!env.isDemoMode) return null
  return (
    <Badge variant="outline" className="font-normal">
      Demo
    </Badge>
  )
}
