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
//#endregion
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
//#endregion
//#region src/utils/nowSelection.js
function fitOrder(task, tasks, referenceDate) {
	return {
		"wont-fit": 0,
		tight: 1,
		comfortable: 2
	}[getFitAssessment(task, tasks, referenceDate)?.level] ?? 3;
}
function attentionOrder(task, tasks, referenceDate) {
	if (task.startedAt) return 0;
	const startBy = deriveStartBy(task, tasks, referenceDate);
	const attention = getTaskAttentionDate(task, tasks, referenceDate);
	if (startBy && daysUntil(startBy, referenceDate) < 0) return 1;
	if (attention && daysUntil(attention, referenceDate) <= 0) return 2;
	if (task.deadline && daysUntil(task.deadline, referenceDate) <= 0) return 3;
	if (attention) return 4;
	return 5;
}
function remainingMinutes(task, tasks) {
	return Math.max(0, estimateTaskDuration(task, tasks).minutes - (Number(task.actualMinutes) || 0));
}
function compareValues(a, b) {
	for (let index = 0; index < a.length; index += 1) {
		if (a[index] < b[index]) return -1;
		if (a[index] > b[index]) return 1;
	}
	return 0;
}
function rankNowTasks(tasks, referenceDate = /* @__PURE__ */ new Date()) {
	return [...tasks.filter((task) => !task.done && !task.archived)].sort((a, b) => compareValues([
		attentionOrder(a, tasks, referenceDate),
		getTaskAttentionDate(a, tasks, referenceDate) ?? "9999-12-31",
		a.deadline ?? "9999-12-31",
		fitOrder(a, tasks, referenceDate),
		remainingMinutes(a, tasks),
		a.createdAt,
		a.id
	], [
		attentionOrder(b, tasks, referenceDate),
		getTaskAttentionDate(b, tasks, referenceDate) ?? "9999-12-31",
		b.deadline ?? "9999-12-31",
		fitOrder(b, tasks, referenceDate),
		remainingMinutes(b, tasks),
		b.createdAt,
		b.id
	]));
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
//#region scripts/phase8-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var reference = new Date(2026, 7, 26, 14, 0);
var samples = [
	{
		id: "sample-1",
		title: "Sample 1",
		done: true,
		duration: {
			value: 30,
			unit: "min"
		},
		actualMinutes: 60
	},
	{
		id: "sample-2",
		title: "Sample 2",
		done: true,
		duration: {
			value: 60,
			unit: "min"
		},
		actualMinutes: 120
	},
	{
		id: "sample-3",
		title: "Sample 3",
		done: true,
		duration: {
			value: 45,
			unit: "min"
		},
		actualMinutes: 90
	}
].map(normalizeTask);
var calibration = getCalibration(samples);
assert(calibration.calibrated && calibration.multiplier === 2, "Personal calibration did not stabilize at the median");
var focusTask = normalizeTask({
	id: "focus",
	title: "Start the long assignment",
	deadline: "2026-08-28",
	duration: {
		value: 1440,
		unit: "min"
	}
});
var startBy = deriveStartBy(focusTask, [...samples, focusTask], reference);
assert(startBy && getTaskAttentionDate(focusTask, [...samples, focusTask], reference) === startBy, "Calibrated start timing was not derived");
assert(!("startBy" in focusTask), "Derived start timing leaked into persisted task data");
assert(rankNowTasks([focusTask], reference)[0].id === "focus", "Start-aware task was not eligible for Now");
var malformedLegacy = normalizeTask({
	id: "legacy",
	title: "Keep this task",
	deadline: "2026-08-30",
	checklist: [
		{
			text: "Keep",
			done: false
		},
		null,
		{ invalid: true }
	],
	links: [{ url: "https://example.com" }, { bad: true }],
	reminders: [{
		kind: "relative",
		minutesBefore: 30
	}, {
		kind: "relative",
		minutesBefore: -1
	}],
	status: "waiting",
	priority: "high",
	energyLevel: "deep-focus"
});
assert(malformedLegacy.title === "Keep this task", "Legacy task was lost during normalization");
assert(malformedLegacy.checklist.length === 1 && malformedLegacy.links.length === 1, "Malformed nested records were not filtered independently");
assert(Object.keys(malformedLegacy).every((key) => TASK_FIELDS.includes(key)), "Removed task fields leaked through final migration");
console.log("ok    final calibrated-start scenario, task boundary, and malformed-data audit");
//#endregion
export {};
