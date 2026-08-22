/* Headless render smoke test for the complete Phase 2 surface. */
function makeStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  }
}

const noopEvents = { addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true }
const documentStub = {
  ...noopEvents,
  documentElement: { dataset: {}, style: { setProperty() {} } },
  visibilityState: 'visible', activeElement: null, body: { style: {} },
  querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style: {}, click() {}, setAttribute() {} }),
}
const locationStub = { pathname: '/', search: '', hash: '', href: 'http://localhost/' }
globalThis.localStorage = makeStorage()
globalThis.sessionStorage = makeStorage()
globalThis.localStorage.setItem('tidyline:profile', JSON.stringify({ isSetUp: true, name: 'TidyLine', isGuest: false }))
globalThis.document = documentStub
globalThis.location = locationStub
globalThis.history = { pushState() {}, replaceState() {}, state: null, length: 1 }
globalThis.window = {
  ...noopEvents, document: documentStub, location: locationStub, history: globalThis.history,
  localStorage: globalThis.localStorage, navigator: globalThis.navigator,
  matchMedia: () => ({ matches: false, ...noopEvents }),
  confirm: () => true, alert() {}, setTimeout,
}

const { renderToString } = await import('react-dom/server')
const { default: App } = await import('../src/App.jsx')
const { NowPage } = await import('../src/pages/NowPage.jsx')
const { BoardPage } = await import('../src/pages/BoardPage.jsx')
const { CalendarPage } = await import('../src/pages/CalendarPage.jsx')
const { SettingsPage } = await import('../src/pages/SettingsPage.jsx')
const { RoutinesPage } = await import('../src/pages/RoutinesPage.jsx')
const { CompletionFeedbackToast } = await import('../src/components/CompletionFeedbackToast.jsx')
const { normalizeTask } = await import('../src/utils/taskMigration.js')

const today = new Date()
const iso = (offset) => {
  const date = new Date(today)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}
const tasks = [
  normalizeTask({
    id: 'a', title: 'Recurring report', deadline: iso(3), tags: ['work'],
    recurrence: { freq: 'weekly', weekday: 1 }, duration: { value: 45, unit: 'min' },
    checklist: [{ id: 'c1', text: 'Draft', done: false }],
    attachments: [{ id: 'old', label: 'Legacy brief', url: 'https://example.com/brief' }],
  }),
  normalizeTask({ id: 'b', title: 'Today item', deadline: iso(0), pinned: true }),
  normalizeTask({ id: 'c', title: 'No deadline', deadline: null }),
  normalizeTask({ id: 'd', title: 'Done', deadline: iso(0), done: true }),
]
const noop = () => {}
const taskActions = new Proxy({}, { get: () => noop })
const appearance = {
  theme: 'light', toggleTheme: noop, accent: '#ff5a36', setAccent: noop,
  density: 'comfortable', setDensity: noop,
}
const cases = [
  ['App shell', <App />, ['TidyLine', 'Now', 'Board', 'Calendar', 'Routines', 'nav-indicator']],
  ['NowPage', <NowPage tasks={tasks} onComplete={noop} onStart={noop} onPause={noop} />, ['Here’s what I’d do next', 'Start here', 'Today item', '5 more minutes', 'Done', 'Not this']],
  ['BoardPage', <BoardPage tasks={tasks} addTask={noop} moveTaskToBucket={noop} bulkComplete={noop} bulkArchive={noop} bulkDelete={noop} undoState={{ message: 'Task changed' }} undo={noop} dismissUndo={noop} {...taskActions} />, ['Today', 'This Week', 'This Month', 'Later', 'distance-rail', 'data-task-id', 'undo-toast']],
  ['CalendarPage', <CalendarPage tasks={tasks} addTask={noop} setDeadline={noop} />, ['Calendar', 'Export calendar', 'device timezone', 'Time ahead', 'time-ribbon', 'calendar-grid', 'calendar-day']],
  ['SettingsPage', <SettingsPage tasks={tasks} appearance={appearance} importTasks={noop} importRoutines={noop} routines={[]} clearCompleted={noop} askBeforeDelete onAskBeforeDeleteChange={noop} profile={{ name: 'TidyLine', setName: noop }} />, ['Accent colour', 'accent-swatch', 'Density', 'Reminder sound', 'checked only while TidyLine is open', 'Personal estimate multiplier', 'Export workspace']],
  ['RoutinesPage', <RoutinesPage routines={[{ id: 'leave', title: 'Leaving home', steps: [{ id: 'keys', text: 'Pick up keys' }] }]} dataError="" onAdd={noop} onUpdate={noop} onDelete={noop} />, ['Routines', 'Leaving home', 'Run routine', 'New routine', 'Edit', 'Delete']],
  ['Completion feedback', <CompletionFeedbackToast feedback={{ title: 'Timed task', estimateMinutes: 30, actualMinutes: 70 }} onDismiss={noop} />, ['completion-feedback-toast', 'Timed task', 'Estimated', 'took']],
]

let failures = 0
for (const [name, element, markers] of cases) {
  try {
    const html = renderToString(element)
    const missing = markers.filter((marker) => !html.includes(marker))
    if (!html || missing.length) throw new Error(`missing markers: ${missing.join(', ')}`)
    console.log(`ok    ${name} — ${html.length} chars`)
  } catch (error) {
    console.error(`FAIL  ${name} — ${error.message}`)
    failures += 1
  }
}
if (failures) process.exit(1)
console.log('\nAll active surfaces mounted without throwing.')
