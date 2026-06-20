"use client"

import * as React from "react"

type DateTimeStyle = "full" | "long" | "medium" | "short"

const noop = () => () => {}

/** True only after client hydration (no setState-in-effect). */
function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}

/**
 * Renders a stored UTC instant in the **viewer's device timezone + locale**.
 *
 * Timestamps are stored/transmitted as UTC ISO strings; formatting must happen
 * on the client so it matches the user's timezone (a Server Component would use
 * the *server's* timezone, which confuses users elsewhere). To stay
 * hydration-safe, the first render is a deterministic UTC string and it swaps to
 * the local timezone after hydration.
 *
 * @param value ISO 8601 / UTC timestamp string (e.g. from `date.toISOString()`).
 */
export function LocalTime({
  value,
  dateStyle,
  timeStyle,
}: {
  value: string
  dateStyle?: DateTimeStyle
  timeStyle?: DateTimeStyle
}) {
  const hydrated = useHydrated()
  const date = new Date(value)
  const options: Intl.DateTimeFormatOptions = { dateStyle, timeStyle }

  const text = hydrated
    ? // Device locale + timezone.
      date.toLocaleString(undefined, options)
    : // Deterministic for SSR / first paint (same on server and client).
      date.toLocaleString("en-US", { ...options, timeZone: "UTC" })

  return (
    <time dateTime={value} suppressHydrationWarning>
      {text}
    </time>
  )
}
