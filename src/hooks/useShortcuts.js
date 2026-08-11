import { useEffect } from 'react'

const TEXT_ENTRY = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** True when focus sits somewhere that should swallow single-key shortcuts. */
export function isTypingTarget(target) {
  if (!target) {
    return false
  }

  return TEXT_ENTRY.has(target.tagName) || target.isContentEditable === true
}

export function useShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(event) {
      const typing = isTypingTarget(event.target)

      // Ctrl/Cmd+K works everywhere, including inside inputs.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        handlers.onPalette?.()
        return
      }

      if (event.key === 'Escape') {
        handlers.onEscape?.()
        return
      }

      if (typing || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      switch (event.key) {
        case 'q':
        case 'Q':
        case 'n':
        case 'N':
          event.preventDefault()
          handlers.onQuickAdd?.()
          break
        case '/':
          event.preventDefault()
          handlers.onFocusSearch?.()
          break
        case ' ':
          if (handlers.onToggleActive?.()) {
            event.preventDefault()
          }
          break
        case 'Delete':
        case 'Backspace':
          if (handlers.onDeleteActive?.()) {
            event.preventDefault()
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
