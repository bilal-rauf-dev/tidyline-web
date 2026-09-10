import { existsSync, readFileSync } from "node:fs";
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
//#region src/utils/ics.js
var encoder = new TextEncoder();
var WEEKDAYS = [
	"SU",
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA"
];
function escapeText(value) {
	return String(value ?? "").replace(/\\/g, "\\\\").replace(/\r\n|\n|\r/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}
function foldLine(line) {
	const parts = [];
	let part = "";
	let bytes = 0;
	for (const character of line) {
		const size = encoder.encode(character).length;
		if (part && bytes + size > 75) {
			parts.push(part);
			part = ` ${character}`;
			bytes = 1 + size;
		} else {
			part += character;
			bytes += size;
		}
	}
	parts.push(part);
	return parts.join("\r\n");
}
function utcStamp(value) {
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime())) return null;
	return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function recurrenceRule(recurrence) {
	if (!recurrence) return null;
	switch (recurrence.freq) {
		case "daily": return "FREQ=DAILY";
		case "weekdays": return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
		case "weekly": return `FREQ=WEEKLY;BYDAY=${WEEKDAYS[recurrence.weekday ?? 1]}`;
		case "monthly": return "FREQ=MONTHLY";
		case "yearly": return "FREQ=YEARLY";
		case "everyNDays": return `FREQ=DAILY;INTERVAL=${Math.max(1, Math.floor(Number(recurrence.n) || 2))}`;
		default: return null;
	}
}
function alarmLines(reminder, task) {
	let trigger = null;
	if (reminder.kind === "relative" && task.deadline) trigger = `TRIGGER:-PT${Math.max(1, Math.floor(reminder.minutesBefore))}M`;
	if (reminder.kind === "absolute") {
		const at = utcStamp(reminder.at);
		if (at) trigger = `TRIGGER;VALUE=DATE-TIME:${at}`;
	}
	if (!trigger) return [];
	return [
		"BEGIN:VALARM",
		trigger,
		"ACTION:DISPLAY",
		`DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
		"END:VALARM"
	];
}
function eventLines(task, timestamp) {
	if (!task.deadline) return [];
	const start = utcStamp(deadlineMoment(task.deadline));
	if (!start) return [];
	const lines = [
		"BEGIN:VEVENT",
		`UID:${escapeText(`${task.id}@tasks.tidyline.local`)}`,
		`DTSTAMP:${timestamp}`,
		`DTSTART:${start}`,
		`SUMMARY:${escapeText(task.title)}`,
		"TRANSP:TRANSPARENT",
		"STATUS:CONFIRMED"
	];
	const rule = recurrenceRule(task.recurrence);
	if (rule) lines.push(`RRULE:${rule}`);
	if (task.notes) lines.push(`DESCRIPTION:${escapeText(task.notes)}`);
	if (task.location) lines.push(`LOCATION:${escapeText(task.location)}`);
	if (task.tags?.length) lines.push(`CATEGORIES:${task.tags.map(escapeText).join(",")}`);
	task.reminders.filter((reminder) => reminder.kind !== "recurring").forEach((reminder) => lines.push(...alarmLines(reminder, task)));
	lines.push("END:VEVENT");
	return lines;
}
function firstReminderOccurrence(task, reminder, referenceDate) {
	const cursor = startOfDay(referenceDate);
	const [hour, minute] = String(reminder.time ?? "09:00").split(":").map(Number);
	const anchor = task.createdAt?.slice(0, 10);
	for (let guard = 0; guard < 3660; guard += 1) {
		if (matchesRecurrence(cursor, reminder.rule, anchor)) {
			const occurrence = new Date(cursor);
			occurrence.setHours(hour || 0, minute || 0, 0, 0);
			if (occurrence >= referenceDate) return occurrence;
		}
		cursor.setDate(cursor.getDate() + 1);
	}
	return null;
}
function recurringReminderLines(task, reminder, timestamp, referenceDate) {
	const first = firstReminderOccurrence(task, reminder, referenceDate);
	const rule = recurrenceRule(reminder.rule);
	if (!first || !rule) return [];
	return [
		"BEGIN:VEVENT",
		`UID:${escapeText(`${task.id}-${reminder.id}@reminders.tidyline.local`)}`,
		`DTSTAMP:${timestamp}`,
		`DTSTART:${utcStamp(first)}`,
		`RRULE:${rule}`,
		`SUMMARY:${escapeText(`Reminder: ${task.title}`)}`,
		"DURATION:PT5M",
		"TRANSP:TRANSPARENT",
		"STATUS:CONFIRMED",
		"BEGIN:VALARM",
		"TRIGGER:PT0M",
		"ACTION:DISPLAY",
		`DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
		"END:VALARM",
		"END:VEVENT"
	];
}
function standaloneReminderLines(task, reminder, timestamp) {
	if (reminder.kind !== "absolute" || task.deadline) return [];
	const start = utcStamp(reminder.at);
	if (!start) return [];
	return [
		"BEGIN:VEVENT",
		`UID:${escapeText(`${task.id}-${reminder.id}@reminders.tidyline.local`)}`,
		`DTSTAMP:${timestamp}`,
		`DTSTART:${start}`,
		`SUMMARY:${escapeText(`Reminder: ${task.title}`)}`,
		"DURATION:PT5M",
		"TRANSP:TRANSPARENT",
		"STATUS:CONFIRMED",
		"BEGIN:VALARM",
		"TRIGGER:PT0M",
		"ACTION:DISPLAY",
		`DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
		"END:VALARM",
		"END:VEVENT"
	];
}
function serializeCalendar(tasks, { generatedAt = /* @__PURE__ */ new Date(), referenceDate = generatedAt, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } = {}) {
	const timestamp = utcStamp(generatedAt);
	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//TidyLine//Task deadlines//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"X-WR-CALNAME:TidyLine deadlines",
		`X-WR-TIMEZONE:${escapeText(timeZone)}`
	];
	tasks.filter((task) => !task.done && !task.archived).forEach((task) => {
		lines.push(...eventLines(task, timestamp));
		task.reminders.filter((reminder) => reminder.kind === "recurring").forEach((reminder) => lines.push(...recurringReminderLines(task, reminder, timestamp, referenceDate)));
		task.reminders.filter((reminder) => reminder.kind === "absolute").forEach((reminder) => lines.push(...standaloneReminderLines(task, reminder, timestamp)));
	});
	lines.push("END:VCALENDAR");
	return `${lines.map(foldLine).join("\r\n")}\r\n`;
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
//#region scripts/phase6-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var generatedAt = /* @__PURE__ */ new Date("2026-08-21T05:00:00.000Z");
var calendar = serializeCalendar([
	normalizeTask({
		id: "report",
		title: "Report, review; ship",
		deadline: "2026-08-24",
		notes: "First line\nSecond line",
		recurrence: {
			freq: "weekly",
			weekday: 1
		},
		reminders: [
			{
				kind: "relative",
				minutesBefore: 30
			},
			{
				kind: "absolute",
				at: "2026-08-23T08:15:00.000Z"
			},
			{
				kind: "recurring",
				rule: { freq: "weekdays" },
				time: "08:00"
			}
		],
		createdAt: "2026-08-01T09:00:00.000Z"
	}),
	normalizeTask({
		id: "done",
		title: "Done",
		deadline: "2026-08-25",
		done: true
	}),
	normalizeTask({
		id: "reminder-only",
		title: "No deadline",
		deadline: null,
		reminders: [{
			kind: "absolute",
			at: "2026-08-22T07:00:00.000Z"
		}]
	}),
	...[
		[
			"daily",
			{ freq: "daily" },
			"FREQ=DAILY"
		],
		[
			"monthly",
			{ freq: "monthly" },
			"FREQ=MONTHLY"
		],
		[
			"yearly",
			{ freq: "yearly" },
			"FREQ=YEARLY"
		],
		[
			"interval",
			{
				freq: "everyNDays",
				n: 3
			},
			"FREQ=DAILY;INTERVAL=3"
		]
	].map(([id, recurrence]) => normalizeTask({
		id,
		title: id,
		deadline: "2026-08-26",
		recurrence
	}))
], {
	generatedAt,
	referenceDate: generatedAt,
	timeZone: "Asia/Karachi"
});
assert(calendar.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"), "ICS envelope is invalid");
assert(calendar.endsWith("END:VCALENDAR\r\n"), "ICS does not end with CRLF");
assert(calendar.includes("X-WR-TIMEZONE:Asia/Karachi"), "Device timezone metadata is missing");
assert(calendar.includes("DTSTAMP:20260821T050000Z"), "UTC generation timestamp is invalid");
assert(calendar.includes("SUMMARY:Report\\, review\\; ship"), "ICS text was not escaped");
assert(calendar.includes("DESCRIPTION:First line\\nSecond line"), "ICS newlines were not escaped");
assert(calendar.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"), "Task recurrence was not exported");
assert(calendar.includes("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"), "Recurring reminder was not exported");
[
	"FREQ=DAILY",
	"FREQ=MONTHLY",
	"FREQ=YEARLY",
	"FREQ=DAILY;INTERVAL=3"
].forEach((rule) => {
	assert(calendar.includes(`RRULE:${rule}`), `Recurrence rule ${rule} was not exported`);
});
assert(calendar.includes("TRIGGER:-PT30M"), "Relative reminder alarm is missing");
assert(calendar.includes("TRIGGER;VALUE=DATE-TIME:20260823T081500Z"), "Absolute reminder alarm is missing");
assert(calendar.includes("UID:reminder-only-"), "Reminder without a deadline was dropped");
assert(!calendar.includes("UID:done@"), "Completed task leaked into calendar export");
assert(calendar.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75), "ICS line folding exceeded 75 bytes");
var repositoryRoot = new URL("../../", import.meta.url);
var manifest = JSON.parse(readFileSync(new URL("public/manifest.webmanifest", repositoryRoot), "utf8"));
var indexHtml = readFileSync(new URL("index.html", repositoryRoot), "utf8");
assert(manifest.name === "TidyLine" && manifest.display === "standalone", "PWA manifest identity is invalid");
assert(manifest.start_url === "/" && manifest.scope === "/", "PWA manifest navigation boundary is invalid");
assert(manifest.icons.some((icon) => icon.type === "image/png" && icon.sizes === "1254x1254"), "PWA icon metadata is missing");
assert(existsSync(new URL("public/logo.png", repositoryRoot)), "PWA icon asset is missing");
assert(indexHtml.includes("rel=\"manifest\" href=\"/manifest.webmanifest\""), "Document does not link the manifest");
console.log("ok    ICS structure, alarms, recurrence, folding, and PWA metadata");
//#endregion
export {};
