import "react";
//#region src/utils/calendar.js
function toDateStr(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
function normalizeStartDate(value, deadline) {
	if (!deadline || !DATE_VALUE.test(value ?? "")) return null;
	return value <= deadline ? value : null;
}
function normalizePlannedDate(value) {
	return DATE_VALUE.test(value ?? "") ? value : null;
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
Number.POSITIVE_INFINITY;
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
//#region src/hooks/useTasks.js
var BOOT_TIME = (/* @__PURE__ */ new Date()).toISOString();
function normalizeReminder(entry) {
	if (typeof entry === "string") return {
		id: `abs:${entry}`,
		kind: "absolute",
		at: entry
	};
	const kind = entry.kind ?? "absolute";
	const record = {
		...entry,
		kind
	};
	return {
		...record,
		id: entry.id ?? reminderKey(record)
	};
}
function normalizeList(value) {
	return Array.isArray(value) ? value : [];
}
function normalizeTask(task) {
	const deadline = typeof task.deadline === "string" ? task.deadline : null;
	const plannedDate = normalizePlannedDate(task.plannedDate);
	const postponeHistory = normalizePostponeHistory(task.postponeHistory);
	const originalDeadline = normalizePlannedDate(task.originalDeadline) ?? postponeHistory[0]?.from ?? deadline;
	const followUpDate = normalizePlannedDate(task.followUpDate);
	const waitingExpired = followUpDate && followUpDate <= toDateStr(/* @__PURE__ */ new Date());
	return {
		id: task.id,
		title: task.title,
		deadline,
		reminders: normalizeList(task.reminders).map(normalizeReminder),
		tags: normalizeList(task.tags),
		done: Boolean(task.done),
		completedAt: typeof task.completedAt === "string" ? task.completedAt : null,
		pinned: Boolean(task.pinned),
		archived: Boolean(task.archived),
		recurrence: task.recurrence ?? null,
		notes: typeof task.notes === "string" ? task.notes : "",
		location: typeof task.location === "string" ? task.location : "",
		duration: task.duration ?? null,
		checklist: normalizeList(task.checklist),
		links: normalizeList(task.links),
		attachments: normalizeList(task.attachments),
		startDate: normalizeStartDate(task.startDate, deadline),
		energyLevel: normalizeEnergyLevel(task.energyLevel),
		plannedDate: deadline && plannedDate && plannedDate >= toDateStr(/* @__PURE__ */ new Date()) ? plannedDate : null,
		originalDeadline,
		postponeHistory,
		scheduledStart: typeof task.scheduledStart === "string" ? task.scheduledStart : null,
		status: task.status === "waiting" && !waitingExpired ? "waiting" : "active",
		waitingFor: task.status === "waiting" && !waitingExpired && typeof task.waitingFor === "string" ? task.waitingFor : "",
		followUpDate: task.status === "waiting" && !waitingExpired ? followUpDate : null,
		createdAt: typeof task.createdAt === "string" ? task.createdAt : BOOT_TIME
	};
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
//#region src/hooks/useTemplates.js
function list(value) {
	return Array.isArray(value) ? value : [];
}
function normalizeTemplate(template) {
	return {
		id: typeof template.id === "string" ? template.id : crypto.randomUUID(),
		name: typeof template.name === "string" && template.name.trim() ? template.name.trim() : "Untitled template",
		notes: typeof template.notes === "string" ? template.notes : "",
		tags: list(template.tags).filter((tag) => typeof tag === "string"),
		checklist: list(template.checklist).filter((item) => item && typeof item.text === "string").map((item) => ({ text: item.text })),
		duration: template.duration ?? null,
		reminders: list(template.reminders),
		recurrence: template.recurrence ?? null
	};
}
function taskToTemplate(task, name) {
	return normalizeTemplate({
		id: crypto.randomUUID(),
		name,
		notes: task.notes,
		tags: task.tags,
		checklist: task.checklist,
		duration: task.duration,
		reminders: task.reminders,
		recurrence: task.recurrence
	});
}
//#endregion
//#region scripts/phase2-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
assert(normalizeTask({
	id: "idea",
	title: "Idea",
	deadline: null
}).deadline === null, "Someday task was given a synthetic deadline");
assert(normalizeTask({
	id: "scheduled",
	title: "Scheduled",
	deadline: "2099-01-02",
	scheduledStart: "2099-01-01T10:30"
}).scheduledStart === "2099-01-01T10:30", "Scheduled start was not preserved");
var released = normalizeTask({
	id: "waiting",
	title: "Waiting",
	deadline: "2099-01-02",
	status: "waiting",
	waitingFor: "Reply",
	followUpDate: today
});
assert(released.status === "active", "Due follow-up did not release the waiting task");
assert(!released.followUpDate && !released.waitingFor, "Released waiting metadata was not cleared");
var filtered = filterTasks([normalizeTask({
	id: "match",
	title: "Match",
	deadline: "2099-01-10",
	pinned: true,
	duration: {
		value: 45,
		unit: "min"
	}
}), normalizeTask({
	id: "miss",
	title: "Miss",
	deadline: "2099-02-10",
	duration: {
		value: 10,
		unit: "min"
	}
})], {
	...DEFAULT_FILTERS,
	pinnedOnly: true,
	durationMin: "30",
	durationMax: "60",
	dateFrom: "2099-01-01",
	dateTo: "2099-01-31"
});
assert(filtered.length === 1 && filtered[0].id === "match", "Advanced filters did not compose");
var template = taskToTemplate(normalizeTask({
	id: "source",
	title: "Do not copy title",
	deadline: "2099-01-10",
	notes: "Reusable notes",
	tags: ["study"],
	checklist: [{
		id: "one",
		text: "Read",
		done: true
	}],
	duration: {
		value: 1,
		unit: "hr"
	}
}), "Study setup");
assert(!("title" in template) && !("deadline" in template), "Template copied task-specific fields");
assert(template.notes === "Reusable notes" && template.checklist.length === 1, "Template lost details");
console.log("ok    Phase 2 scheduling, waiting, someday, template, and filter rules");
//#endregion
export {};
