import { useEffect, useRef } from "react"

export function useFlipbookCleanup(cleanupFns) {
  const fnsRef = useRef(cleanupFns)
  fnsRef.current = cleanupFns

  useEffect(() => {
    return () => {
      fnsRef.current.forEach((fn) => {
        try { fn() } catch {}
      })
    }
  }, [])
}
