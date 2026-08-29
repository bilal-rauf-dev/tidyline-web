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
var REMOVED_PREFERENCE_KEYS = [
	"tidyline:bucket-order",
	"tidyline:task-templates",
	"tidyline:saved-filters",
	"tidyline:overload-hours"
];
function taskEnvelope(tasks) {
	return {
		schemaVersion: 4,
		tasks
	};
}
function migrateTaskData(value) {
	if (Array.isArray(value)) return {
		schemaVersion: 4,
		tasks: value,
		migratedFrom: 1
	};
	if (value && typeof value === "object" && Array.isArray(value.tasks)) {
		if (Number.isInteger(value.schemaVersion) && value.schemaVersion > 4) throw new TypeError(`Unsupported future task schema: ${value.schemaVersion}`);
		return {
			schemaVersion: 4,
			tasks: value.tasks,
			migratedFrom: Number.isInteger(value.schemaVersion) ? value.schemaVersion : null
		};
	}
	throw new TypeError("Expected a TidyLine task array or task envelope");
}
function cleanupLegacyPreferences(storage) {
	REMOVED_PREFERENCE_KEYS.forEach((key) => storage.removeItem(key));
}
function serializeTasks(tasks, routines = null) {
	const envelope = taskEnvelope(tasks);
	if (Array.isArray(routines)) {
		envelope.routines = routines;
		envelope.routineSchemaVersion = 1;
	}
	return JSON.stringify(envelope, null, 2);
}
function parseImportedTasks(json) {
	return migrateTaskData(JSON.parse(json)).tasks.filter((item) => item && typeof item === "object" && typeof item.title === "string");
}
//#endregion
//#region scripts/phase2-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var legacy = {
	id: "legacy",
	title: "  Await contract  ",
	deadline: "2026-09-01",
	status: "waiting",
	waitingFor: "legal",
	followUpDate: "2026-08-25",
	priority: "high",
	energyLevel: "deep-focus",
	plannedDate: "2026-08-21",
	scheduledStart: "2026-08-21T09:00",
	attachments: [{
		id: "a",
		label: "Draft",
		url: "https://example.com/draft"
	}, null],
	links: [{
		id: "l",
		label: "Brief",
		url: "https://example.com/brief"
	}],
	checklist: [
		{
			text: "Review",
			done: false
		},
		null,
		{ nope: true }
	],
	reminders: [
		"2026-08-25T09:00",
		null,
		{
			kind: "relative",
			minutesBefore: 30
		}
	]
};
var normalized = normalizeTask(legacy);
assert(normalized.title === "Await contract", "Title was not normalized");
assert(normalized.tags.includes("waiting"), "Waiting state was not preserved as a tag");
assert(normalized.notes.includes("Waiting for legal."), "Waiting owner was lost");
assert(normalized.notes.includes("Follow up 2026-08-25."), "Follow-up date was lost");
assert(normalized.links.length === 2, "Attachments were not preserved as links");
assert(normalized.checklist.length === 1, "Malformed checklist entries survived");
assert(normalized.reminders.length === 2, "Malformed reminders survived");
assert(normalized.startedAt === null && normalized.actualMinutes === null, "Calibration fields did not initialize safely");
assert(normalized.resurfaceDate === null, "Resurfacing did not initialize safely");
assert(Object.keys(normalized).every((key) => TASK_FIELDS.includes(key)), "Removed task fields survived");
assert(!("priority" in normalized) && !("status" in normalized), "Deprecated fields survived");
var oldArray = migrateTaskData([legacy]);
assert(oldArray.schemaVersion === 4 && oldArray.migratedFrom === 1, "Legacy array migration failed");
var oldEnvelope = migrateTaskData({
	schemaVersion: 1,
	tasks: [legacy]
});
assert(oldEnvelope.migratedFrom === 1 && oldEnvelope.tasks.length === 1, "Envelope migration failed");
assert(JSON.parse(serializeTasks([normalized])).schemaVersion === 4, "Export schema version missing");
assert(parseImportedTasks(JSON.stringify([legacy])).length === 1, "Legacy import stopped working");
assert(parseImportedTasks(JSON.stringify({ tasks: [
	legacy,
	null,
	{ title: 3 }
] })).length === 1, "Import validation failed");
var rejectedInvalidEnvelope = false;
try {
	migrateTaskData({ records: [legacy] });
} catch {
	rejectedInvalidEnvelope = true;
}
assert(rejectedInvalidEnvelope, "Unknown storage shape would be silently replaced");
var rejectedFutureSchema = false;
try {
	migrateTaskData({
		schemaVersion: 5,
		tasks: [legacy]
	});
} catch {
	rejectedFutureSchema = true;
}
assert(rejectedFutureSchema, "Future schema would be destructively downgraded");
var removed = [];
cleanupLegacyPreferences({ removeItem: (key) => removed.push(key) });
assert(removed.length === 4, "Legacy preferences were not cleaned up");
console.log("ok    loss-aware Phase 2 migration and schema cleanup");
//#endregion
export {};
