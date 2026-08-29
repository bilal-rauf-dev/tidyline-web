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
function formatMinutes(minutes) {
	const total = Math.max(0, Math.round(Number(minutes) || 0));
	const hours = Math.floor(total / 60);
	const remainder = total % 60;
	if (!hours) return `${remainder}m`;
	if (!remainder) return `${hours}h`;
	return `${hours}h ${remainder}m`;
}
//#endregion
//#region src/utils/calendar.js
function toDateStr(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function startOfDay(date = /* @__PURE__ */ new Date()) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
/** Concrete instant a date-only deadline is considered due. */
function deadlineMoment(deadline) {
	const at = /* @__PURE__ */ new Date(`${deadline}T00:00:00`);
	at.setHours(9, 0, 0, 0);
	return at;
}
//#endregion
//#region src/utils/recurrence.js
function lastDayOfMonth(year, monthIndex) {
	return new Date(year, monthIndex + 1, 0).getDate();
}
/** Add months without rolling over (Jan 31 + 1 month => Feb 28/29). */
function addMonthsClamped(date, months) {
	const target = new Date(date);
	const day = target.getDate();
	target.setDate(1);
	target.setMonth(target.getMonth() + months);
	target.setDate(Math.min(day, lastDayOfMonth(target.getFullYear(), target.getMonth())));
	return target;
}
/** Next date strictly after `fromDateStr` that satisfies the rule. */
function nextOccurrence(recurrence, fromDateStr) {
	if (!recurrence) return null;
	const base = /* @__PURE__ */ new Date(`${fromDateStr}T00:00:00`);
	if (Number.isNaN(base.getTime())) return null;
	switch (recurrence.freq) {
		case "daily":
			base.setDate(base.getDate() + 1);
			return toDateStr(base);
		case "everyNDays":
			base.setDate(base.getDate() + Math.max(1, recurrence.n ?? 2));
			return toDateStr(base);
		case "weekdays":
			do
				base.setDate(base.getDate() + 1);
			while (base.getDay() === 0 || base.getDay() === 6);
			return toDateStr(base);
		case "weekly": {
			const target = recurrence.weekday ?? base.getDay();
			do
				base.setDate(base.getDate() + 1);
			while (base.getDay() !== target);
			return toDateStr(base);
		}
		case "monthly": return toDateStr(addMonthsClamped(base, 1));
		case "yearly": return toDateStr(addMonthsClamped(base, 12));
		default: return null;
	}
}
/** Does a given Date fall on the recurrence? Used for recurring reminders. */
function matchesRecurrence(date, recurrence, anchorDateStr) {
	if (!recurrence) return false;
	const anchor = anchorDateStr ? /* @__PURE__ */ new Date(`${anchorDateStr}T00:00:00`) : null;
	switch (recurrence.freq) {
		case "daily": return true;
		case "weekdays": return date.getDay() >= 1 && date.getDay() <= 5;
		case "weekly": return date.getDay() === (recurrence.weekday ?? 1);
		case "monthly": return anchor ? date.getDate() === anchor.getDate() : false;
		case "yearly": return anchor ? date.getDate() === anchor.getDate() && date.getMonth() === anchor.getMonth() : false;
		case "everyNDays": {
			if (!anchor) return false;
			const step = Math.max(1, recurrence.n ?? 2);
			const days = Math.round((date - anchor) / 864e5);
			return days >= 0 && days % step === 0;
		}
		default: return false;
	}
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
function resolveRelative(reminder, task) {
	const due = deadlineMoment(task.deadline);
	return /* @__PURE__ */ new Date(due.getTime() - reminder.minutesBefore * 6e4);
}
/**
* Concrete instants a reminder should fire at inside (windowStart, windowEnd].
* Relative reminders are resolved here — at check time — so that editing the
* deadline moves the reminder with it.
*/
function reminderInstances(task, reminder, windowStart, windowEnd) {
	if (reminder.kind === "absolute") {
		const at = new Date(reminder.at).getTime();
		return Number.isNaN(at) ? [] : [{
			key: `${task.id}:${reminder.id}:${at}`,
			at
		}];
	}
	if (reminder.kind === "relative") {
		const at = resolveRelative(reminder, task).getTime();
		return Number.isNaN(at) ? [] : [{
			key: `${task.id}:${reminder.id}:${at}`,
			at
		}];
	}
	if (reminder.kind === "recurring") {
		const [hour, minute] = String(reminder.time ?? "09:00").split(":").map(Number);
		const results = [];
		const cursor = startOfDay(new Date(windowStart));
		const limit = new Date(windowEnd);
		for (let guard = 0; guard < 400 && cursor <= limit; guard += 1) {
			if (matchesRecurrence(cursor, reminder.rule, task.createdAt?.slice(0, 10))) {
				const at = new Date(cursor);
				at.setHours(hour || 0, minute || 0, 0, 0);
				results.push({
					key: `${task.id}:${reminder.id}:${at.getTime()}`,
					at: at.getTime()
				});
			}
			cursor.setDate(cursor.getDate() + 1);
		}
		return results;
	}
	return [];
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
//#region src/utils/taskTiming.js
var MINUTE_MS = 6e4;
function validTimestamp(value) {
	if (typeof value !== "string" || !value) return null;
	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}
function elapsedMinutes(startedAt, endedAt = (/* @__PURE__ */ new Date()).toISOString()) {
	const start = validTimestamp(startedAt);
	const end = validTimestamp(endedAt);
	if (start === null || end === null || end <= start) return 0;
	return Math.max(1, Math.round((end - start) / MINUTE_MS));
}
function startTiming(task, at = (/* @__PURE__ */ new Date()).toISOString()) {
	if (task.done || task.archived || task.startedAt || validTimestamp(at) === null) return task;
	return {
		...task,
		startedAt: at
	};
}
function pauseTiming(task, at = (/* @__PURE__ */ new Date()).toISOString()) {
	if (!task.startedAt) return task;
	const elapsed = elapsedMinutes(task.startedAt, at);
	return {
		...task,
		startedAt: null,
		actualMinutes: Math.max(0, Number(task.actualMinutes) || 0) + elapsed || null
	};
}
function completeTiming(task, at = (/* @__PURE__ */ new Date()).toISOString()) {
	return {
		...pauseTiming(task, at),
		done: true,
		completedAt: at,
		startedAt: null
	};
}
//#endregion
//#region src/utils/dayContext.js
var CLOSE_WINDOW_MINUTES = 120;
function eligible(task, excludeId) {
	return task.id !== excludeId && !task.archived;
}
function reminderDate(task, reminder) {
	if (typeof reminder === "string") return new Date(reminder);
	if (reminder?.kind === "absolute") return new Date(reminder.at);
	if (reminder?.kind === "relative" && task.deadline) return /* @__PURE__ */ new Date(deadlineMoment(task.deadline).getTime() - reminder.minutesBefore * 6e4);
	return /* @__PURE__ */ new Date(NaN);
}
function remindersOn(tasks, dateStr, excludeId) {
	const found = [];
	tasks.forEach((task) => {
		if (!eligible(task, excludeId)) return;
		task.reminders.forEach((reminder) => {
			const at = reminderDate(task, reminder);
			if (!Number.isNaN(at.getTime()) && toDateStr(at) === dateStr) found.push({
				key: `${task.id}:${reminder.id ?? at.toISOString()}`,
				title: task.title,
				at
			});
		});
	});
	return found;
}
/** Tasks already landing on a candidate deadline date. */
function getDeadlineContext(tasks, dateStr, excludeId) {
	if (!dateStr) return {
		deadlines: [],
		reminders: []
	};
	return {
		deadlines: tasks.filter((task) => eligible(task, excludeId) && task.deadline === dateStr),
		reminders: remindersOn(tasks, dateStr, excludeId)
	};
}
/** Reminders within a close time window of a candidate reminder datetime. */
function getReminderContext(tasks, datetimeStr, excludeId, windowMinutes = CLOSE_WINDOW_MINUTES) {
	if (!datetimeStr) return {
		nearby: [],
		deadlines: [],
		windowMinutes
	};
	const target = new Date(datetimeStr);
	if (Number.isNaN(target.getTime())) return {
		nearby: [],
		deadlines: [],
		windowMinutes
	};
	const dateStr = toDateStr(target);
	const nearby = [];
	tasks.forEach((task) => {
		if (!eligible(task, excludeId)) return;
		task.reminders.forEach((reminder) => {
			const at = reminderDate(task, reminder);
			if (Number.isNaN(at.getTime())) return;
			const minutesApart = Math.abs(at.getTime() - target.getTime()) / 6e4;
			if (minutesApart <= windowMinutes) nearby.push({
				key: `${task.id}:${reminder.id ?? at.toISOString()}`,
				title: task.title,
				at,
				minutesApart
			});
		});
	});
	nearby.sort((a, b) => a.minutesApart - b.minutesApart);
	return {
		nearby,
		deadlines: tasks.filter((task) => eligible(task, excludeId) && task.deadline === dateStr),
		windowMinutes
	};
}
function taskEnvelope(tasks) {
	return {
		schemaVersion: 4,
		tasks
	};
}
function serializeTasks(tasks, routines = null) {
	const envelope = taskEnvelope(tasks);
	if (Array.isArray(routines)) {
		envelope.routines = routines;
		envelope.routineSchemaVersion = 1;
	}
	return JSON.stringify(envelope, null, 2);
}
//#endregion
//#region scripts/phase3-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var task = normalizeTask({
	id: "timed",
	title: "Timed task",
	deadline: "2026-08-22"
});
var started = startTiming(task, "2026-08-21T10:00:00.000Z");
assert(started.startedAt === "2026-08-21T10:00:00.000Z", "Start timestamp was not recorded");
assert(normalizeTask(started).startedAt === started.startedAt, "Active timing did not survive normalization/reload");
var persisted = JSON.parse(serializeTasks([normalizeTask(started)]));
assert(persisted.schemaVersion === 4 && persisted.tasks[0].startedAt === started.startedAt, "Active timing was not export/persistence safe");
assert(startTiming(started, "2026-08-21T10:05:00.000Z") === started, "Starting twice replaced the active interval");
assert(startTiming({
	...task,
	archived: true
}, "2026-08-21T10:05:00.000Z").startedAt === null, "Archived task could be started");
assert(elapsedMinutes(started.startedAt, "2026-08-21T10:30:00.000Z") === 30, "Elapsed time calculation failed");
var paused = pauseTiming(started, "2026-08-21T10:30:00.000Z");
assert(paused.startedAt === null && paused.actualMinutes === 30, "Pause did not accumulate elapsed time");
var completed = completeTiming(startTiming(paused, "2026-08-21T11:00:00.000Z"), "2026-08-21T11:45:00.000Z");
assert(completed.done && completed.startedAt === null, "Completion left timing active");
assert(completed.actualMinutes === 75, "Resumed intervals were not accumulated");
assert(normalizeTask({
	...completed,
	startedAt: "2026-08-21T12:00:00.000Z"
}).startedAt === null, "Completed task retained an active interval");
assert(completeTiming(task, "2026-08-21T12:00:00.000Z").actualMinutes === null, "Unstarted completion invented actual time");
assert(elapsedMinutes("invalid", "2026-08-21T12:00:00.000Z") === 0, "Invalid timestamps produced elapsed time");
assert(durationToMinutes({
	value: 2,
	unit: "hr"
}) === 120, "Hour estimate conversion failed");
assert(durationToMinutes({
	value: 30,
	unit: "min"
}) === 30, "Minute estimate conversion failed");
assert(durationToMinutes({
	value: 0,
	unit: "min"
}) === null, "Zero estimate was treated as work duration");
assert(durationToMinutes(null) === null, "Missing estimate was treated as work duration");
assert(formatMinutes(70) === "1h 10m", "Duration display formatting failed");
assert(median([
	3,
	1,
	2,
	100
]) === 2.5, "Median calculation failed");
var sample = (id, estimate, actual, extra = {}) => normalizeTask({
	id,
	title: id,
	done: true,
	completedAt: "2026-08-21T12:00:00.000Z",
	duration: {
		value: estimate,
		unit: "min"
	},
	actualMinutes: actual,
	...extra
});
var calibratedTasks = [
	sample("a", 30, 60),
	sample("b", 60, 90),
	sample("c", 45, 90)
];
var calibration = getCalibration(calibratedTasks);
assert(calibration.sampleCount === 3, "Valid calibration samples were lost");
assert(calibration.multiplier === 2 && calibration.calibrated, "Median multiplier was incorrect");
var expected = estimateTaskDuration(normalizeTask({
	title: "New",
	duration: {
		value: 30,
		unit: "min"
	}
}), calibratedTasks);
assert(expected.minutes === 60 && expected.source === "calibrated", "Calibrated estimate was incorrect");
var insufficient = getCalibration(calibratedTasks.slice(0, 2));
assert(insufficient.multiplier === 1 && !insufficient.calibrated, "Insufficient samples changed estimates");
assert(getCalibration([
	sample("zero-estimate", 0, 40),
	sample("zero-actual", 30, 0),
	sample("unfinished", 30, 60, { done: false }),
	sample("runaway", 30, 999999)
]).sampleCount === 0, "Invalid calibration samples were accepted");
var historical = estimateTaskDuration(normalizeTask({ title: "No estimate" }), calibratedTasks);
assert(historical.minutes === 90 && historical.source === "history", "Missing estimate did not use median history");
var fallback = estimateTaskDuration(normalizeTask({ title: "No history" }), []);
assert(fallback.minutes === 45 && fallback.source === "fallback", "Missing history did not use conservative fallback");
assert(nextOccurrence({ freq: "weekdays" }, "2026-08-21") === "2026-08-24", "Retained recurrence failed");
assert(reminderInstances({
	id: "reminder",
	deadline: "2026-08-22"
}, {
	id: "rel:60",
	kind: "relative",
	minutesBefore: 60
}, /* @__PURE__ */ new Date("2026-08-21"), /* @__PURE__ */ new Date("2026-08-23")).length === 1, "Retained relative reminder failed");
var contextTask = {
	id: "context",
	title: "Context task",
	archived: false,
	deadline: "2026-08-22",
	reminders: [{
		id: "abs",
		kind: "absolute",
		at: "2026-08-21T12:00"
	}]
};
assert(getDeadlineContext([contextTask], "2026-08-21").reminders.length === 1, "Deadline context ignored structured reminders");
assert(getReminderContext([contextTask], "2026-08-21T12:30").nearby.length === 1, "Reminder context ignored structured reminders");
console.log("ok    actual-time capture, calibration, and canonical duration estimation");
//#endregion
export {};
