"use client"

import * as React from "react"

/** Single source of truth for the mobile breakpoint (Tailwind `md`). */
export const MOBILE_BREAKPOINT = 768

/** Reactively tracks whether the viewport matches a media query. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}

/** True on small (mobile) viewports. */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}
