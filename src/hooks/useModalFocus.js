import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let bodyLockCount = 0
let previousBodyOverflow = ''

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyLockCount += 1
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1)
  if (bodyLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

function isVisible(element) {
  if (element.hidden || element.closest('[hidden], [inert], [aria-hidden="true"]')) {
    return false
  }

  return element.getClientRects().length > 0
}

export function getFocusableElements(container) {
  if (!container) return []
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isVisible)
}

export function keepFocusInside(container, event) {
  const focusable = getFocusableElements(container)

  if (focusable.length === 0) {
    event.preventDefault()
    container.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

export function useModalFocus(
  dialogRef,
  { active = true, initialFocusRef = null, onClose, closeOnEscape = true } = {},
) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!active) return undefined

    const dialog = dialogRef.current
    if (!dialog) return undefined

    const previouslyFocused = document.activeElement
    lockBodyScroll()

    const initialTarget = initialFocusRef?.current ?? getFocusableElements(dialog)[0] ?? dialog
    initialTarget.focus()

    function handleKeyDown(event) {
      if (event.defaultPrevented) return

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current?.()
        return
      }

      if (event.key === 'Tab') {
        keepFocusInside(dialog, event)
      }
    }

    function handleFocusIn(event) {
      if (dialog.contains(event.target)) return
      const fallbackTarget = getFocusableElements(dialog)[0] ?? dialog
      fallbackTarget.focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      unlockBodyScroll()

      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [active, closeOnEscape, dialogRef, initialFocusRef])
}
