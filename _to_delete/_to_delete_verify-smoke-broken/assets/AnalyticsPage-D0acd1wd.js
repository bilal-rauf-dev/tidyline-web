import { r as formatDate } from "./dates-OcvPtNgq.js";
import { n as BUCKET_ORDER } from "./buckets-CeS2d1pg.js";
import { a as getActivityHeatmap, c as getCompletionHistory, d as getTopBuckets, f as summarizeHeatmap, i as RingStat, l as getCompletionStat, n as ActivityGrid, o as getBucketTrends, r as MilestoneBar, s as getBusiestDay, t as Sparkline, u as getPostponeAnalytics } from "./Sparkline-CAuimBQM.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
//#region src/components/TrendBars.jsx
function formatDelta(delta) {
	if (delta === 0) return "–";
	return delta > 0 ? `+${delta}` : `${delta}`;
}
/**
* One column per series entry: delta, label, height-by-count bar, count.
* A single column carries the accent; the rest stay neutral.
* Reusable primitive — see design.md "Chart primitives".
*/
function TrendBars({ entries, accentKey }) {
	const max = Math.max(1, ...entries.map((entry) => entry.count));
	return /* @__PURE__ */ jsx("div", {
		className: "trend-bars",
		children: entries.map((entry) => /* @__PURE__ */ jsxs("div", {
			className: "trend-col",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "trend-delta",
					children: formatDelta(entry.delta)
				}),
				/* @__PURE__ */ jsx("span", {
					className: "trend-label",
					children: entry.label
				}),
				/* @__PURE__ */ jsx("div", {
					className: "trend-track",
					children: /* @__PURE__ */ jsx("div", {
						className: entry.bucket === accentKey ? "trend-fill accent" : "trend-fill",
						style: { height: `${entry.count / max * 100}%` }
					})
				}),
				/* @__PURE__ */ jsx("span", {
					className: "trend-count",
					children: entry.count
				})
			]
		}, entry.bucket))
	});
}
//#endregion
//#region src/pages/AnalyticsPage.jsx
function AnalyticsPage({ tasks: allTasks, bucketOrder = BUCKET_ORDER }) {
	const tasks = useMemo(() => allTasks.filter((task) => !task.archived && task.deadline), [allTasks]);
	const completion = useMemo(() => getCompletionStat(tasks), [tasks]);
	const topBuckets = useMemo(() => getTopBuckets(tasks, 2, bucketOrder), [tasks, bucketOrder]);
	const trends = useMemo(() => getBucketTrends(tasks, bucketOrder), [tasks, bucketOrder]);
	const busiest = useMemo(() => getBusiestDay(tasks), [tasks]);
	const heatmap = useMemo(() => getActivityHeatmap(tasks), [tasks]);
	const heatmapSummary = useMemo(() => summarizeHeatmap(heatmap), [heatmap]);
	const completionHistory = useMemo(() => getCompletionHistory(tasks), [tasks]);
	const postpone = useMemo(() => getPostponeAnalytics(tasks), [tasks]);
	const busiestBucket = trends.reduce((top, entry) => entry.count > top.count ? entry : top, trends[0]);
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell analytics-shell",
		children: [/* @__PURE__ */ jsxs("header", {
			className: "hero",
			children: [/* @__PURE__ */ jsx("h1", { children: "Analytics" }), /* @__PURE__ */ jsx("p", {
				className: "hero-copy",
				children: "A read of how tasks are completed and distributed, drawn straight from your board."
			})]
		}), /* @__PURE__ */ jsxs("section", {
			className: "analytics-grid",
			"aria-label": "Analytics",
			children: [
				/* @__PURE__ */ jsxs("article", {
					className: "entry-card analytics-progress",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Tasks completed" }),
						/* @__PURE__ */ jsxs("div", {
							className: "analytics-progress-stat",
							children: [/* @__PURE__ */ jsxs("strong", { children: [completion.percent, "%"] }), /* @__PURE__ */ jsxs("span", { children: [
								completion.done,
								" completed · ",
								completion.total - completion.done,
								" open"
							] })]
						}),
						/* @__PURE__ */ jsx(MilestoneBar, {
							percent: completion.percent,
							label: "Total progress"
						}),
						/* @__PURE__ */ jsx("div", {
							className: "ring-tiles",
							children: topBuckets.map((bucket) => /* @__PURE__ */ jsx(RingStat, {
								label: bucket.label,
								value: bucket.done,
								total: bucket.total
							}, bucket.bucket))
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "bucket-column dark analytics-trend",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Bucket trend" }),
						/* @__PURE__ */ jsx("p", {
							className: "card-note",
							children: "Change vs. one week ago"
						}),
						/* @__PURE__ */ jsx(TrendBars, {
							entries: trends,
							accentKey: busiestBucket?.bucket
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "bucket-column dark analytics-peak",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Busiest day" }),
						/* @__PURE__ */ jsx(Sparkline, {
							series: busiest.series,
							peakIndex: busiest.peakIndex
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "peak-stat",
							children: [/* @__PURE__ */ jsxs("strong", { children: [
								busiest.peakCount,
								"/",
								busiest.total
							] }), /* @__PURE__ */ jsxs("span", { children: ["due ", busiest.total > 0 ? formatDate(busiest.peakDate) : "nothing scheduled"] })]
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "entry-card analytics-velocity",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Completion rhythm" }),
						/* @__PURE__ */ jsx("p", {
							className: "card-note",
							children: "Actual completions over the last 14 days"
						}),
						/* @__PURE__ */ jsx(Sparkline, {
							series: completionHistory.series,
							peakIndex: completionHistory.peakIndex
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "analytics-velocity-stat",
							children: [/* @__PURE__ */ jsx("strong", { children: completionHistory.total }), /* @__PURE__ */ jsxs("span", { children: ["completed · best day ", completionHistory.peakCount] })]
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "accent-card analytics-activity",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Activity" }),
						/* @__PURE__ */ jsxs("div", {
							className: "activity-stat",
							children: [/* @__PURE__ */ jsx("strong", { children: heatmapSummary.activeDays }), /* @__PURE__ */ jsx("span", { children: "days completed" })]
						}),
						/* @__PURE__ */ jsx(ActivityGrid, {
							cells: heatmap,
							label: "Task activity by day, last 10 weeks"
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "card-note",
							children: [
								heatmapSummary.overdueDays,
								" overdue ",
								heatmapSummary.overdueDays === 1 ? "day" : "days"
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "entry-card analytics-delays",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Postpone patterns" }),
						/* @__PURE__ */ jsxs("div", {
							className: "analytics-delay-stat",
							children: [/* @__PURE__ */ jsx("strong", { children: postpone.average.toFixed(1) }), /* @__PURE__ */ jsx("span", { children: "average postponements per task" })]
						}),
						/* @__PURE__ */ jsx(MilestoneBar, {
							percent: tasks.length === 0 ? 0 : Math.round(postpone.delayedTaskCount / tasks.length * 100),
							label: `${postpone.delayedTaskCount} of ${tasks.length} tasks delayed`
						}),
						postpone.topTasks.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "empty",
							children: "No deadlines have been postponed."
						}) : /* @__PURE__ */ jsx("ol", {
							className: "postpone-task-list",
							children: postpone.topTasks.map((task) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("span", { children: task.title }), /* @__PURE__ */ jsxs("strong", { children: [task.postponeHistory.length, "×"] })] }, task.id))
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "entry-card analytics-delay-tags",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Tags with most delays" }),
						/* @__PURE__ */ jsx("p", {
							className: "card-note",
							children: "Postponement records grouped by existing task tags"
						}),
						postpone.tags.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "empty",
							children: "No tagged delays yet."
						}) : /* @__PURE__ */ jsx(TrendBars, {
							entries: postpone.tags,
							accentKey: postpone.tags[0].bucket
						})
					]
				})
			]
		})]
	});
}
//#endregion
export { AnalyticsPage as t };
