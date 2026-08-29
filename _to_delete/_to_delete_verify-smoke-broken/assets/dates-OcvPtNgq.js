//#region src/utils/calendar.js
var WEEKDAY_LABELS = [
	"S",
	"M",
	"T",
	"W",
	"T",
	"F",
	"S"
];
function toDateStr(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getMonthWeeks(viewDate) {
	const year = viewDate.getFullYear();
	const month = viewDate.getMonth();
	const firstOfMonth = new Date(year, month, 1);
	const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
	const days = [];
	for (let i = 0; i < 42; i += 1) {
		const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
		days.push({
			dateStr: toDateStr(date),
			day: date.getDate(),
			inMonth: date.getMonth() === month
		});
	}
	const weeks = [];
	for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
	return weeks;
}
function groupTasksByDate(tasks) {
	const grouped = {};
	tasks.forEach((task) => {
		if (!task.deadline) return;
		if (!grouped[task.deadline]) grouped[task.deadline] = [];
		grouped[task.deadline].push(task);
	});
	return grouped;
}
function formatMonthLabel(date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric"
	}).format(date);
}
function addMonths(date, delta) {
	return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
function todayDateStr() {
	return toDateStr(/* @__PURE__ */ new Date());
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
/** Concrete instant a date-only deadline is considered due. */
function deadlineMoment(deadline) {
	const at = /* @__PURE__ */ new Date(`${deadline}T00:00:00`);
	at.setHours(9, 0, 0, 0);
	return at;
}
function formatDate(value) {
	const date = /* @__PURE__ */ new Date(`${value}T00:00:00`);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	}).format(date);
}
function getDeadlineParts(value) {
	const date = /* @__PURE__ */ new Date(`${value}T00:00:00`);
	return {
		day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date),
		month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
	};
}
function formatDateTime(value) {
	const date = new Date(value);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(date);
}
/** Human countdown, derived from daysUntil — not a second diff implementation. */
function getCountdownLabel(deadline, referenceDate = /* @__PURE__ */ new Date()) {
	const days = daysUntil(deadline, referenceDate);
	if (days === 0) return "today";
	if (days === 1) return "tomorrow";
	if (days === -1) return "1 day overdue";
	if (days < 0) return `${Math.abs(days)} days overdue`;
	return `${days} days left`;
}
//#endregion
export { getCountdownLabel as a, WEEKDAY_LABELS as c, getMonthWeeks as d, groupTasksByDate as f, formatDateTime as i, addMonths as l, todayDateStr as m, deadlineMoment as n, getDeadlineParts as o, toDateStr as p, formatDate as r, startOfDay as s, daysUntil as t, formatMonthLabel as u };
