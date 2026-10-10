import { useEffect, useRef } from 'react'

const LERP_RATIO = 0.3

function lerp(current: number, target: number, ratio: number) {
  return current * (1 - ratio) + target * ratio
}

export function MouseFollower() {
  const followerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const follower = followerRef.current
    if (!follower || !window.matchMedia('(pointer: fine)').matches) {
      return
    }

    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    let animationFrameId = 0

    const handlePointerMove = (event: PointerEvent) => {
      const size = follower.offsetWidth

      target.x = event.clientX - size / 2
      target.y = event.clientY - size / 2
      follower.style.opacity = '1'
    }

    const animate = () => {
      current.x = lerp(current.x, target.x, LERP_RATIO)
      current.y = lerp(current.y, target.y, LERP_RATIO)

      follower.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`
      animationFrameId = requestAnimationFrame(animate)
    }

    window.addEventListener('pointermove', handlePointerMove)
    animationFrameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div
      ref={followerRef}
      className="
        pointer-events-none
        fixed top-0 left-0 z-20
        hidden size-[15px]
        rounded-full
        bg-white/60
        opacity-0
        transition-opacity
        duration-300
        will-change-transform
        pointer-fine:block
        motion-reduce:hidden
      "
      aria-hidden="true"
    />
  )
}
