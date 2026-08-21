import { SHORTCUTS } from '../hooks/useShortcuts'

export function ShortcutDialog({ onClose }) {
  return (
    <div className="palette-layer" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
      <button type="button" className="palette-scrim" aria-label="Close keyboard shortcuts" onClick={onClose} />
      <section className="shortcut-dialog">
        <header><h2 id="shortcut-title">Keyboard shortcuts</h2><button type="button" className="icon-mini" aria-label="Close keyboard shortcuts" onClick={onClose}>×</button></header>
        <dl>{SHORTCUTS.map((shortcut) => <div key={shortcut.handler}><dt>{shortcut.keys.map((key) => <kbd key={key}>{key}</kbd>)}</dt><dd>{shortcut.label}</dd></div>)}</dl>
      </section>
    </div>
  )
}
