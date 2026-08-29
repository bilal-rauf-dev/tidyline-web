import { f as toDateStr, i as formatDateTime, n as deadlineMoment, o as startOfDay } from "./dates-DhUD90mg.js";
//#region src/utils/recurrence.js
var WEEKDAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday"
];
var RECURRENCE_FREQUENCIES = [
	{
		value: "daily",
		label: "Daily"
	},
	{
		value: "weekdays",
		label: "Every weekday"
	},
	{
		value: "weekly",
		label: "Weekly on…"
	},
	{
		value: "monthly",
		label: "Monthly"
	},
	{
		value: "yearly",
		label: "Yearly"
	},
	{
		value: "everyNDays",
		label: "Every N days"
	}
];
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
function describeRecurrence(recurrence) {
	if (!recurrence) return "Does not repeat";
	switch (recurrence.freq) {
		case "daily": return "Repeats daily";
		case "weekdays": return "Repeats every weekday";
		case "weekly": return `Repeats every ${WEEKDAY_NAMES[recurrence.weekday ?? 1]}`;
		case "monthly": return "Repeats monthly";
		case "yearly": return "Repeats yearly";
		case "everyNDays": return `Repeats every ${Math.max(1, recurrence.n ?? 2)} days`;
		default: return "Repeats";
	}
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
/**
* Reminder kinds:
*  - absolute  { at }                 one concrete datetime
*  - relative  { minutesBefore }      resolved against the deadline at CHECK time
*  - recurring { rule, time }         rule reuses the recurrence model in recurrence.js
*/
var REMINDER_PRESETS = [
	{
		id: "before5",
		label: "5 minutes before",
		kind: "relative",
		minutesBefore: 5
	},
	{
		id: "before30",
		label: "30 minutes before",
		kind: "relative",
		minutesBefore: 30
	},
	{
		id: "before60",
		label: "1 hour before",
		kind: "relative",
		minutesBefore: 60
	},
	{
		id: "tomorrowAm",
		label: "Tomorrow morning",
		kind: "tomorrowMorning"
	},
	{
		id: "everyMonday",
		label: "Every Monday",
		kind: "recurring",
		rule: {
			freq: "weekly",
			weekday: 1
		}
	},
	{
		id: "everyWeekday",
		label: "Every weekday",
		kind: "recurring",
		rule: { freq: "weekdays" }
	}
];
function pad(value) {
	return String(value).padStart(2, "0");
}
function toLocalInput(date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/** Stable, deterministic id — avoids randomness during state hydration. */
function reminderKey(reminder) {
	switch (reminder.kind) {
		case "relative": return `rel:${reminder.minutesBefore}`;
		case "recurring": return `rec:${reminder.rule?.freq}:${reminder.rule?.weekday ?? ""}:${reminder.time ?? ""}`;
		default: return `abs:${reminder.at}`;
	}
}
/** Turn a preset choice into a stored reminder record. */
function buildReminder(presetId, { customAt } = {}) {
	if (presetId === "custom") return customAt ? {
		id: `abs:${customAt}`,
		kind: "absolute",
		at: customAt
	} : null;
	const preset = REMINDER_PRESETS.find((entry) => entry.id === presetId);
	if (!preset) return null;
	if (preset.kind === "tomorrowMorning") {
		const at = startOfDay();
		at.setDate(at.getDate() + 1);
		at.setHours(9, 0, 0, 0);
		const value = toLocalInput(at);
		return {
			id: `abs:${value}`,
			kind: "absolute",
			at: value
		};
	}
	if (preset.kind === "relative") return {
		id: `rel:${preset.minutesBefore}`,
		kind: "relative",
		minutesBefore: preset.minutesBefore
	};
	const record = {
		kind: "recurring",
		rule: preset.rule,
		time: `${pad(9)}:00`
	};
	return {
		...record,
		id: reminderKey(record)
	};
}
function describeReminder(reminder, task) {
	switch (reminder.kind) {
		case "relative": {
			const label = reminder.minutesBefore >= 60 ? `${reminder.minutesBefore / 60}h before` : `${reminder.minutesBefore} min before`;
			if (!task?.deadline) return label;
			return `${label} — ${formatDateTime(resolveRelative(reminder, task))}`;
		}
		case "recurring": return `${describeRecurrence(reminder.rule)} at ${reminder.time ?? "09:00"}`;
		default: return formatDateTime(reminder.at);
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
export { reminderKey as a, describeRecurrence as c, reminderInstances as i, matchesRecurrence as l, buildReminder as n, RECURRENCE_FREQUENCIES as o, describeReminder as r, WEEKDAY_NAMES as s, REMINDER_PRESETS as t, nextOccurrence as u };
