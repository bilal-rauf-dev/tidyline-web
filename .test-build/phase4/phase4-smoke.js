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
function remainingTodayMinutes(referenceDate) {
	const minutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
	const start = 540;
	const end = 1020;
	if (minutes <= start) return 360;
	if (minutes >= end) return 0;
	return Math.round((end - minutes) / 480 * 360);
}
function availableWorkMinutes(deadline, referenceDate = /* @__PURE__ */ new Date()) {
	if (!deadline) return Number.POSITIVE_INFINITY;
	const days = daysUntil(deadline, referenceDate);
	if (days < 0) return 0;
	return remainingTodayMinutes(referenceDate) + days * 360;
}
function remainingTaskMinutes(task, tasks) {
	const expected = estimateTaskDuration(task, tasks).minutes;
	return Math.max(0, expected - (Number(task.actualMinutes) || 0));
}
function getFitAssessment(task, tasks, referenceDate = /* @__PURE__ */ new Date()) {
	if (!task.deadline || task.done) return null;
	const needed = remainingTaskMinutes(task, tasks) + 30;
	const committed = tasks.filter((other) => other.id !== task.id && !other.done && !other.archived && other.deadline && other.deadline <= task.deadline).reduce((total, other) => total + remainingTaskMinutes(other, tasks), 0);
	const available = Math.max(0, availableWorkMinutes(task.deadline, referenceDate) - committed);
	if (available < needed) return {
		level: "wont-fit",
		label: "Won't fit at your usual pace",
		available,
		needed
	};
	if (available < needed * 1.5) return {
		level: "tight",
		label: "Getting tight",
		available,
		needed
	};
	return {
		level: "comfortable",
		label: "Fits comfortably",
		available,
		needed
	};
}
function workdaysUntil(dateStr, referenceDate) {
	const cursor = startOfDay(referenceDate);
	const end = /* @__PURE__ */ new Date(`${dateStr}T00:00:00`);
	let count = 0;
	while (cursor < end) {
		cursor.setDate(cursor.getDate() + 1);
		if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
	}
	return count;
}
function concreteDistance(dateStr, referenceDate = /* @__PURE__ */ new Date()) {
	const days = daysUntil(dateStr, referenceDate);
	if (days <= 1) return days === 1 ? "tomorrow" : "today";
	if (days <= 6) return `in ${days} days`;
	if (days <= 21) {
		const workdays = workdaysUntil(dateStr, referenceDate);
		return `in ${workdays} workday${workdays === 1 ? "" : "s"}`;
	}
	return `in ${Math.ceil(days / 7)} weekends`;
}
function getTaskTimingLabel(task, tasks, referenceDate = /* @__PURE__ */ new Date()) {
	if (task.done) return "Completed";
	if (task.startedAt) return "In progress";
	const startBy = deriveStartBy(task, tasks, referenceDate);
	const resurface = task.resurfaceDate;
	const attention = minDate(startBy, resurface);
	if (!attention) return "Set a deadline when it becomes clear";
	const distance = daysUntil(attention, referenceDate);
	const resurfacingFirst = resurface && resurface === attention && (!startBy || resurface < startBy);
	if (distance <= 0) return resurfacingFirst ? "Back on your radar" : "Start now";
	return `${resurfacingFirst ? "Back" : "Start"} ${concreteDistance(attention, referenceDate)}`;
}
function getDayWorkload(tasks, dateStr, allTasks = tasks, referenceDate = /* @__PURE__ */ new Date()) {
	const active = tasks.filter((task) => !task.done && !task.archived && getTaskAttentionDate(task, allTasks, referenceDate) === dateStr);
	return {
		tasks: active,
		minutes: active.reduce((total, task) => total + remainingTaskMinutes(task, allTasks), 0)
	};
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
//#region src/utils/reminders.js
/** Stable, deterministic id — avoids randomness during state hydration. */
function reminderKey(reminder) {
	switch (reminder.kind) {
		case "relative": return `rel:${reminder.minutesBefore}`;
		case "recurring": return `rec:${reminder.rule?.freq}:${reminder.rule?.weekday ?? ""}:${reminder.time ?? ""}`;
		default: return `abs:${reminder.at}`;
	}
}
//#endregion
//#region src/utils/taskFields.js
var TASK_FIELDS = [
	"id",
	"title",
	"deadline",
	"resurfaceDate",
	"reminders",
	"tags",
	"done",
	"completedAt",
	"pinned",
	"archived",
	"recurrence",
	"notes",
	"location",
	"duration",
	"startedAt",
	"actualMinutes",
	"checklist",
	"links",
	"createdAt"
];
var DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/;
function normalizeDate(value) {
	if (typeof value !== "string" || !DATE_VALUE.test(value)) return null;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : null;
}
function normalizeDuration(value) {
	const amount = Number(value?.value);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return {
		value: amount,
		unit: value?.unit === "hr" ? "hr" : "min"
	};
}
//#endregion
//#region src/utils/taskMigration.js
var BOOT_TIME = (/* @__PURE__ */ new Date()).toISOString();
function list(value) {
	return Array.isArray(value) ? value : [];
}
function normalizeReminder(entry) {
	if (typeof entry === "string" && entry) return {
		id: `abs:${entry}`,
		kind: "absolute",
		at: entry
	};
	if (!entry || typeof entry !== "object") return null;
	const kind = [
		"absolute",
		"relative",
		"recurring"
	].includes(entry.kind) ? entry.kind : "absolute";
	const record = {
		...entry,
		kind
	};
	if (kind === "absolute" && typeof record.at !== "string") return null;
	if (kind === "relative" && !(Number(record.minutesBefore) > 0)) return null;
	if (kind === "recurring" && (!record.rule || typeof record.rule !== "object")) return null;
	return {
		...record,
		id: typeof record.id === "string" ? record.id : reminderKey(record)
	};
}
function normalizeTags(value) {
	return [...new Set(list(value).filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))];
}
function normalizeChecklist(value) {
	return list(value).filter((item) => item && typeof item.text === "string" && item.text.trim()).map((item) => ({
		id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
		text: item.text.trim(),
		done: Boolean(item.done)
	}));
}
function normalizeLinks(value) {
	return list(value).filter((item) => item && typeof item.url === "string" && item.url.trim()).map((item) => ({
		id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
		label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : item.url.trim(),
		url: item.url.trim()
	}));
}
function migrateWaiting(task, tags, notes) {
	if (task.status !== "waiting") return {
		tags,
		notes
	};
	const nextTags = tags.includes("waiting") ? tags : [...tags, "waiting"];
	const details = [typeof task.waitingFor === "string" && task.waitingFor.trim() ? `Waiting for ${task.waitingFor.trim()}.` : "Waiting.", normalizeDate(task.followUpDate) ? `Follow up ${task.followUpDate}.` : ""].filter(Boolean).join(" ");
	return {
		tags: nextTags,
		notes: notes.includes(details) ? notes : [notes, details].filter(Boolean).join("\n\n")
	};
}
function normalizeTask(value) {
	const task = value && typeof value === "object" ? value : {};
	const waiting = migrateWaiting(task, normalizeTags(task.tags), typeof task.notes === "string" ? task.notes : "");
	const links = normalizeLinks([...list(task.links), ...list(task.attachments)]);
	const deadline = normalizeDate(task.deadline);
	const candidateResurface = normalizeDate(task.resurfaceDate);
	const normalized = {
		id: typeof task.id === "string" && task.id ? task.id : crypto.randomUUID(),
		title: typeof task.title === "string" && task.title.trim() ? task.title.trim() : "Untitled task",
		deadline,
		resurfaceDate: candidateResurface && (!deadline || candidateResurface <= deadline) ? candidateResurface : null,
		reminders: list(task.reminders).map(normalizeReminder).filter(Boolean),
		tags: waiting.tags,
		done: Boolean(task.done),
		completedAt: typeof task.completedAt === "string" ? task.completedAt : null,
		pinned: Boolean(task.pinned),
		archived: Boolean(task.archived),
		recurrence: task.recurrence && typeof task.recurrence === "object" ? task.recurrence : null,
		notes: waiting.notes,
		location: typeof task.location === "string" ? task.location : "",
		duration: normalizeDuration(task.duration),
		startedAt: !task.done && typeof task.startedAt === "string" && Number.isFinite(new Date(task.startedAt).getTime()) ? task.startedAt : null,
		actualMinutes: Number.isFinite(Number(task.actualMinutes)) && Number(task.actualMinutes) > 0 ? Number(task.actualMinutes) : null,
		checklist: normalizeChecklist(task.checklist),
		links,
		createdAt: typeof task.createdAt === "string" ? task.createdAt : BOOT_TIME
	};
	return Object.fromEntries(TASK_FIELDS.map((field) => [field, normalized[field]]));
}
//#endregion
//#region scripts/phase4-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var reference = new Date(2026, 7, 21, 9, 0);
var task = (id, deadline, minutes, extra = {}) => normalizeTask({
	id,
	title: id,
	deadline,
	duration: minutes ? {
		value: minutes,
		unit: "min"
	} : null,
	...extra
});
assert(true, "Start buffer stopped being deterministic");
assert(deriveStartBy(task("short", "2026-08-21", 120), [], reference) === "2026-08-21", "Same-day start-by failed");
assert(deriveStartBy(task("long", "2026-08-24", 4320), [], reference) === "2026-08-21", "Multi-day start-by failed");
var samples = [
	task("done-a", "2026-08-10", 300, {
		done: true,
		actualMinutes: 600
	}),
	task("done-b", "2026-08-11", 300, {
		done: true,
		actualMinutes: 600
	}),
	task("done-c", "2026-08-12", 300, {
		done: true,
		actualMinutes: 600
	})
];
var calibrated = task("calibrated", "2026-08-24", 600);
assert(deriveStartBy(calibrated, [...samples, calibrated], reference) === "2026-08-23", "Calibrated duration did not move start-by earlier");
var startToday = task("start-today", "2026-08-24", 4320);
var resurfaced = task("resurfaced", "2026-10-01", 30, { resurfaceDate: "2026-08-21" });
var active = task("active", "2026-10-01", 30, { startedAt: "2026-08-21T08:00:00.000Z" });
var all = [
	startToday,
	resurfaced,
	active
];
assert(getTaskBucketForTask(startToday, all, reference) === "today", "Start-by-today task did not enter Today");
assert(getTaskBucketForTask(resurfaced, all, reference) === "today", "Resurfaced task did not enter Today");
assert(getTaskBucketForTask(active, all, reference) === "today", "Active task did not remain in Today");
assert(groupTasksByBucket(all, reference, all).today.length === 3, "Start-aware grouping lost tasks");
assert(getTaskTimingLabel(startToday, all, reference) === "Start now", "Start-now language failed");
assert(getTaskTimingLabel(resurfaced, all, reference) === "Back on your radar", "Resurface language failed");
assert(availableWorkMinutes("2026-08-21", reference) === 360, "Daily capacity calculation failed");
assert(getFitAssessment(task("comfortable", "2026-08-21", 60), [], reference).level === "comfortable", "Comfortable fit failed");
assert(getFitAssessment(task("tight", "2026-08-21", 300), [], reference).level === "tight", "Tight fit failed");
assert(getFitAssessment(task("impossible", "2026-08-21", 400), [], reference).level === "wont-fit", "Impossible fit failed");
var target = task("target", "2026-08-21", 100);
assert(getFitAssessment(target, [target, task("competing", "2026-08-21", 300)], reference).level === "wont-fit", "Earlier committed workload did not affect fit");
assert(getFitAssessment(task("undated", null, 400), [], reference) === null, "Undated task received false fit language");
assert(concreteDistance("2026-08-25", reference) === "in 4 days", "Near-future distance failed");
assert(concreteDistance("2026-09-20", reference) === "in 5 weekends", "Long-future distance failed");
var work = getDayWorkload([startToday], "2026-08-21", [startToday], reference);
assert(work.tasks.length === 1 && work.minutes === 4320, "Calibrated workload did not use canonical duration");
assert(normalizeTask({
	title: "Invalid resurface",
	deadline: "2026-08-25",
	resurfaceDate: "2026-08-26"
}).resurfaceDate === null, "Resurface date after deadline survived migration");
assert(normalizeTask({
	title: "Valid resurface",
	deadline: "2026-08-25",
	resurfaceDate: "2026-08-22"
}).resurfaceDate === "2026-08-22", "Valid resurface date was lost");
assert(normalizeTask({
	title: "Bad date",
	deadline: "2026-99-99"
}).deadline === null, "Impossible calendar date survived migration");
console.log("ok    derived start-by, fit language, workload, and resurfacing");
//#endregion
export {};
