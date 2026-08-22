/*
 * Headless mount smoke test.
 *
 * Renders the app shell and every page to a string under Node with minimal
 * browser-shaped globals. It catches render-time crashes (bad imports, undefined
 * props, null derefs) that `vite build` cannot see, without needing a browser.
 *
 * It does NOT exercise interaction, effects, layout or animation — those still
 * need a real browser.
 */

function makeStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  }
}

const noopEvents = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true
  },
}

const documentStub = {
  ...noopEvents,
  documentElement: { dataset: {}, style: { setProperty() {} } },
  visibilityState: 'visible',
  activeElement: null,
  body: {},
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, click() {}, setAttribute() {} }),
}

const locationStub = { pathname: '/', search: '', hash: '', href: 'http://localhost/' }

globalThis.localStorage = makeStorage()
globalThis.sessionStorage = makeStorage()
globalThis.document = documentStub
globalThis.location = locationStub
globalThis.history = { pushState() {}, replaceState() {}, state: null, length: 1 }
// Node 22 already defines a read-only `navigator`; it has no serviceWorker,
// which is exactly the shape the app's feature checks expect.
globalThis.window = {
  ...noopEvents,
  document: documentStub,
  location: locationStub,
  history: globalThis.history,
  localStorage: globalThis.localStorage,
  navigator: globalThis.navigator,
  matchMedia: () => ({ matches: false, ...noopEvents }),
}

const { renderToString } = await import('react-dom/server')
const { default: App } = await import('../src/App.jsx')
const { WelcomeDialog } = await import('../src/components/WelcomeDialog.jsx')
const { HomePage } = await import('../src/pages/HomePage.jsx')
const { BoardPage } = await import('../src/pages/BoardPage.jsx')
const { CalendarPage } = await import('../src/pages/CalendarPage.jsx')
const { AnalyticsPage } = await import('../src/pages/AnalyticsPage.jsx')
const { SettingsPage } = await import('../src/pages/SettingsPage.jsx')
const { PlannerPage } = await import('../src/pages/PlannerPage.jsx')
const { SomedayPage } = await import('../src/pages/SomedayPage.jsx')
const { normalizeTask } = await import('../src/hooks/useTasks.js')

// Set up a pre-configured profile for App shell tests
globalThis.localStorage.setItem('tidyline:profile', JSON.stringify({ isSetUp: true, name: 'Guest', isGuest: true }))

