import { t as daysUntil } from "./dates-OcvPtNgq.js";
import { a as isTaskUpcoming, i as isTaskPlannedForToday } from "./taskFields-B8eA_8sb.js";
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
export { isOverdue as n, overdueSeverity as r, groupOverdue as t };
