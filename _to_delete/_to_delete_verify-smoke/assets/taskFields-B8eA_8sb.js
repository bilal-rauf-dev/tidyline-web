import { p as toDateStr, t as daysUntil } from "./dates-OcvPtNgq.js";
//#region src/utils/taskFields.js
var ENERGY_LEVEL_OPTIONS = [
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
];
var ENERGY_LEVELS = new Set(ENERGY_LEVEL_OPTIONS.map((option) => option.value).filter(Boolean));
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
function validateStartDate(startDate, deadline) {
	if (!startDate) return "";
	if (!deadline) return "Choose a deadline before adding a start date.";
	if (startDate <= deadline) return "";
	return "Start date cannot be after the deadline.";
}
function applyTaskUpdates(task, updates, source = "edit", at = (/* @__PURE__ */ new Date()).toISOString()) {
	const deadline = updates.deadline ?? task.deadline;
	const startDate = updates.startDate === void 0 ? task.startDate : updates.startDate || null;
	if (validateStartDate(startDate, deadline)) return task;
	const next = {
		...task,
		...updates,
		startDate,
		energyLevel: updates.energyLevel === void 0 ? task.energyLevel : normalizeEnergyLevel(updates.energyLevel)
	};
	if (updates.deadline && task.deadline && updates.deadline > task.deadline) next.postponeHistory = [...task.postponeHistory ?? [], {
		from: task.deadline,
		to: updates.deadline,
		at,
		source
	}];
	return next;
}
function isTaskUpcoming(task, referenceDate = /* @__PURE__ */ new Date()) {
	return Boolean(task.startDate && task.startDate > toDateStr(referenceDate));
}
function isTaskPlannedForToday(task, referenceDate = /* @__PURE__ */ new Date()) {
	return task.plannedDate === toDateStr(referenceDate);
}
function shiftStartDateForDeadline(startDate, currentDeadline, nextDeadline) {
	if (!startDate || !currentDeadline || !nextDeadline) return null;
	const leadDays = Math.max(0, daysUntil(currentDeadline, /* @__PURE__ */ new Date(`${startDate}T00:00:00`)));
	const shifted = /* @__PURE__ */ new Date(`${nextDeadline}T00:00:00`);
	shifted.setDate(shifted.getDate() - leadDays);
	return toDateStr(shifted);
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
function getPostponeSummary(task) {
	const history = normalizePostponeHistory(task.postponeHistory);
	return {
		count: history.length,
		originalDeadline: task.originalDeadline ?? history[0]?.from ?? task.deadline
	};
}
//#endregion
export { isTaskUpcoming as a, normalizePostponeHistory as c, validateStartDate as d, isTaskPlannedForToday as i, normalizeStartDate as l, applyTaskUpdates as n, normalizeEnergyLevel as o, getPostponeSummary as r, normalizePlannedDate as s, ENERGY_LEVEL_OPTIONS as t, shiftStartDateForDeadline as u };
