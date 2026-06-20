"use client"

import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

/**
 * "Back to admin" affordance shown on every admin sub-page (anything deeper than
 * `/admin`). Hidden on the admin home itself.
 */
export function AdminBackButton() {
  const pathname = usePathname()
  if (!pathname || pathname === "/admin" || !pathname.startsWith("/admin")) {
    return null
  }

  return (
    <Button asChild variant="ghost" size="sm">
      <Link href="/admin">
        <ArrowLeftIcon />
        Back to admin
      </Link>
    </Button>
  )
}
