import { useEffect, useRef } from 'react'
import { GridMotionScene } from '../lib/GridMotionScene'

export function GridMotion() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let active = true
    const scene = new GridMotionScene(container)
    void scene.init().catch((error: unknown) => {
      if (active) {
        console.error('Could not initialize Grid Motion', error)
      }
    })

    return () => {
      active = false
      scene.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="
        fixed inset-0
        cursor-grab
        touch-none
        select-none
        active:cursor-grabbing
      "
      aria-hidden="true"
    />
  )
}
