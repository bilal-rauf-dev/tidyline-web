import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const RECHECK_MS = 60000

// Captured at module load, never during render.
const MODULE_START = Date.now()

/**
 * Drives the "living timeline": a periodic tick whose only purpose is to
 * re-evaluate bucket assignment as wall-clock time advances. Also ticks when
 * the tab regains visibility, so a laptop reopened the next morning
 * re-shelves its tasks instead of showing yesterday's layout.
 */
export function useTimeTick(intervalMs = RECHECK_MS) {
  const [tick, setTick] = useState(MODULE_START)

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), intervalMs)

    function onVisible() {
      if (document.visibilityState === 'visible') {
        setTick(Date.now())
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [intervalMs])

  return tick
}

/**
 * FLIP: after a time-driven re-render, any task element that changed position
 * is snapped back to where it was and animated to its new home, so a task
 * crossing a bucket boundary visibly travels instead of teleporting.
 *
 * Only armed by `animationKey` changes (the time tick) — manual drags and
 * filter changes re-render without animating.
 */
export function useFlipReparent(containerRef, animationKey, { duration = 420 } = {}) {
  const previousRects = useRef(new Map())
  const armed = useRef(false)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }

    armed.current = true
  }, [animationKey])

  useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const nodes = container.querySelectorAll('[data-task-id]')
    const nextRects = new Map()

    nodes.forEach((node) => {
      nextRects.set(node.dataset.taskId, node.getBoundingClientRect())
    })

    if (armed.current) {
      armed.current = false

      nextRects.forEach((rect, id) => {
        const previous = previousRects.current.get(id)

        if (!previous) {
          return
        }

        const dx = previous.left - rect.left
        const dy = previous.top - rect.top

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          return
        }

        const node = container.querySelector(`[data-task-id="${CSS.escape(id)}"]`)

        node?.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0px, 0px)' },
          ],
          { duration, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
        )
      })
    }

    previousRects.current = nextRects
  })
}
