import { MonitorIcon, SmartphoneIcon, TabletIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Picks an icon for a parsed device type (from Next's `userAgent` parser). */
export function DeviceIcon({
  deviceType,
  className,
}: {
  deviceType: string
  className?: string
}) {
  const Icon =
    deviceType === "mobile"
      ? SmartphoneIcon
      : deviceType === "tablet"
        ? TabletIcon
        : MonitorIcon

  return <Icon className={cn("size-5", className)} aria-hidden />
}
