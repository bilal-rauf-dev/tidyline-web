import "react";
import * as chrono from "chrono-node";
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
//#endregion
//#region src/utils/taskFields.js
var TASK_FIELDS = [
	"id",
	"title",
	"deadline",
	"reminders",
	"tags",
	"priority",
	"done",
	"completedAt",
	"pinned",
	"archived",
	"recurrence",
	"notes",
	"location",
	"duration",
	"checklist",
	"links",
	"attachments",
	"startDate",
	"plannedDate",
	"originalDeadline",
	"postponeHistory",
	"scheduledStart",
	"status",
	"waitingFor",
	"followUpDate",
	"createdAt"
];
var PRIORITIES = /* @__PURE__ */ new Set([
	"high",
	"medium",
	"low"
]);
var DATE_VALUE$1 = /^\d{4}-\d{2}-\d{2}$/;
function normalizePriority(value) {
	return PRIORITIES.has(value) ? value : null;
}
function normalizeStartDate(value, deadline) {
	if (!deadline || !DATE_VALUE$1.test(value ?? "")) return null;
	return value <= deadline ? value : null;
}
function normalizePlannedDate(value) {
	return DATE_VALUE$1.test(value ?? "") ? value : null;
}
function isTaskUpcoming(task, referenceDate = /* @__PURE__ */ new Date()) {
	return Boolean(task.startDate && task.startDate > toDateStr(referenceDate));
}
function isTaskPlannedForToday(task, referenceDate = /* @__PURE__ */ new Date()) {
	return task.plannedDate === toDateStr(referenceDate);
}
function normalizePostponeHistory(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((entry) => entry && DATE_VALUE$1.test(entry.from ?? "") && DATE_VALUE$1.test(entry.to ?? "") && entry.to > entry.from).map((entry) => ({
		from: entry.from,
		to: entry.to,
		at: typeof entry.at === "string" ? entry.at : "",
		source: entry.source === "drag" || entry.source === "calendar" ? entry.source : "edit"
	}));
}
//#endregion
//#region src/utils/buckets.js
var BUCKET_ORDER = [
	"today",
	"week",
	"month",
	"later"
];
var BUCKET_RANGES = [
	{
		key: "today",
		label: "Today",
		minDays: Number.NEGATIVE_INFINITY,
		maxDays: 0
	},
	{
		key: "week",
		label: "Week",
		minDays: 1,
		maxDays: 7
	},
	{
		key: "month",
		label: "Month",
		minDays: 8,
		maxDays: 30
	},
	{
		key: "later",
		label: "Later",
		minDays: 31,
		maxDays: Number.POSITIVE_INFINITY
	}
];
Object.fromEntries(BUCKET_RANGES.map(({ key, label }) => [key, label]));
function deadlineForBucket(bucketKey, referenceDate = /* @__PURE__ */ new Date()) {
	const range = BUCKET_RANGES.find(({ key }) => key === bucketKey);
	const offset = Math.max(0, range?.minDays ?? 0);
	const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + offset);
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}
function getTaskBucket(deadline, referenceDate = /* @__PURE__ */ new Date()) {
	const distance = daysUntil(deadline, referenceDate);
	return BUCKET_RANGES.find(({ minDays, maxDays }) => distance >= minDays && distance <= maxDays)?.key ?? "later";
}
var byDeadline = (a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? "");
/** Group tasks into disjoint deadline buckets plus a non-draggable undated group. */
function groupTasksByBucket(tasks, referenceDate = /* @__PURE__ */ new Date(), comparator = byDeadline, { includeUpcoming = false } = {}) {
	const grouped = Object.fromEntries([...BUCKET_ORDER, "nodate"].map((key) => [key, []]));
	tasks.forEach((task) => {
		if (!task.deadline) {
			grouped.nodate.push(task);
			return;
		}
		if (!includeUpcoming && isTaskUpcoming(task, referenceDate)) return;
		const bucket = isTaskPlannedForToday(task, referenceDate) ? "today" : getTaskBucket(task.deadline, referenceDate);
		grouped[bucket].push(task);
	});
	Object.values(grouped).forEach((group) => {
		group.sort((a, b) => {
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
	priority: "all",
	status: "all",
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
function durationMinutes(duration) {
	return duration ? duration.unit === "hr" ? duration.value * 60 : duration.value : 0;
}
function filterTasks(tasks, filters = DEFAULT_FILTERS) {
	const settings = {
		...DEFAULT_FILTERS,
		...filters
	};
	const todayStr = toDateStr(/* @__PURE__ */ new Date());
	const query = settings.query.trim().toLowerCase();
	return tasks.filter((task) => {
		if (!matchesStatus(task, settings.status, todayStr)) return false;
		if (settings.tag !== "all" && !(task.tags ?? []).includes(settings.tag)) return false;
		if (settings.priority !== "all" && (settings.priority === "unset" ? Boolean(task.priority) : task.priority !== settings.priority)) return false;
		if (settings.pinnedOnly && !task.pinned) return false;
		if (settings.dateFrom && (!task.deadline || task.deadline < settings.dateFrom)) return false;
		if (settings.dateTo && (!task.deadline || task.deadline > settings.dateTo)) return false;
		const minutes = durationMinutes(task.duration);
		if (settings.durationMin !== "" && minutes < Number(settings.durationMin)) return false;
		if (settings.durationMax !== "" && minutes > Number(settings.durationMax)) return false;
		if (!query) return true;
		return [
			task.title,
			task.waitingFor,
			...task.tags ?? []
		].join(" ").toLowerCase().includes(query);
	});
}
var PRIORITY_RANK = {
	high: 0,
	medium: 1,
	low: 2
};
function buildComparator({ sortBy = "deadline", sortDir = "asc" } = {}) {
	const direction = sortDir === "desc" ? -1 : 1;
	return (a, b) => {
		if (sortBy === "priority") {
			const aUnset = !a.priority;
			if (aUnset !== !b.priority) return aUnset ? 1 : -1;
			if (!aUnset && a.priority !== b.priority) return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * direction;
			return (a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31");
		}
		if (sortBy === "duration") {
			const aUnset = !a.duration;
			if (aUnset !== !b.duration) return aUnset ? 1 : -1;
			return (durationMinutes(a.duration) - durationMinutes(b.duration)) * direction;
		}
		if (sortBy === "title") return a.title.localeCompare(b.title) * direction;
		if (sortBy === "tags") return (a.tags?.join(", ") ?? "").localeCompare(b.tags?.join(", ") ?? "") * direction;
		const left = sortBy === "createdAt" ? a.createdAt : a.deadline ?? "9999-12-31";
		const right = sortBy === "createdAt" ? b.createdAt : b.deadline ?? "9999-12-31";
		return left.localeCompare(right) * direction;
	};
}
//#endregion
//#region src/utils/overdue.js
/**
* Severity rises with age: 1 = yesterday, 3 = a week or more.
* Drives border weight and colour intensity, all from existing tokens.
*/
var OVERDUE_TIERS = [
	{
		key: "yesterday",
		label: "Yesterday",
		severity: 1,
		maxDaysLate: 1
	},
	{
		key: "recent",
		label: "A few days ago",
		severity: 2,
		maxDaysLate: 6
	},
	{
		key: "stale",
		label: "A week or more",
		severity: 3,
		maxDaysLate: Infinity
	}
];
function daysOverdue(task, referenceDate = /* @__PURE__ */ new Date()) {
	return -daysUntil(task.deadline, referenceDate);
}
function isOverdue(task, referenceDate = /* @__PURE__ */ new Date()) {
	return !task.done && !task.archived && Boolean(task.deadline) && task.status !== "waiting" && !isTaskUpcoming(task, referenceDate) && !isTaskPlannedForToday(task, referenceDate) && daysUntil(task.deadline, referenceDate) < 0;
}
function overdueSeverity(task, referenceDate = /* @__PURE__ */ new Date()) {
	if (!isOverdue(task, referenceDate)) return 0;
	const late = daysOverdue(task, referenceDate);
	return OVERDUE_TIERS.find((tier) => late <= tier.maxDaysLate)?.severity ?? 3;
}
function groupOverdue(tasks, referenceDate = /* @__PURE__ */ new Date()) {
	const groups = OVERDUE_TIERS.map((tier) => ({
		...tier,
		tasks: []
	}));
	tasks.forEach((task) => {
		if (!isOverdue(task, referenceDate)) return;
		const late = daysOverdue(task, referenceDate);
		groups.find((tier) => late <= tier.maxDaysLate)?.tasks.push(task);
	});
	groups.forEach((group) => {
		group.tasks.sort((a, b) => a.deadline.localeCompare(b.deadline));
	});
	return groups.filter((group) => group.tasks.length > 0).reverse();
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
function durationToMinutes(duration) {
	if (!duration || !Number.isFinite(Number(duration.value))) return 0;
	return duration.unit === "hr" ? Number(duration.value) * 60 : Number(duration.value);
}
function getCapacitySummary(tasks, dateStr, overloadHours = 6) {
	const due = tasks.filter((task) => !task.done && !task.archived && task.status !== "waiting" && task.deadline === dateStr);
	const estimatedMinutes = due.reduce((total, task) => total + durationToMinutes(task.duration), 0);
	const capacityMinutes = overloadHours * 60;
	return {
		taskCount: due.length,
		estimatedMinutes,
		unestimatedCount: due.filter((task) => !task.duration).length,
		capacityMinutes,
		overBy: Math.max(0, estimatedMinutes - capacityMinutes)
	};
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
var LEGACY_BUCKET_CONFIG_KEYS = ["tidyline:bucket-config", "tidyline:bucket-order"];
function migrateV1ToV2(tasks) {
	return tasks.map((entry) => {
		const task = { ...entry };
		delete task.energyLevel;
		return task;
	});
}
function migrateTaskData(raw) {
	if (Array.isArray(raw)) return {
		status: "ok",
		schemaVersion: 2,
		tasks: migrateV1ToV2(raw),
		migrated: true
	};
	if (!raw || typeof raw !== "object" || !Number.isInteger(raw.schemaVersion) || !Array.isArray(raw.tasks)) return {
		status: "invalid",
		schemaVersion: null,
		tasks: [],
		migrated: false
	};
	if (raw.schemaVersion > 2) return {
		status: "future",
		schemaVersion: raw.schemaVersion,
		tasks: [],
		migrated: false
	};
	if (raw.schemaVersion === 1) return {
		status: "ok",
		schemaVersion: 2,
		tasks: migrateV1ToV2(raw.tasks),
		migrated: true
	};
	return {
		status: "ok",
		schemaVersion: 2,
		tasks: raw.tasks,
		migrated: false
	};
}
function cleanupLegacyPreferences(storage) {
	LEGACY_BUCKET_CONFIG_KEYS.forEach((key) => storage.removeItem(key));
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
	const normalized = {
		id: task.id,
		title: task.title,
		deadline,
		reminders: normalizeList(task.reminders).map(normalizeReminder),
		tags: normalizeList(task.tags),
		priority: normalizePriority(task.priority),
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
		plannedDate: deadline ? plannedDate : null,
		originalDeadline,
		postponeHistory,
		scheduledStart: typeof task.scheduledStart === "string" ? task.scheduledStart : null,
		status: task.status === "waiting" ? "waiting" : "active",
		waitingFor: task.status === "waiting" && typeof task.waitingFor === "string" ? task.waitingFor : "",
		followUpDate: task.status === "waiting" ? normalizePlannedDate(task.followUpDate) : null,
		createdAt: typeof task.createdAt === "string" ? task.createdAt : BOOT_TIME
	};
	return Object.fromEntries(TASK_FIELDS.map((field) => [field, normalized[field]]));
}
function applyDailyMaintenance(tasks, todayStr) {
	let changed = false;
	const next = tasks.map((task) => {
		const clearPlanned = Boolean(task.plannedDate && task.plannedDate < todayStr);
		const releaseWaiting = Boolean(task.status === "waiting" && task.followUpDate && task.followUpDate <= todayStr);
		if (!clearPlanned && !releaseWaiting) return task;
		changed = true;
		return {
			...task,
			plannedDate: clearPlanned ? null : task.plannedDate,
			status: releaseWaiting ? "active" : task.status,
			waitingFor: releaseWaiting ? "" : task.waitingFor,
			followUpDate: releaseWaiting ? null : task.followUpDate
		};
	});
	return changed ? next : tasks;
}
//#endregion
//#region src/utils/tasksIO.js
var DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/;
var UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateImport(raw) {
	let parsed;
	try {
		parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
	} catch {
		throw new Error("The selected file is not valid JSON.");
	}
	const migrated = migrateTaskData(parsed);
	if (migrated.status === "future") throw new Error(`This export uses schema version ${migrated.schemaVersion}, which is newer than this app supports.`);
	if (migrated.status !== "ok") throw new Error("Expected a TidyLine task array or versioned export.");
	const tasks = [];
	const ids = /* @__PURE__ */ new Set();
	let skipped = 0;
	let repaired = 0;
	migrated.tasks.forEach((entry) => {
		if (!entry || typeof entry.title !== "string" || !entry.title.trim()) {
			skipped += 1;
			return;
		}
		if (entry.deadline !== null && entry.deadline !== void 0 && (!DATE_VALUE.test(entry.deadline) || Number.isNaN((/* @__PURE__ */ new Date(`${entry.deadline}T00:00:00`)).getTime()))) {
			skipped += 1;
			return;
		}
		let id = entry.id;
		if (typeof id !== "string" || !UUID_VALUE.test(id) || ids.has(id)) {
			id = crypto.randomUUID();
			repaired += 1;
		}
		ids.add(id);
		tasks.push({
			...entry,
			id,
			title: entry.title.trim(),
			deadline: entry.deadline ?? null
		});
	});
	return {
		tasks,
		skipped,
		repaired
	};
}
//#endregion
//#region src/utils/parseNaturalTask.js
/**
* Parses natural language input to extract task metadata.
* Phases 1, 2 & 3:
*
* Supported syntax (order shown is the stripping order, which prevents cross-match):
*
*  Tags            #tagname
*  Priority        !high / !medium / !low  or  p1 / p2 / p3
*  Duration        for 2h / for 45 minutes / for 45m
*  Reminder        remind me 2h before / remind 30m before
*  Recurrence      every day / every weekday / every Monday / every 2 weeks / every week
*  Start date      start Monday / start Friday / start next week
*  Plan today      plan today  (explicit 2-word form; standalone "today" is left for deadline)
*  Deadline        parsed by chrono-node from whatever text remains after the above
*  Prepositions    "due on / due / by" are absorbed into the deadline span
*
* @param {string} input
* @param {Date} [referenceDate]
* @returns {ParsedTask}
*/
function parseNaturalTask(input, referenceDate = /* @__PURE__ */ new Date()) {
	const matchedTokens = [];
	let workingText = input;
	function registerMatch(type, value, startIdx, length, text) {
		matchedTokens.push({
			type,
			value,
			text
		});
		workingText = workingText.slice(0, startIdx) + " ".repeat(length) + workingText.slice(startIdx + length);
	}
	const tagRegex = /(?:^|\s)#(\w[\w-]*)\b/gi;
	let match;
	while ((match = tagRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("tag", match[1].toLowerCase(), startIdx, text.length, text);
	}
	const bangPriorityRegex = /(?:^|\s)!(high|medium|low)\b/gi;
	while ((match = bangPriorityRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("priority", match[1].toLowerCase(), startIdx, text.length, text);
	}
	if (!matchedTokens.some((t) => t.type === "priority")) {
		const pMap = {
			p1: "high",
			p2: "medium",
			p3: "low"
		};
		const pRegex = /(?:^|\s)\b(p1|p2|p3)\b/gi;
		while ((match = pRegex.exec(workingText)) !== null) {
			const text = match[0].trim();
			const startIdx = match.index + (match[0].length - match[0].trimStart().length);
			registerMatch("priority", pMap[match[1].toLowerCase()], startIdx, text.length, text);
		}
	}
	const durationRegex = /(?:^|\s)for\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/gi;
	while ((match = durationRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const num = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("duration", unit.startsWith("h") ? num * 60 : num, startIdx, text.length, text);
	}
	const reminderRegex = /(?:^|\s)remind\s+(?:me\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\s+before\b/gi;
	while ((match = reminderRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const num = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("reminder", unit.startsWith("h") ? num * 60 : num, startIdx, text.length, text);
	}
	const WEEKDAY_MAP = {
		sunday: 0,
		sun: 0,
		monday: 1,
		mon: 1,
		tuesday: 2,
		tue: 2,
		tues: 2,
		wednesday: 3,
		wed: 3,
		thursday: 4,
		thu: 4,
		thur: 4,
		thurs: 4,
		friday: 5,
		fri: 5,
		saturday: 6,
		sat: 6
	};
	const recurrenceRegex = /(?:^|\s)every\s+(day|daily|weekday|weekdays|week|month|monthly|year|yearly|\d+\s+(?:days?|weeks?|months?)|(?:sun|mon|tue(?:s)?|wed|thu(?:rs?)?|fri|sat)(?:urday|nesday|rsday|urday)?(?:day)?)\b/gi;
	while ((match = recurrenceRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		const raw = match[1].trim().toLowerCase();
		let recurrence = null;
		if (raw === "day" || raw === "daily") recurrence = { freq: "daily" };
		else if (raw === "weekday" || raw === "weekdays") recurrence = { freq: "weekdays" };
		else if (raw === "week") recurrence = {
			freq: "weekly",
			weekday: referenceDate.getDay()
		};
		else if (raw === "month" || raw === "monthly") recurrence = { freq: "monthly" };
		else if (raw === "year" || raw === "yearly") recurrence = { freq: "yearly" };
		else {
			const nMatch = /^(\d+)\s+(days?|weeks?|months?)$/.exec(raw);
			if (nMatch) {
				const n = parseInt(nMatch[1], 10);
				const unit = nMatch[2].replace(/s$/, "");
				if (unit === "day") recurrence = {
					freq: "everyNDays",
					n
				};
				else if (unit === "week") recurrence = n === 1 ? {
					freq: "weekly",
					weekday: referenceDate.getDay()
				} : {
					freq: "everyNDays",
					n: n * 7
				};
				else if (unit === "month") recurrence = { freq: "monthly" };
			} else {
				const wdKey = raw.toLowerCase();
				if (WEEKDAY_MAP[wdKey] !== void 0) recurrence = {
					freq: "weekly",
					weekday: WEEKDAY_MAP[wdKey]
				};
			}
		}
		if (recurrence) registerMatch("recurrence", recurrence, startIdx, text.length, text);
	}
	const startDateRegex = new RegExp(`(?:^|\\s)start\\s+(next\\s+\\w+|this\\s+\\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|tomorrow|today|weekend)`, "gi");
	while ((match = startDateRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		const datePart = match[1].trim();
		const parsedStart = chrono.parse(datePart, referenceDate, { forwardDate: true });
		if (parsedStart.length > 0) registerMatch("startDate", parsedStart[0].start.date(), startIdx, text.length, text);
	}
	const planTodayRegex = /(?:^|\s)(plan today)\b/gi;
	while ((match = planTodayRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		registerMatch("planForToday", true, match.index + (match[0].length - match[0].trimStart().length), text.length, text);
	}
	const parsedDates = chrono.parse(workingText, referenceDate, { forwardDate: true });
	if (parsedDates.length > 0) {
		const dateMatch = parsedDates[0];
		let startIdx = dateMatch.index;
		let text = dateMatch.text;
		const preceding = workingText.slice(0, startIdx);
		const prepMatch = /\b(no\s+later\s+than|due\s+on|due|before|until|till|til|by)\s+$/i.exec(preceding);
		if (prepMatch) {
			const prepLen = prepMatch[0].length;
			startIdx -= prepLen;
			text = workingText.slice(startIdx, startIdx + prepLen + text.length);
		}
		registerMatch("deadline", dateMatch.start.date(), startIdx, text.length, text);
	}
	return {
		title: workingText.replace(/\s+/g, " ").trim(),
		deadline: matchedTokens.find((t) => t.type === "deadline")?.value ?? null,
		startDate: matchedTokens.find((t) => t.type === "startDate")?.value ?? null,
		reminderMinutes: matchedTokens.find((t) => t.type === "reminder")?.value ?? null,
		durationMinutes: matchedTokens.find((t) => t.type === "duration")?.value ?? null,
		recurrence: matchedTokens.find((t) => t.type === "recurrence")?.value ?? null,
		priority: matchedTokens.find((t) => t.type === "priority")?.value ?? null,
		tags: matchedTokens.filter((t) => t.type === "tag").map((t) => t.value),
		planForToday: matchedTokens.some((t) => t.type === "planForToday"),
		matchedTokens
	};
}
//#endregion
//#region src/utils/quickAddTask.js
var PARSER_FIELD_MAP = {
	title: "title",
	deadline: "deadline",
	startDate: "startDate",
	reminderMinutes: "reminders",
	durationMinutes: "duration",
	recurrence: "recurrence",
	priority: "priority",
	tags: "tags",
	planForToday: "plannedDate"
};
var PARSER_ONLY_KEYS = ["matchedTokens"];
function toLocalYMD(date) {
	if (!date) return null;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function buildQuickAddTask(parsed, referenceDate = /* @__PURE__ */ new Date()) {
	const todayStr = toDateStr(referenceDate);
	return {
		title: parsed.title,
		deadline: parsed.deadline ? toLocalYMD(parsed.deadline) : null,
		tags: parsed.tags,
		reminders: parsed.reminderMinutes === null ? [] : [{
			id: `rel:${parsed.reminderMinutes}`,
			kind: "relative",
			minutesBefore: parsed.reminderMinutes
		}],
		recurrence: parsed.recurrence,
		priority: parsed.priority ?? null,
		notes: "",
		checklist: [],
		links: [],
		attachments: [],
		location: "",
		duration: parsed.durationMinutes === null ? null : {
			value: parsed.durationMinutes,
			unit: "min"
		},
		startDate: parsed.startDate ? toLocalYMD(parsed.startDate) : null,
		status: "active",
		waitingFor: "",
		followUpDate: null,
		plannedDate: parsed.planForToday ? todayStr : null
	};
}
//#endregion
//#region scripts/logic-tests.js
var passed = 0;
var failed = 0;
function test(name, fn) {
	try {
		fn();
		passed += 1;
		console.log(`ok    ${name}`);
	} catch (error) {
		failed += 1;
		console.error(`FAIL  ${name}: ${error.message}`);
	}
}
function assert(value, message) {
	if (!value) throw new Error(message);
}
var reference = new Date(2026, 7, 10);
var task = (overrides = {}) => ({
	id: crypto.randomUUID(),
	title: "Task",
	deadline: "2026-08-11",
	done: false,
	archived: false,
	pinned: false,
	status: "active",
	tags: [],
	checklist: [],
	postponeHistory: [],
	...overrides
});
test("bucket ranges tile tested integer line exactly once", () => {
	for (let day = -400; day <= 800; day += 1) assert(BUCKET_RANGES.filter((range) => day >= range.minDays && day <= range.maxDays).length === 1, `day ${day}`);
});
[
	[0, "today"],
	[1, "week"],
	[7, "week"],
	[8, "month"],
	[30, "month"],
	[31, "later"],
	[-1, "today"]
].forEach(([day, key]) => test(`bucket boundary ${day} → ${key}`, () => {
	const date = new Date(reference);
	date.setDate(date.getDate() + day);
	assert(getTaskBucket(toDateStr(date), reference) === key, "wrong bucket");
}));
test("bucket deadlines round-trip", () => BUCKET_ORDER.forEach((key) => assert(getTaskBucket(deadlineForBucket(key, reference), reference) === key, key)));
test("undated tasks land in nodate", () => assert(groupTasksByBucket([task({ deadline: null })], reference).nodate.length === 1, "missing nodate"));
test("bucket order is pinned then not-done then comparator", () => {
	assert(groupTasksByBucket([
		task({
			id: "done",
			done: true
		}),
		task({ id: "open" }),
		task({
			id: "pin",
			pinned: true,
			done: true
		})
	], reference).week.map((entry) => entry.id).join(",") === "pin,open,done", "wrong order");
});
test("overdue tier boundaries are 1, 6, and 7 days", () => {
	assert(overdueSeverity(task({ deadline: "2026-08-09" }), reference) === 1, "one day");
	assert(overdueSeverity(task({ deadline: "2026-08-04" }), reference) === 2, "six days");
	assert(overdueSeverity(task({ deadline: "2026-08-03" }), reference) === 3, "seven days");
});
test("overdue exclusions hold", () => {
	assert(groupOverdue([
		task({
			status: "waiting",
			deadline: "2026-08-01"
		}),
		task({
			startDate: "2026-08-12",
			deadline: "2026-08-01"
		}),
		task({
			plannedDate: "2026-08-10",
			deadline: "2026-08-01"
		}),
		task({
			archived: true,
			deadline: "2026-08-01"
		}),
		task({
			done: true,
			deadline: "2026-08-01"
		})
	], reference).length === 0, "excluded task appeared");
});
test("every filter status branch", () => {
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	const list = [
		task({
			id: "active",
			deadline: today
		}),
		task({
			id: "waiting",
			deadline: today,
			status: "waiting"
		}),
		task({
			id: "done",
			deadline: today,
			done: true
		}),
		task({
			id: "overdue",
			deadline: "2000-01-01"
		}),
		task({
			id: "upcoming",
			deadline: "2099-02-01",
			startDate: "2099-01-01"
		})
	];
	for (const status of [
		"active",
		"waiting",
		"completed",
		"overdue",
		"upcoming"
	]) assert(filterTasks(list, {
		...DEFAULT_FILTERS,
		status
	}).length >= 1, status);
});
test("combined tag priority and date filters", () => {
	assert(filterTasks([task({
		tags: ["work"],
		priority: "high",
		deadline: "2026-08-20"
	}), task({
		tags: ["home"],
		priority: "low",
		deadline: "2026-08-20"
	})], {
		...DEFAULT_FILTERS,
		tag: "work",
		priority: "high",
		dateFrom: "2026-08-15",
		dateTo: "2026-08-25"
	}).length === 1, "combined filter");
});
test("priority comparator keeps unset last in both directions", () => {
	const list = [
		task({
			id: "unset",
			priority: null
		}),
		task({
			id: "high",
			priority: "high"
		}),
		task({
			id: "low",
			priority: "low"
		})
	];
	assert([...list].sort(buildComparator({
		sortBy: "priority",
		sortDir: "asc"
	})).at(-1).id === "unset", "asc unset");
	assert([...list].sort(buildComparator({
		sortBy: "priority",
		sortDir: "desc"
	})).at(-1).id === "unset", "desc unset");
});
[
	[
		{ freq: "daily" },
		"2026-08-10",
		"2026-08-11"
	],
	[
		{ freq: "weekdays" },
		"2026-08-14",
		"2026-08-17"
	],
	[
		{
			freq: "weekly",
			weekday: 1
		},
		"2026-08-10",
		"2026-08-17"
	],
	[
		{
			freq: "everyNDays",
			n: 14
		},
		"2026-08-10",
		"2026-08-24"
	],
	[
		{ freq: "monthly" },
		"2025-01-31",
		"2025-02-28"
	],
	[
		{ freq: "yearly" },
		"2024-02-29",
		"2025-02-28"
	]
].forEach(([rule, from, expected]) => test(`recurrence ${rule.freq} from ${from}`, () => assert(nextOccurrence(rule, from) === expected, nextOccurrence(rule, from))));
test("parser maps every 2 weeks to fourteen days", () => assert(parseNaturalTask("Review every 2 weeks").recurrence?.n === 14, "not 14"));
test("capacity counts sums and unestimated work", () => {
	const summary = getCapacitySummary([task({ duration: {
		value: 2,
		unit: "hr"
	} }), task({ duration: null })], "2026-08-11", 1);
	assert(summary.taskCount === 2 && summary.estimatedMinutes === 120 && summary.unestimatedCount === 1 && summary.overBy === 60, JSON.stringify(summary));
});
test("capacity overBy clamps at zero", () => assert(getCapacitySummary([task({ duration: {
	value: 30,
	unit: "min"
} })], "2026-08-11", 6).overBy === 0, "not clamped"));
test("maintenance clears stale plan and releases waiting", () => {
	const next = applyDailyMaintenance([task({ plannedDate: "2026-08-09" }), task({
		status: "waiting",
		waitingFor: "Reply",
		followUpDate: "2026-08-10"
	})], "2026-08-10");
	assert(next[0].plannedDate === null && next[1].status === "active" && !next[1].followUpDate, "maintenance failed");
});
test("maintenance preserves array identity when unchanged", () => {
	const list = [task()];
	assert(applyDailyMaintenance(list, "2026-08-10") === list, "new reference");
});
test("v1 bare array migrates to v2 and drops energy", () => {
	const result = migrateTaskData([{
		title: "Old",
		energyLevel: "deep-focus"
	}]);
	assert(result.schemaVersion === 2 && !("energyLevel" in result.tasks[0]), "migration failed");
});
test("future schema refuses to load", () => assert(migrateTaskData({
	schemaVersion: 99,
	tasks: []
}).status === "future", "future accepted"));
test("legacy bucket preferences are removed", () => {
	const values = /* @__PURE__ */ new Map([
		["tidyline:bucket-config", "x"],
		["tidyline:bucket-order", "x"],
		["keep", "x"]
	]);
	cleanupLegacyPreferences({ removeItem: (key) => values.delete(key) });
	assert(values.size === 1 && values.has("keep"), "cleanup removed the wrong keys");
});
test("import validation reports skip and repair counts", () => {
	const id = "123e4567-e89b-42d3-a456-426614174000";
	const result = validateImport([
		{
			id,
			title: "A",
			deadline: null
		},
		{
			id,
			title: "B",
			deadline: "2026-08-10"
		},
		{
			title: "C",
			deadline: null
		},
		{
			title: "",
			deadline: null
		},
		{
			title: "D",
			deadline: "bad"
		}
	]);
	assert(result.tasks.length === 3 && result.repaired === 2 && result.skipped === 2, JSON.stringify(result));
});
test("normalized task keys exactly match TASK_FIELDS", () => assert(Object.keys(normalizeTask({
	id: "x",
	title: "X",
	deadline: null
})).join("|") === TASK_FIELDS.join("|"), "schema drift"));
test("parser keys map to task fields or explicit parser-only keys", () => {
	const parsed = parseNaturalTask("Report tomorrow !high #work for 30m", reference);
	Object.keys(parsed).forEach((key) => assert(PARSER_ONLY_KEYS.includes(key) || TASK_FIELDS.includes(PARSER_FIELD_MAP[key]), `unmapped ${key}`));
	const normalized = normalizeTask({
		id: crypto.randomUUID(),
		...buildQuickAddTask(parsed, reference)
	});
	assert(normalized.priority === "high" && normalized.tags.includes("work") && normalized.duration.value === 30, "round-trip lost data");
});
test("filter and sort pipeline handles 2,000 tasks", () => {
	const many = Array.from({ length: 2e3 }, (_, index) => task({
		id: crypto.randomUUID(),
		title: `Task ${index}`,
		priority: index % 4 === 0 ? "high" : null
	}));
	const started = performance.now();
	assert(filterTasks(many, DEFAULT_FILTERS).sort(buildComparator({
		sortBy: "priority",
		sortDir: "asc"
	})).length === 2e3 && performance.now() - started < 1e3, "pipeline stalled");
});
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
//#endregion
export {};
