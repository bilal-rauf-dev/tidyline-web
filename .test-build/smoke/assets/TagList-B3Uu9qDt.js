import { n as estimateTaskDuration } from "./calibration-qStEAgJC.js";
import { f as toDateStr, o as startOfDay, t as daysUntil } from "./dates-DhUD90mg.js";
import { jsx, jsxs } from "react/jsx-runtime";
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
//#region src/utils/tags.js
var TAG_TONES = [
	"lavender",
	"accent",
	"neutral"
];
function parseTags(input) {
	return [...new Set(input.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}
/**
* Deterministic tone per tag, drawn only from the existing palette.
* Same tag always gets the same tone across the app.
*/
function tagTone(tag) {
	let hash = 0;
	for (let i = 0; i < tag.length; i += 1) hash = hash * 31 + tag.charCodeAt(i) >>> 0;
	return TAG_TONES[hash % TAG_TONES.length];
}
function collectTags(tasks) {
	const all = /* @__PURE__ */ new Set();
	tasks.forEach((task) => {
		(task.tags ?? []).forEach((tag) => all.add(tag));
	});
	return [...all].sort();
}
//#endregion
//#region src/components/TagList.jsx
/**
* Flat left-bordered tag marks. Never pill-shaped — see design.md.
*/
function TagList({ tags, onRemove }) {
	if (!tags || tags.length === 0) return null;
	return /* @__PURE__ */ jsx("ul", {
		className: "tag-list",
		children: tags.map((tag) => /* @__PURE__ */ jsxs("li", {
			className: `tag tag-${tagTone(tag)}`,
			children: [/* @__PURE__ */ jsx("span", { children: tag }), onRemove && /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: () => onRemove(tag),
				"aria-label": `Remove tag ${tag}`,
				children: "×"
			})]
		}, tag))
	});
}
//#endregion
export { deriveStartBy as a, getTaskAttentionDate as c, tagTone as i, getTaskTimingLabel as l, collectTags as n, getDayWorkload as o, parseTags as r, getFitAssessment as s, TagList as t };
