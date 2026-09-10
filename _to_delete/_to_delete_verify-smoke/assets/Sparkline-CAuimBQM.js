import { p as toDateStr } from "./dates-OcvPtNgq.js";
import { a as isTaskUpcoming } from "./taskFields-B8eA_8sb.js";
import { a as groupTasksByBucket, n as BUCKET_ORDER, t as BUCKET_LABELS } from "./buckets-CeS2d1pg.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/utils/analytics.js
var HEATMAP_DAYS = 70;
var BUSIEST_WINDOW_DAYS = 14;
var COMPLETION_HISTORY_DAYS = 14;
var WEEK_MS = 6048e5;
function startOfToday() {
	const today = /* @__PURE__ */ new Date();
	today.setHours(0, 0, 0, 0);
	return today;
}
function getCompletionStat(tasks) {
	const done = tasks.filter((task) => task.done).length;
	const total = tasks.length;
	return {
		done,
		total,
		percent: total === 0 ? 0 : Math.round(done / total * 100)
	};
}
/**
* Top buckets by task count, with per-bucket completion.
* Feeds the ring-stat tiles.
*/
function getTopBuckets(tasks, limit = 2, bucketOrder = BUCKET_ORDER) {
	const grouped = groupTasksByBucket(tasks, /* @__PURE__ */ new Date(), void 0, bucketOrder);
	return bucketOrder.map((bucket) => {
		const list = grouped[bucket];
		const done = list.filter((task) => task.done).length;
		return {
			bucket,
			label: BUCKET_LABELS[bucket],
			done,
			total: list.length
		};
	}).sort((a, b) => b.total - a.total).slice(0, limit);
}
/**
* Per-bucket count plus a week-over-week delta.
*
* "Last week" is reconstructed rather than recorded: tasks that already
* existed a week ago (by createdAt) are re-bucketed against a reference date
* of today-7d. No new task fields are introduced.
*/
function getBucketTrends(tasks, bucketOrder = BUCKET_ORDER) {
	const now = /* @__PURE__ */ new Date();
	const lastWeek = /* @__PURE__ */ new Date(now.getTime() - WEEK_MS);
	const current = groupTasksByBucket(tasks, now, void 0, bucketOrder);
	const existedLastWeek = tasks.filter((task) => new Date(task.createdAt) <= lastWeek);
	const prior = groupTasksByBucket(existedLastWeek, lastWeek, void 0, bucketOrder);
	return bucketOrder.map((bucket) => ({
		bucket,
		label: BUCKET_LABELS[bucket],
		count: current[bucket].length,
		delta: current[bucket].length - prior[bucket].length
	}));
}
/**
* Day cells for the activity grid.
*
* state: 'active'  — a completed task falls on this day
*        'overdue' — a still-undone task's deadline has already passed
*        'empty'   — neither
* Overdue wins over active when a day has both, since it is the actionable one.
*/
function getActivityHeatmap(tasks, days = HEATMAP_DAYS) {
	const today = startOfToday();
	const todayStr = toDateStr(today);
	const completed = /* @__PURE__ */ new Set();
	const overdue = /* @__PURE__ */ new Set();
	tasks.forEach((task) => {
		if (task.done) completed.add(task.deadline);
		else if (task.status !== "waiting" && !isTaskUpcoming(task, today) && task.deadline < todayStr) overdue.add(task.deadline);
	});
	const start = new Date(today);
	start.setDate(start.getDate() - (days - 1));
	const cells = [];
	for (let i = 0; i < start.getDay(); i += 1) cells.push(null);
	for (let i = 0; i < days; i += 1) {
		const date = new Date(start);
		date.setDate(start.getDate() + i);
		const dateStr = toDateStr(date);
		let state = "empty";
		if (overdue.has(dateStr)) state = "overdue";
		else if (completed.has(dateStr)) state = "active";
		cells.push({
			dateStr,
			state
		});
	}
	return cells;
}
function summarizeHeatmap(cells) {
	const real = cells.filter(Boolean);
	return {
		activeDays: real.filter((cell) => cell.state === "active").length,
		overdueDays: real.filter((cell) => cell.state === "overdue").length
	};
}
/**
* Deadline load per day across the next `days` days, and the heaviest of them.
* Feeds the sparkline card.
*/
function getBusiestDay(tasks, days = BUSIEST_WINDOW_DAYS) {
	const today = startOfToday();
	const counts = /* @__PURE__ */ new Map();
	tasks.forEach((task) => {
		counts.set(task.deadline, (counts.get(task.deadline) ?? 0) + 1);
	});
	const series = [];
	for (let i = 0; i < days; i += 1) {
		const date = new Date(today);
		date.setDate(today.getDate() + i);
		const dateStr = toDateStr(date);
		series.push({
			dateStr,
			count: counts.get(dateStr) ?? 0
		});
	}
	const total = series.reduce((sum, point) => sum + point.count, 0);
	let peakIndex = 0;
	series.forEach((point, index) => {
		if (point.count > series[peakIndex].count) peakIndex = index;
	});
	return {
		series,
		total,
		peakIndex,
		peakCount: series[peakIndex].count,
		peakDate: series[peakIndex].dateStr,
		windowDays: days
	};
}
/**
* Actual completions per day, using completedAt rather than reconstructing
* history from current task state. Older tasks without completedAt simply do
* not contribute, which keeps the chart honest.
*/
function getCompletionHistory(tasks, days = COMPLETION_HISTORY_DAYS) {
	const today = startOfToday();
	const counts = /* @__PURE__ */ new Map();
	tasks.forEach((task) => {
		if (!task.done || !task.completedAt) return;
		const dateStr = task.completedAt.slice(0, 10);
		counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1);
	});
	const series = [];
	for (let offset = days - 1; offset >= 0; offset -= 1) {
		const date = new Date(today);
		date.setDate(today.getDate() - offset);
		const dateStr = toDateStr(date);
		series.push({
			dateStr,
			count: counts.get(dateStr) ?? 0
		});
	}
	const total = series.reduce((sum, point) => sum + point.count, 0);
	let peakIndex = 0;
	series.forEach((point, index) => {
		if (point.count > series[peakIndex].count) peakIndex = index;
	});
	return {
		series,
		total,
		peakIndex,
		peakCount: series[peakIndex]?.count ?? 0,
		peakDate: series[peakIndex]?.dateStr ?? toDateStr(today),
		windowDays: days
	};
}
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
//#region src/components/RingStat.jsx
var STROKE = 6;
/**
* Circular progress tile: ring + label + bold-numerator fraction.
* Reusable primitive — see design.md "Chart primitives".
*/
function RingStat({ value, total, label, size = 64 }) {
	const radius = (size - STROKE) / 2;
	const circumference = 2 * Math.PI * radius;
	const filled = total > 0 ? value / total * circumference : 0;
	const center = size / 2;
	return /* @__PURE__ */ jsxs("div", {
		className: "ring-tile",
		children: [
			/* @__PURE__ */ jsxs("svg", {
				width: size,
				height: size,
				viewBox: `0 0 ${size} ${size}`,
				"aria-hidden": "true",
				children: [/* @__PURE__ */ jsx("circle", {
					className: "ring-track",
					cx: center,
					cy: center,
					r: radius,
					fill: "none",
					strokeWidth: STROKE
				}), /* @__PURE__ */ jsx("circle", {
					className: "ring-fill",
					cx: center,
					cy: center,
					r: radius,
					fill: "none",
					strokeWidth: STROKE,
					strokeDasharray: `${filled} ${circumference}`,
					transform: `rotate(-90 ${center} ${center})`
				})]
			}),
			/* @__PURE__ */ jsx("span", {
				className: "ring-tile-label",
				children: label
			}),
			/* @__PURE__ */ jsxs("span", {
				className: "ring-tile-fraction",
				children: [
					/* @__PURE__ */ jsx("strong", { children: value }),
					"/",
					total
				]
			})
		]
	});
}
//#endregion
//#region src/components/MilestoneBar.jsx
var DEFAULT_MILESTONES = [
	25,
	50,
	75
];
function labelShift(point) {
	if (point === 0) return "translateX(0)";
	if (point === 100) return "translateX(-100%)";
	return "translateX(-50%)";
}
/**
* Horizontal completion bar with milestone tick marks.
* Reusable primitive — see design.md "Chart primitives".
*/
function MilestoneBar({ percent, milestones = DEFAULT_MILESTONES, label }) {
	const points = [
		0,
		...milestones,
		100
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "milestone",
		children: [
			label && /* @__PURE__ */ jsx("span", {
				className: "milestone-label",
				children: label
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "milestone-track",
				children: [/* @__PURE__ */ jsx("div", {
					className: "milestone-fill",
					style: { width: `${percent}%` }
				}), milestones.map((milestone) => /* @__PURE__ */ jsx("span", {
					className: "milestone-tick",
					style: { left: `${milestone}%` }
				}, milestone))]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "milestone-scale",
				"aria-hidden": "true",
				children: points.map((point) => /* @__PURE__ */ jsxs("span", {
					style: {
						left: `${point}%`,
						transform: labelShift(point)
					},
					children: [point, "%"]
				}, point))
			})
		]
	});
}
//#endregion
//#region src/components/ActivityGrid.jsx
/**
* Day-of-week dot grid. Solid = completed activity, hatched = overdue,
* outlined = nothing. Reusable primitive — see design.md "Chart primitives".
*/
function ActivityGrid({ cells, label }) {
	return /* @__PURE__ */ jsx("div", {
		className: "activity-grid",
		"aria-label": label,
		children: cells.map((cell, index) => cell === null ? /* @__PURE__ */ jsx("span", { className: "activity-dot blank" }, `blank-${index}`) : /* @__PURE__ */ jsx("span", {
			className: `activity-dot ${cell.state}`,
			title: cell.dateStr
		}, cell.dateStr))
	});
}
//#endregion
//#region src/components/Sparkline.jsx
var PAD = 5;
/**
* Small flat line chart with an optional highlighted peak point.
* Reusable primitive — see design.md "Chart primitives".
*/
function Sparkline({ series, peakIndex, width = 240, height = 62 }) {
	if (series.length === 0) return null;
	const max = Math.max(1, ...series.map((point) => point.count));
	const innerHeight = height - 10;
	const stepX = series.length > 1 ? width / (series.length - 1) : 0;
	const coords = series.map((point, index) => [index * stepX, PAD + innerHeight - point.count / max * innerHeight]);
	const peak = coords[peakIndex];
	return /* @__PURE__ */ jsxs("svg", {
		className: "sparkline",
		width: "100%",
		height,
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "none",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ jsx("polyline", {
			className: "sparkline-line",
			fill: "none",
			points: coords.map(([x, y]) => `${x},${y}`).join(" "),
			vectorEffect: "non-scaling-stroke"
		}), peak && /* @__PURE__ */ jsx("circle", {
			className: "sparkline-peak",
			cx: peak[0],
			cy: peak[1],
			r: "3.5"
		})]
	});
}
//#endregion
export { getActivityHeatmap as a, getCompletionHistory as c, getTopBuckets as d, summarizeHeatmap as f, RingStat as i, getCompletionStat as l, ActivityGrid as n, getBucketTrends as o, MilestoneBar as r, getBusiestDay as s, Sparkline as t, getPostponeAnalytics as u };