const today = new Date()
const iso = (offsetDays) => {
  const date = new Date(today)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

// Deliberately exercises every new field added this session, plus the legacy
// string-reminder shape that normalizeTask has to migrate.
const tasks = [
  normalizeTask({
    id: 'a',
    title: 'Recurring weekly report',
    deadline: iso(3),
    reminders: ['2026-01-01T09:00'],
    tags: ['work', 'urgent'],
    recurrence: { freq: 'weekly', weekday: 1 },
    notes: 'draft first',
    location: 'Room 4',
    duration: { value: 90, unit: 'min' },
    checklist: [
      { id: 'c1', text: 'gather', done: true },
      { id: 'c2', text: 'write', done: false },
    ],
    links: [{ id: 'l1', label: 'Spec', url: 'https://example.com' }],
    attachments: [{ id: 'f1', label: 'Deck', url: 'https://example.com/deck' }],
    createdAt: new Date(today.getTime() - 20 * 86400000).toISOString(),
  }),
  normalizeTask({ id: 'b', title: 'Overdue by a day', deadline: iso(-1) }),
  normalizeTask({ id: 'c', title: 'Overdue by a week', deadline: iso(-9) }),
  normalizeTask({
    id: 'd',
    title: 'Done today',
    deadline: iso(0),
    done: true,
    completedAt: new Date().toISOString(),
  }),
  normalizeTask({ id: 'e', title: 'Archived item', deadline: iso(5), archived: true }),
  normalizeTask({ id: 'f', title: 'Far future', deadline: iso(400) }),
  normalizeTask({
    id: 'g',
    title: 'Scheduled focus block',
    deadline: iso(2),
    scheduledStart: `${iso(0)}T10:00`,
    duration: { value: 45, unit: 'min' },
  }),
  normalizeTask({ id: 'h', title: 'Maybe learn pottery', deadline: null, notes: 'Find a class' }),
]

const noop = () => {}
const taskActions = new Proxy({}, { get: () => noop })

const appearance = {
  theme: 'light',
  toggleTheme: noop,
  accent: '#ff5a36',
  setAccent: noop,
  density: 'comfortable',
  setDensity: noop,
}

// Each case asserts markers that prove the feature actually rendered, not
// just that the component returned something.
const cases = [
  ['App shell', <App />, ['Open navigation', 'TidyLine', 'app-layout']],
  [
    'WelcomeDialog',
    <WelcomeDialog
      onImportTasks={noop}
      onComplete={noop}
      onGoogleSignIn={noop}
    />,
    ['Make this space yours', 'Sign in with Google', 'Start as guest', 'Import JSON'],
  ],
  [
    'HomePage',
    <HomePage tasks={tasks} />,
    ['Today at a glance', 'overdue', 'completed today', 'milestone-track', 'activity-dot'],
  ],
  [
    'BoardPage',
    <BoardPage
      tasks={tasks}
      addTask={noop}
      moveTaskToBucket={noop}
      bulkComplete={noop}
      bulkArchive={noop}
      bulkDelete={noop}
      undoState={{ message: 'Task deleted' }}
      undo={noop}
      dismissUndo={noop}
      {...taskActions}
    />,
    [
      'Overdue',
      'A week or more',
      'countdown',
      'distance-rail',
      'bucket-progress',
      'days overdue',
      'undo-toast',
      'data-task-id',
    ],
  ],
  [
    'CalendarPage',
    <CalendarPage tasks={tasks} addTask={noop} setDeadline={noop} />,
    ['calendar-grid', 'calendar-day', 'calendar-day-workload'],
  ],
  [
    'AnalyticsPage',
    <AnalyticsPage tasks={tasks} />,
    ['milestone-track', 'ring-tile', 'trend-col', 'sparkline', 'activity-dot', 'Postpone patterns'],
  ],
  [
    'PlannerPage',
    <PlannerPage tasks={tasks} setScheduledStart={noop} updateTask={noop} />,
    ['Day planner', 'Board tasks', 'planner-timeline', 'Scheduled focus block'],
  ],
  [
    'SomedayPage',
    <SomedayPage
      tasks={tasks}
      addSomedayTask={noop}
      promoteSomeday={noop}
      deleteTask={noop}
      updateTask={noop}
    />,
    ['Someday / Maybe', 'Holding area', 'Maybe learn pottery'],
  ],
  [
    'SettingsPage',
    <SettingsPage tasks={tasks} appearance={appearance} importTasks={noop} clearCompleted={noop} />,
    ['Accent colour', 'accent-swatch', 'Density', 'Reminder sound'],
  ],
]

let failures = 0

for (const [name, element, markers = []] of cases) {
  try {
    const html = renderToString(element)

    if (!html || html.length < 80) {
      console.error(`FAIL  ${name} — rendered ${html.length} chars (suspiciously empty)`)
      failures += 1
      continue
    }

    const missing = markers.filter((marker) => !html.includes(marker))

    if (missing.length > 0) {
      console.error(`FAIL  ${name} — missing markers: ${missing.join(', ')}`)
      failures += 1
      continue
    }

    console.log(`ok    ${name} — ${html.length} chars, ${markers.length} markers`)
  } catch (error) {
    console.error(`FAIL  ${name} — ${error.message}`)
    failures += 1
  }
}

if (failures > 0) {
  console.error(`\n${failures} smoke failure(s)`)
  process.exit(1)
}

console.log('\nAll pages mounted without throwing.')
process.exit(0)
