import { userAgent } from "next/server"

import type { DeviceInfo } from "@/features/auth/types"

/**
 * Parses a stored user-agent string into a friendly device descriptor, reusing
 * Next.js's built-in `userAgent` parser (no extra dependency). `userAgent`
 * normally reads a live request's headers — we feed it a one-off `Headers`
 * object built from the persisted UA string so we can format historical
 * sessions the same way.
 */
export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  if (!ua) {
    return {
      browser: "Unknown browser",
      os: "Unknown OS",
      deviceType: "desktop",
      label: "Unknown device",
    }
  }

  const { browser, os, device } = userAgent({
    headers: new Headers({ "user-agent": ua }),
  })

  const browserName = browser.name ?? "Unknown browser"
  const osName = os.name ?? "Unknown OS"
  // `device.type` is undefined for desktops in the underlying parser.
  const deviceType = device.type ?? "desktop"

  return {
    browser: browserName,
    os: osName,
    deviceType,
    label: `${browserName} on ${osName}`,
  }
}
