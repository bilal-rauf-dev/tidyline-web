import { useEffect } from 'react'

const TEXT_ENTRY = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
export function isTypingTarget(target) { return Boolean(target && (TEXT_ENTRY.has(target.tagName) || target.isContentEditable === true)) }

export const SHORTCUTS = [
  { keys: ['Ctrl/⌘ K'], label: 'Open command palette', handler: 'onPalette', global: true },
  { keys: ['N', 'Q'], label: 'Quick Add', handler: 'onQuickAdd' },
  { keys: ['/'], label: 'Focus search', handler: 'onFocusSearch' },
  { keys: ['J', '↓'], label: 'Focus next task', handler: 'onNextTask' },
  { keys: ['K', '↑'], label: 'Focus previous task', handler: 'onPreviousTask' },
  { keys: ['H', '←'], label: 'Focus previous bucket', handler: 'onPreviousBucket' },
  { keys: ['L', '→'], label: 'Focus next bucket', handler: 'onNextBucket' },
  { keys: ['Home'], label: 'Focus first task', handler: 'onFirstTask' },
  { keys: ['End'], label: 'Focus last task', handler: 'onLastTask' },
  { keys: ['E'], label: 'Open focused task', handler: 'onEditActive' },
  { keys: ['X'], label: 'Toggle focused selection', handler: 'onSelectActive' },
  { keys: ['Space', 'C'], label: 'Complete or reopen focused task', handler: 'onToggleActive' },
  { keys: ['T'], label: 'Plan focused task for today', handler: 'onPlanActive' },
  { keys: ['P'], label: 'Pin or unpin focused task', handler: 'onPinActive' },
  { keys: ['A'], label: 'Archive focused task', handler: 'onArchiveActive' },
  { keys: ['1–4'], label: 'Move focused task to bucket', handler: 'onMoveActive' },
  { keys: ['Delete'], label: 'Delete focused task', handler: 'onDeleteActive' },
  { keys: ['U'], label: 'Undo last action', handler: 'onUndo' },
  { keys: ['?'], label: 'Show keyboard shortcuts', handler: 'onHelp' },
  { keys: ['Esc'], label: 'Close the active surface', handler: 'onEscape', global: true },
]

function matchingShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') return SHORTCUTS[0]
  const key = event.key
  const lower = key.toLowerCase()
  if (/^[1-4]$/.test(key)) return SHORTCUTS.find((entry) => entry.handler === 'onMoveActive')
  return SHORTCUTS.find((entry) => entry.keys.some((label) => {
    if (label === '↓') return key === 'ArrowDown'
    if (label === '↑') return key === 'ArrowUp'
    if (label === '←') return key === 'ArrowLeft'
    if (label === '→') return key === 'ArrowRight'
    if (label === 'Space') return key === ' '
    if (label === 'Esc') return key === 'Escape'
    if (label === 'Delete') return key === 'Delete' || key === 'Backspace'
    if (label === '1–4' || label === 'Ctrl/⌘ K') return false
    return label.toLowerCase() === lower
  }))
}

export function useShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(event) {
      const shortcut = matchingShortcut(event)
      if (!shortcut) return
      if (!shortcut.global && (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey)) return
      const handled = handlers[shortcut.handler]?.(event.key)
      if (handled !== false) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
