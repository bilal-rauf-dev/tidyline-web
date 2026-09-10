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
//#region src/utils/risk.js
function durationToMinutes(duration, fallback = 0) {
	if (!duration || !Number.isFinite(Number(duration.value))) return fallback;
	return duration.unit === "hr" ? Number(duration.value) * 60 : Number(duration.value);
}
/**
* Directional deadline-risk heuristic, deliberately capped at 100.
*
* Weighting:
* - Time pressure is dominant (0–55): overdue/today 55, 1 day 40, 2 days 30,
*   3–7 days 18, 8–14 days 8.
* - Estimated effort adds 0–20: 1h 6, 2h 12, 4h+ 20.
* - Incomplete checklist work adds 4 each, capped at 20.
* - Each recorded postponement adds 5, capped at 15.
* - Same-day workload adds 0–20: 3h 6, 5h 12, 8h+ 20. Unestimated
*   same-day tasks conservatively count as 30 minutes.
* - Energy adds 0/3/8 for low/normal/deep-focus because focus-heavy work is
*   harder to fit into a shrinking window.
*
* Thresholds: under 25 = low risk, 25–49 = getting tight, 50+ = at risk.
* This is not a prediction and is never stored on the task; it recomputes from
* current time and board context on every render/tick.
*/
function getDeadlineRisk(task, tasks, referenceDate = /* @__PURE__ */ new Date()) {
	if (!task.deadline || task.done || task.archived || task.status === "waiting") return null;
	const days = daysUntil(task.deadline, referenceDate);
	let score = days <= 0 ? 55 : days === 1 ? 40 : days === 2 ? 30 : days <= 7 ? 18 : days <= 14 ? 8 : 0;
	const effort = durationToMinutes(task.duration);
	score += effort >= 240 ? 20 : effort >= 120 ? 12 : effort >= 60 ? 6 : 0;
	const incomplete = (task.checklist ?? []).filter((item) => !item.done).length;
	score += Math.min(20, incomplete * 4);
	score += Math.min(15, (task.postponeHistory?.length ?? 0) * 5);
	const sameDayMinutes = tasks.filter((entry) => entry.deadline === task.deadline && !entry.done && !entry.archived && entry.status !== "waiting").reduce((total, entry) => total + durationToMinutes(entry.duration, 30), 0);
	score += sameDayMinutes >= 480 ? 20 : sameDayMinutes >= 300 ? 12 : sameDayMinutes >= 180 ? 6 : 0;
	score += task.energyLevel === "deep-focus" ? 8 : task.energyLevel === "normal" ? 3 : 0;
	score = Math.min(100, score);
	if (score >= 50) return {
		level: "at-risk",
		label: "At risk",
		score
	};
	if (score >= 25) return {
		level: "tight",
		label: "Getting tight",
		score
	};
	return {
		level: "low",
		label: "Low risk",
		score
	};
}
function getDayWorkload(tasks, overloadHours = 6) {
	const active = tasks.filter((task) => !task.done && !task.archived && task.status !== "waiting");
	const estimatedMinutes = active.reduce((total, task) => total + durationToMinutes(task.duration), 0);
	return {
		estimatedMinutes,
		unestimated: active.filter((task) => !task.duration).length,
		overloaded: estimatedMinutes > overloadHours * 60
	};
}
function nearbyDates(sourceDate, count = 3) {
	const source = /* @__PURE__ */ new Date(`${sourceDate}T00:00:00`);
	return Array.from({ length: count }, (_, index) => {
		const date = new Date(source);
		date.setDate(source.getDate() + index + 1);
		return toDateStr(date);
	});
}
/** Flexible means it is actionable but carries no explicit stability signal. */
function isFlexibleTask(task) {
	return !task.done && !task.archived && !task.pinned && task.status !== "waiting" && !task.recurrence && !task.scheduledStart;
}
function buildRedistributionPlan(tasks, sourceDate, overloadHours = 6) {
	const candidates = nearbyDates(sourceDate);
	const loads = new Map(candidates.map((date) => [date, getDayWorkload(tasks.filter((task) => task.deadline === date), overloadHours).estimatedMinutes]));
	let sourceMinutes = getDayWorkload(tasks.filter((task) => task.deadline === sourceDate), overloadHours).estimatedMinutes;
	const flexible = tasks.filter((task) => task.deadline === sourceDate && isFlexibleTask(task)).sort((a, b) => durationToMinutes(b.duration) - durationToMinutes(a.duration));
	const proposals = [];
	for (const task of flexible) {
		if (sourceMinutes <= overloadHours * 60) break;
		const target = candidates.filter((date) => !task.startDate || task.startDate <= date).sort((a, b) => loads.get(a) - loads.get(b))[0];
		if (!target) continue;
		const minutes = durationToMinutes(task.duration);
		if (minutes <= 0 || loads.get(target) >= sourceMinutes) continue;
		proposals.push({
			task,
			from: sourceDate,
			to: target,
			minutes
		});
		sourceMinutes -= minutes;
		loads.set(target, loads.get(target) + minutes);
	}
	return {
		sourceDate,
		proposals,
		remainingMinutes: sourceMinutes
	};
}
new Set([
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
function isTaskUpcoming(task, referenceDate = /* @__PURE__ */ new Date()) {
	return Boolean(task.startDate && task.startDate > toDateStr(referenceDate));
}
function isTaskPlannedForToday(task, referenceDate = /* @__PURE__ */ new Date()) {
	return task.plannedDate === toDateStr(referenceDate);
}
Number.POSITIVE_INFINITY;
//#endregion
//#region src/utils/analytics.js
function getPostponeAnalytics(tasks, limit = 5) {
	const totalPostponements = tasks.reduce((total, task) => total + (task.postponeHistory?.length ?? 0), 0);
	const delayedTasks = tasks.filter((task) => (task.postponeHistory?.length ?? 0) > 0);
	const topTasks = [...delayedTasks].sort((a, b) => b.postponeHistory.length - a.postponeHistory.length || a.title.localeCompare(b.title)).slice(0, limit);
	const tagCounts = /* @__PURE__ */ new Map();
	tasks.forEach((task) => {
		const count = task.postponeHistory?.length ?? 0;
		if (count === 0) return;
		(task.tags ?? []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + count));
	});
	const tags = [...tagCounts.entries()].map(([tag, count]) => ({
		bucket: tag,
		label: tag,
		count,
		delta: 0
	})).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
	return {
		totalPostponements,
		delayedTaskCount: delayedTasks.length,
		average: tasks.length === 0 ? 0 : totalPostponements / tasks.length,
		topTasks,
		tags
	};
}
//#endregion
//#region src/utils/shutdown.js
function getDailyShutdown(tasks, referenceDate = /* @__PURE__ */ new Date()) {
	const today = toDateStr(referenceDate);
	const dayTasks = tasks.filter((task) => task.deadline && !task.archived && task.status !== "waiting" && !isTaskUpcoming(task, referenceDate) && (task.deadline === today || isTaskPlannedForToday(task, referenceDate)));
	return {
		date: today,
		tasks: dayTasks,
		completed: dayTasks.filter((task) => task.done).length,
		unfinished: dayTasks.filter((task) => !task.done)
	};
}
//#endregion
//#region scripts/phase3-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var now = new Date(2026, 7, 4);
var base = {
	done: false,
	archived: false,
	status: "active",
	checklist: [],
	postponeHistory: []
};
var easy = {
	...base,
	id: "easy",
	title: "Easy",
	deadline: "2026-08-20"
};
var risky = {
	...base,
	id: "risky",
	title: "Risky",
	deadline: "2026-08-05",
	duration: {
		value: 4,
		unit: "hr"
	},
	energyLevel: "deep-focus",
	checklist: [{ done: false }, { done: false }],
	postponeHistory: [{
		from: "2026-08-01",
		to: "2026-08-05"
	}]
};
assert(getDeadlineRisk(risky, [easy, risky], now).score > getDeadlineRisk(easy, [easy, risky], now).score, "Risk score did not rise with time, effort, checklist, energy, and postponement pressure");
assert(getDeadlineRisk({
	...risky,
	status: "waiting"
}, [risky], now) === null, "Waiting task received an actionable risk label");
var workloadTasks = [{
	...base,
	id: "move",
	title: "Flexible",
	deadline: "2026-08-05",
	duration: {
		value: 4,
		unit: "hr"
	},
	pinned: false,
	recurrence: null,
	scheduledStart: null
}, {
	...base,
	id: "fixed",
	title: "Pinned",
	deadline: "2026-08-05",
	duration: {
		value: 4,
		unit: "hr"
	},
	pinned: true,
	recurrence: null,
	scheduledStart: null
}];
assert(getDayWorkload(workloadTasks, 6).overloaded, "Eight-hour day was not flagged overloaded");
var plan = buildRedistributionPlan(workloadTasks, "2026-08-05", 6);
assert(plan.proposals.length === 1 && plan.proposals[0].task.id === "move", "Redistribution moved a constrained task or missed a flexible one");
var analytics = getPostponeAnalytics([
	{
		...base,
		id: "a",
		title: "A",
		tags: ["study"],
		postponeHistory: [{}, {}]
	},
	{
		...base,
		id: "b",
		title: "B",
		tags: ["study", "work"],
		postponeHistory: [{}]
	},
	{
		...base,
		id: "c",
		title: "C",
		tags: [],
		postponeHistory: []
	}
]);
assert(analytics.average === 1, "Average postponements was not calculated across all tasks");
assert(analytics.tags[0].label === "study" && analytics.tags[0].count === 3, "Tag delay aggregation was incorrect");
var today = "2026-08-04";
var shutdown = getDailyShutdown([
	{
		...base,
		id: "due",
		deadline: today
	},
	{
		...base,
		id: "done",
		deadline: today,
		done: true
	},
	{
		...base,
		id: "waiting",
		deadline: today,
		status: "waiting"
	},
	{
		...base,
		id: "idea",
		deadline: null
	}
], now);
assert(shutdown.tasks.length === 2 && shutdown.completed === 1, "Shutdown totals included waiting or deadline-free work");
console.log("ok    Phase 3 risk, workload, postpone analytics, and shutdown rules");
//#endregion
export {};
