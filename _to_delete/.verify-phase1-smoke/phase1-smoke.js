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
* reference day to a deadline; negative means overdue. Bucketing, countdown
* labels and overdue grouping all derive from this one function.
*/
function daysUntil(deadline, referenceDate = /* @__PURE__ */ new Date()) {
	const from = startOfDay(referenceDate);
	const to = /* @__PURE__ */ new Date(`${deadline}T00:00:00`);
	return Math.round((to - from) / DAY_MS);
}
var ENERGY_LEVELS = new Set([
	{
		value: "",
		label: "Unset"
	},
	{
		value: "low",
		label: "Low"
	},
	{
		value: "normal",
		label: "Normal"
	},
	{
		value: "deep-focus",
		label: "Deep focus"
	}
].map((option) => option.value).filter(Boolean));
var DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/;
function normalizeEnergyLevel(value) {
	return ENERGY_LEVELS.has(value) ? value : null;
}
function validateStartDate(startDate, deadline) {
	if (!startDate) return "";
	if (!deadline) return "Choose a deadline before adding a start date.";
	if (startDate <= deadline) return "";
	return "Start date cannot be after the deadline.";
}
function applyTaskUpdates(task, updates, source = "edit", at = (/* @__PURE__ */ new Date()).toISOString()) {
	const deadline = updates.deadline ?? task.deadline;
	const startDate = updates.startDate === void 0 ? task.startDate : updates.startDate || null;
	if (validateStartDate(startDate, deadline)) return task;
	const next = {
		...task,
		...updates,
		startDate,
		energyLevel: updates.energyLevel === void 0 ? task.energyLevel : normalizeEnergyLevel(updates.energyLevel)
	};
	if (updates.deadline && task.deadline && updates.deadline > task.deadline) next.postponeHistory = [...task.postponeHistory ?? [], {
		from: task.deadline,
		to: updates.deadline,
		at,
		source
	}];
	return next;
}
function isTaskUpcoming(task, referenceDate = /* @__PURE__ */ new Date()) {
	return Boolean(task.startDate && task.startDate > toDateStr(referenceDate));
}
function isTaskPlannedForToday(task, referenceDate = /* @__PURE__ */ new Date()) {
	return task.plannedDate === toDateStr(referenceDate);
}
function shiftStartDateForDeadline(startDate, currentDeadline, nextDeadline) {
	if (!startDate || !currentDeadline || !nextDeadline) return null;
	const leadDays = Math.max(0, daysUntil(currentDeadline, /* @__PURE__ */ new Date(`${startDate}T00:00:00`)));
	const shifted = /* @__PURE__ */ new Date(`${nextDeadline}T00:00:00`);
	shifted.setDate(shifted.getDate() - leadDays);
	return toDateStr(shifted);
}
function normalizePostponeHistory(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((entry) => entry && DATE_VALUE.test(entry.from ?? "") && DATE_VALUE.test(entry.to ?? "") && entry.to > entry.from).map((entry) => ({
		from: entry.from,
		to: entry.to,
		at: typeof entry.at === "string" ? entry.at : (/* @__PURE__ */ new Date()).toISOString(),
		source: entry.source === "drag" || entry.source === "calendar" ? entry.source : "edit"
	}));
}
function getPostponeSummary(task) {
	const history = normalizePostponeHistory(task.postponeHistory);
	return {
		count: history.length,
		originalDeadline: task.originalDeadline ?? history[0]?.from ?? task.deadline
	};
}
//#endregion
//#region src/utils/buckets.js
var BUCKET_ORDER = [
	"today",
	"week",
	"twoWeeks",
	"month",
	"quarter",
	"year",
	"later"
];
var REQUIRED_BUCKETS = ["today", "later"];
var BUCKET_END_DAYS = {
	today: 0,
	week: 7,
	twoWeeks: 14,
	month: 30,
	quarter: 90,
	year: 365,
	later: Number.POSITIVE_INFINITY
};
function normalizeBucketOrder(bucketOrder = BUCKET_ORDER) {
	const requested = new Set(Array.isArray(bucketOrder) ? bucketOrder : []);
	REQUIRED_BUCKETS.forEach((bucket) => requested.add(bucket));
	return BUCKET_ORDER.filter((bucket) => requested.has(bucket));
}
function getTaskBucket(deadline, referenceDate = /* @__PURE__ */ new Date(), bucketOrder = BUCKET_ORDER) {
	const daysUntilDeadline = daysUntil(deadline, referenceDate);
	const activeBuckets = normalizeBucketOrder(bucketOrder);
	if (daysUntilDeadline <= 0) return "today";
	return activeBuckets.find((bucket) => bucket !== "today" && daysUntilDeadline <= BUCKET_END_DAYS[bucket]) ?? "later";
}
var byDeadline = (a, b) => a.deadline.localeCompare(b.deadline);
/**
* Group tasks into buckets. Within a bucket the order is always
* pinned first, then not-done before done, then the supplied comparator.
*/
function groupTasksByBucket(tasks, referenceDate = /* @__PURE__ */ new Date(), comparator = byDeadline, bucketOrder = BUCKET_ORDER, { includeUpcoming = false } = {}) {
	const activeBuckets = normalizeBucketOrder(bucketOrder);
	const grouped = Object.fromEntries(activeBuckets.map((bucket) => [bucket, []]));
	tasks.forEach((task) => {
		if (!task.deadline) return;
		if (!includeUpcoming && isTaskUpcoming(task, referenceDate)) return;
		const bucket = isTaskPlannedForToday(task, referenceDate) ? "today" : getTaskBucket(task.deadline, referenceDate, activeBuckets);
		grouped[bucket].push(task);
	});
	activeBuckets.forEach((bucket) => {
		grouped[bucket].sort((a, b) => {
			if (Boolean(a.pinned) !== Boolean(b.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
			if (a.done !== b.done) return Number(a.done) - Number(b.done);
			return comparator(a, b);
		});
	});
	return grouped;
}
//#endregion
//#region src/utils/filters.js
var DEFAULT_FILTERS = {
	query: "",
	tag: "all",
	status: "all",
	energyLevel: "all",
	durationMin: "",
	durationMax: "",
	pinnedOnly: false,
	dateFrom: "",
	dateTo: "",
	sortBy: "deadline",
	sortDir: "asc"
};
function matchesStatus(task, status, todayStr) {
	switch (status) {
		case "active": return !task.done && task.status !== "waiting";
		case "waiting": return !task.done && task.status === "waiting";
		case "completed": return task.done;
		case "overdue": return !task.done && task.status !== "waiting" && task.deadline < todayStr && !(task.startDate && task.startDate > todayStr) && task.plannedDate !== todayStr;
		case "upcoming": return !task.done && Boolean(task.startDate && task.startDate > todayStr);
		default: return true;
	}
}
function filterTasks(tasks, filters) {
	const todayStr = toDateStr(/* @__PURE__ */ new Date());
	const query = filters.query.trim().toLowerCase();
	return tasks.filter((task) => {
		if (!matchesStatus(task, filters.status, todayStr)) return false;
		if (filters.tag !== "all" && !(task.tags ?? []).includes(filters.tag)) return false;
		if (filters.energyLevel !== "all" && (filters.energyLevel === "unset" ? Boolean(task.energyLevel) : task.energyLevel !== filters.energyLevel)) return false;
		if (filters.pinnedOnly && !task.pinned) return false;
		if (filters.dateFrom && task.deadline < filters.dateFrom) return false;
		if (filters.dateTo && task.deadline > filters.dateTo) return false;
		const durationMinutes = task.duration ? task.duration.unit === "hr" ? task.duration.value * 60 : task.duration.value : 0;
		if (filters.durationMin !== "" && durationMinutes < Number(filters.durationMin)) return false;
		if (filters.durationMax !== "" && durationMinutes > Number(filters.durationMax)) return false;
		if (!query) return true;
		return [
			task.title,
			task.waitingFor,
			...task.tags ?? []
		].join(" ").toLowerCase().includes(query);
	});
}
//#endregion
//#region src/utils/overdue.js
function isOverdue(task, referenceDate = /* @__PURE__ */ new Date()) {
	return !task.done && !task.archived && Boolean(task.deadline) && task.status !== "waiting" && !isTaskUpcoming(task, referenceDate) && !isTaskPlannedForToday(task, referenceDate) && daysUntil(task.deadline, referenceDate) < 0;
}
//#endregion
//#region scripts/phase1-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var now = new Date(2026, 7, 4);
var base = {
	done: false,
	archived: false,
	pinned: false,
	energyLevel: null,
	postponeHistory: []
};
var tasks = [
	{
		...base,
		id: "future",
		deadline: "2026-08-20",
		startDate: "2026-08-10",
		plannedDate: null
	},
	{
		...base,
		id: "available",
		deadline: "2026-08-06",
		startDate: "2026-08-04",
		plannedDate: null
	},
	{
		...base,
		id: "planned",
		deadline: "2026-09-01",
		startDate: null,
		plannedDate: "2026-08-04"
	},
	{
		...base,
		id: "stale",
		deadline: "2026-08-06",
		startDate: null,
		plannedDate: "2026-08-03"
	}
];
var grouped = groupTasksByBucket(tasks, now);
var groupedIds = Object.fromEntries(Object.entries(grouped).map(([bucket, list]) => [bucket, list.map((task) => task.id)]));
assert(!Object.values(groupedIds).flat().includes("future"), "Future-start task leaked into deadline buckets");
assert(groupedIds.week.includes("available"), "Task did not activate on its start date");
assert(groupedIds.today.includes("planned"), "Planned task did not enter Today");
assert(groupedIds.week.includes("stale"), "Stale plan did not revert to deadline bucketing");
var archivedGrouping = groupTasksByBucket(tasks, now, void 0, void 0, { includeUpcoming: true });
assert(Object.values(archivedGrouping).flat().some((task) => task.id === "future"), "Archive grouping hid a future-start task");
assert(!isOverdue({
	...base,
	deadline: "2026-08-01",
	plannedDate: "2026-08-04"
}, now), "A task planned for today was also marked overdue");
assert(Boolean(validateStartDate("2026-08-05", "2026-08-04")), "Start-after-deadline validation did not block the invalid range");
var energyTasks = [{
	...tasks[1],
	id: "low",
	energyLevel: "low",
	title: "Low"
}, {
	...tasks[1],
	id: "unset",
	energyLevel: null,
	title: "Unset"
}];
assert(filterTasks(energyTasks, {
	...DEFAULT_FILTERS,
	energyLevel: "low"
})[0]?.id === "low", "Low-energy filter did not perform an exact match");
assert(filterTasks(energyTasks, {
	...DEFAULT_FILTERS,
	energyLevel: "unset"
})[0]?.id === "unset", "Unset-energy filter did not isolate tasks without a value");
var historyBase = {
	...base,
	id: "history",
	deadline: "2026-08-05",
	originalDeadline: "2026-08-10",
	startDate: null
};
var postponed = applyTaskUpdates(historyBase, { deadline: "2026-08-08" }, "drag", "2026-08-04T12:00:00.000Z");
assert(postponed.postponeHistory.length === 1, "Later deadline did not append history");
assert(postponed.postponeHistory[0].source === "drag", "Postponement source was not preserved");
assert(getPostponeSummary(postponed).originalDeadline === "2026-08-10", "Earlier edits erased the task instance original deadline");
assert(applyTaskUpdates(historyBase, { deadline: "2026-08-04" }).postponeHistory.length === 0, "Earlier deadline incorrectly counted as a postponement");
assert(applyTaskUpdates({
	...historyBase,
	startDate: "2026-08-05"
}, { deadline: "2026-08-04" }).deadline === "2026-08-05", "Invalid deadline update bypassed start-date validation");
assert(shiftStartDateForDeadline("2026-08-02", "2026-08-05", "2026-08-12") === "2026-08-09", "Recurring instance did not preserve its start-to-deadline lead time");
console.log("ok    Phase 1 task date, energy, planning, and postponement rules");
//#endregion
export {};
