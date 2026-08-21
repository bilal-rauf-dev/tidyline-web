import { deadlineForBucket, getTaskBucket, groupTasksByBucket } from '../src/utils/buckets'
import { DEFAULT_FILTERS, filterTasks } from '../src/utils/filters'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const now = new Date(2026, 7, 4)
const task = (id, deadline, extra = {}) => ({
  id, title: id, deadline, createdAt: '2026-08-01T00:00:00.000Z', done: false, pinned: false, ...extra,
})

assert(getTaskBucket('2026-08-04', now) === 'today', 'Today boundary failed')
assert(getTaskBucket('2026-08-11', now) === 'week', 'Seven-day boundary failed')
assert(getTaskBucket('2026-08-12', now) === 'month', 'Month lower boundary failed')
assert(getTaskBucket('2026-09-03', now) === 'month', 'Thirty-day boundary failed')
assert(getTaskBucket('2026-09-04', now) === 'later', 'Later boundary failed')
assert(getTaskBucket(null, now) === 'later', 'Deadline-free tasks must remain accessible in Later')
assert(deadlineForBucket('today', now) === '2026-08-04', 'Today drag target changed')
assert(deadlineForBucket('week', now) === '2026-08-05', 'This Week drag target changed')
assert(deadlineForBucket('month', now) === '2026-08-12', 'This Month drag target changed')
assert(deadlineForBucket('later', now) === '2026-09-04', 'Later drag target changed')

const grouped = groupTasksByBucket([
  task('later', null), task('done', '2026-08-04', { done: true }),
  task('open', '2026-08-04'), task('pinned', '2026-08-04', { pinned: true }),
], now)
assert(grouped.today.map(({ id }) => id).join(',') === 'pinned,open,done', 'Bucket sorting changed')
assert(grouped.later[0].id === 'later', 'Later task was lost')

const searchable = [
  { title: 'Write report', notes: '', location: '', tags: ['work'] },
  { title: 'Buy milk', notes: 'oat', location: 'Market', tags: [] },
]
assert(filterTasks(searchable, { ...DEFAULT_FILTERS, query: 'market' }).length === 1, 'Search omitted location')
assert(filterTasks(searchable, { query: 'WORK' })[0]?.title === 'Write report', 'Search omitted tags')

console.log('ok    fixed horizon buckets and simple search')
