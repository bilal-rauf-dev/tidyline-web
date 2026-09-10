//#region src/utils/calendar.js
function toDateStr(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
//#endregion
//#region src/utils/dates.js
var DAY_MS = 864e5;
function startOfDay(date = /* @__PURE__ */ new Date()) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
/**
* The single date-diff implementation in the app. Whole days from the
* reference day to a deadline; negative means the date has passed. Bucketing
* and derived attention language both use this implementation.
*/
function daysUntil(deadline, referenceDate = /* @__PURE__ */ new Date()) {
	const from = startOfDay(referenceDate);
	const to = /* @__PURE__ */ new Date(`${deadline}T00:00:00`);
	return Math.round((to - from) / DAY_MS);
}
var MIN_MULTIPLIER = .5;
function durationToMinutes(duration) {
	const value = Number(duration?.value);
	if (!Number.isFinite(value) || value <= 0) return null;
	return value * (duration?.unit === "hr" ? 60 : 1);
}
function median(values) {
	const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
	if (!sorted.length) return null;
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function validActual(task) {
	const value = Number(task.actualMinutes);
	return task.done && Number.isFinite(value) && value > 0 && value <= 10080 ? value : null;
}
function getCalibration(tasks, minimumSamples = 3) {
	const ratios = tasks.flatMap((task) => {
		const estimate = durationToMinutes(task.duration);
		const actual = validActual(task);
		return estimate && actual ? [actual / estimate] : [];
	});
	const rawMultiplier = median(ratios);
	const calibrated = ratios.length >= minimumSamples && rawMultiplier !== null;
	return {
		multiplier: calibrated ? Math.min(4, Math.max(MIN_MULTIPLIER, rawMultiplier)) : 1,
		sampleCount: ratios.length,
		calibrated
	};
}
function roundedMinutes(value) {
	return Math.max(5, Math.round(value / 5) * 5);
}
function estimateTaskDuration(task, tasks) {
	const explicit = durationToMinutes(task.duration);
	const calibration = getCalibration(tasks);
	if (explicit) return {
		minutes: roundedMinutes(explicit * calibration.multiplier),
		source: calibration.calibrated ? "calibrated" : "estimate",
		estimateMinutes: explicit,
		...calibration
	};
	const historical = median(tasks.map(validActual).filter((value) => value !== null));
	if (historical !== null) return {
		minutes: roundedMinutes(historical),
		source: "history",
		estimateMinutes: null,
		...calibration
	};
	return {
		minutes: 45,
		source: "fallback",
		estimateMinutes: null,
		...calibration
	};
}
var WORKDAY_END_HOUR = 17;
function planningDeadline(deadline) {
	const date = /* @__PURE__ */ new Date(`${deadline}T00:00:00`);
	date.setHours(WORKDAY_END_HOUR, 0, 0, 0);
	return date;
}
function deriveStartBy(task, tasks, referenceDate = /* @__PURE__ */ new Date()) {
	if (!task.deadline || task.done) return null;
	if (task.startedAt) return toDateStr(referenceDate);
	const expected = estimateTaskDuration(task, tasks).minutes;
	const start = planningDeadline(task.deadline);
	start.setMinutes(start.getMinutes() - expected - 30);
	return toDateStr(start);
}
function minDate(...values) {
	return values.filter(Boolean).sort()[0] ?? null;
}
function getTaskAttentionDate(task, tasks, referenceDate = /* @__PURE__ */ new Date()) {
	if (task.done) return task.deadline;
	if (task.startedAt) return toDateStr(referenceDate);
	return minDate(deriveStartBy(task, tasks, referenceDate), task.resurfaceDate);
}
//#endregion
//#region src/utils/buckets.js
var BUCKET_ORDER = [
	"today",
	"week",
	"month",
	"later"
];
var BUCKET_END_DAYS = {
	today: 0,
	week: 7,
	month: 30,
	later: Number.POSITIVE_INFINITY
};
var BUCKET_START_DAYS = {
	today: 0,
	week: 1,
	month: 8,
	later: 31
};
function deadlineForBucket(bucketKey, referenceDate = /* @__PURE__ */ new Date()) {
	const offset = BUCKET_START_DAYS[bucketKey] ?? BUCKET_START_DAYS.later;
	return toDateStr(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + offset));
}
function getTaskBucket(deadline, referenceDate = /* @__PURE__ */ new Date()) {
	if (!deadline) return "later";
	const distance = daysUntil(deadline, referenceDate);
	if (distance <= 0) return "today";
	if (distance <= BUCKET_END_DAYS.week) return "week";
	if (distance <= BUCKET_END_DAYS.month) return "month";
	return "later";
}
function getTaskBucketForTask(task, tasks, referenceDate = /* @__PURE__ */ new Date()) {
	return getTaskBucket(getTaskAttentionDate(task, tasks, referenceDate) ?? task.deadline, referenceDate);
}
var byDeadline = (a, b) => {
	if (!a.deadline && !b.deadline) return a.createdAt.localeCompare(b.createdAt);
	if (!a.deadline) return 1;
	if (!b.deadline) return -1;
	return a.deadline.localeCompare(b.deadline);
};
function groupTasksByBucket(tasks, referenceDate = /* @__PURE__ */ new Date(), allTasks = tasks) {
	const grouped = Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, []]));
	tasks.forEach((task) => {
		grouped[getTaskBucketForTask(task, allTasks, referenceDate)].push(task);
	});
	BUCKET_ORDER.forEach((bucket) => {
		grouped[bucket].sort((a, b) => {
			if (Boolean(a.pinned) !== Boolean(b.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
			if (a.done !== b.done) return Number(a.done) - Number(b.done);
			const aAttention = getTaskAttentionDate(a, allTasks, referenceDate);
			const bAttention = getTaskAttentionDate(b, allTasks, referenceDate);
			if (aAttention && bAttention && aAttention !== bAttention) return aAttention.localeCompare(bAttention);
			if (aAttention && !bAttention) return -1;
			if (!aAttention && bAttention) return 1;
			return byDeadline(a, b);
		});
	});
	return grouped;
}
//#endregion
//#region src/utils/filters.js
var DEFAULT_FILTERS = { query: "" };
function filterTasks(tasks, filters = DEFAULT_FILTERS) {
	const query = String(filters.query ?? "").trim().toLowerCase();
	if (!query) return tasks;
	return tasks.filter((task) => [
		task.title,
		task.notes,
		task.location,
		...task.tags ?? []
	].join(" ").toLowerCase().includes(query));
}
//#endregion
//#region scripts/phase1-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var now = new Date(2026, 7, 4);
var task = (id, deadline, extra = {}) => ({
	id,
	title: id,
	deadline,
	createdAt: "2026-08-01T00:00:00.000Z",
	done: false,
	pinned: false,
	...extra
});
assert(getTaskBucket("2026-08-04", now) === "today", "Today boundary failed");
assert(getTaskBucket("2026-08-11", now) === "week", "Seven-day boundary failed");
assert(getTaskBucket("2026-08-12", now) === "month", "Month lower boundary failed");
assert(getTaskBucket("2026-09-03", now) === "month", "Thirty-day boundary failed");
assert(getTaskBucket("2026-09-04", now) === "later", "Later boundary failed");
assert(getTaskBucket(null, now) === "later", "Deadline-free tasks must remain accessible in Later");
assert(deadlineForBucket("today", now) === "2026-08-04", "Today drag target changed");
assert(deadlineForBucket("week", now) === "2026-08-05", "This Week drag target changed");
assert(deadlineForBucket("month", now) === "2026-08-12", "This Month drag target changed");
assert(deadlineForBucket("later", now) === "2026-09-04", "Later drag target changed");
var grouped = groupTasksByBucket([
	task("later", null),
	task("done", "2026-08-04", { done: true }),
	task("open", "2026-08-04"),
	task("pinned", "2026-08-04", { pinned: true })
], now);
assert(grouped.today.map(({ id }) => id).join(",") === "pinned,open,done", "Bucket sorting changed");
assert(grouped.later[0].id === "later", "Later task was lost");
var searchable = [{
	title: "Write report",
	notes: "",
	location: "",
	tags: ["work"]
}, {
	title: "Buy milk",
	notes: "oat",
	location: "Market",
	tags: []
}];
assert(filterTasks(searchable, {
	...DEFAULT_FILTERS,
	query: "market"
}).length === 1, "Search omitted location");
assert(filterTasks(searchable, { query: "WORK" })[0]?.title === "Write report", "Search omitted tags");
console.log("ok    fixed horizon buckets and simple search");
//#endregion
export {};
