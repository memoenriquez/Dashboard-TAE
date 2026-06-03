import * as React from "react"

const MOBILE_BREAKPOINT = 768

const subscribe = (callback: () => void) => {
  const mediaQuery = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
  )

  mediaQuery.addEventListener("change", callback)

  return () => mediaQuery.removeEventListener("change", callback)
}

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT

const getServerSnapshot = () => false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
