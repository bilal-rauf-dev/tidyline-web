import { d as ChevronRightIcon, p as CloseIcon, u as ChevronLeftIcon } from "./icons-98MzWrNh.js";
import { c as WEEKDAY_LABELS, d as getMonthWeeks, f as groupTasksByDate, l as addMonths, m as todayDateStr, p as toDateStr, r as formatDate, u as formatMonthLabel } from "./dates-OcvPtNgq.js";
import { r as TaskForm, t as durationToMinutes } from "./risk-B_x6pGiR.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
function getDayWorkload(tasks, overloadHours = 6) {
	const active = tasks.filter((task) => !task.done && !task.archived && task.status !== "waiting");
	const estimatedMinutes = active.reduce((total, task) => total + durationToMinutes(task.duration), 0);
	return {
		estimatedMinutes,
		unestimated: active.filter((task) => !task.duration).length,
		overloaded: estimatedMinutes > overloadHours * 60
	};
}
function formatWorkload(minutes) {
	if (minutes === 0) return "0h";
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;
	if (hours === 0) return `${remainder}m`;
	return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
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
//#endregion
//#region src/components/WorkloadRedistributeDialog.jsx
var EXIT_MS = 160;
function WorkloadRedistributeDialog({ plan, onConfirm, onClose }) {
	const [closing, setClosing] = useState(false);
	const timerRef = useRef(null);
	const close = useCallback(() => {
		setClosing(true);
		timerRef.current = window.setTimeout(onClose, EXIT_MS);
	}, [onClose]);
	useEffect(() => {
		function keydown(event) {
			if (event.key === "Escape") close();
		}
		window.addEventListener("keydown", keydown);
		return () => {
			window.clearTimeout(timerRef.current);
			window.removeEventListener("keydown", keydown);
		};
	}, [close]);
	return createPortal(/* @__PURE__ */ jsxs("div", {
		className: closing ? "task-detail-layer closing" : "task-detail-layer",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Redistribute workload preview",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "task-detail-scrim",
			"aria-label": "Close preview",
			onClick: close
		}), /* @__PURE__ */ jsxs("article", {
			className: "task-detail-dialog workload-dialog",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "task-detail-heading",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", { children: "Move flexible tasks?" }), /* @__PURE__ */ jsxs("span", { children: [
						"Preview from ",
						formatDate(plan.sourceDate),
						" — nothing moves until confirmed."
					] })] }), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "icon-mini",
						onClick: close,
						"aria-label": "Close preview",
						children: /* @__PURE__ */ jsx(CloseIcon, {})
					})]
				}),
				plan.proposals.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "empty",
					children: "No flexible estimated tasks can be moved automatically."
				}) : /* @__PURE__ */ jsx("ul", {
					className: "redistribution-list",
					children: plan.proposals.map((proposal) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: proposal.task.title }), /* @__PURE__ */ jsxs("span", { children: [
						formatWorkload(proposal.minutes),
						" · ",
						formatDate(proposal.from),
						" → ",
						formatDate(proposal.to)
					] })] }, proposal.task.id))
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "dialog-actions",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: close,
						children: "Cancel"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "primary",
						disabled: plan.proposals.length === 0,
						onClick: () => {
							onConfirm(plan.proposals);
							close();
						},
						children: "Confirm moves"
					})]
				})
			]
		})]
	}), document.body);
}
//#endregion
//#region src/pages/CalendarPage.jsx
function CalendarPage({ tasks, addTask, setDeadline, rescheduleTasks = () => {}, templates = [], overloadHours = 6 }) {
	const [viewDate, setViewDate] = useState(() => /* @__PURE__ */ new Date());
	const [selectedDate, setSelectedDate] = useState(null);
	const [dropTarget, setDropTarget] = useState(null);
	const [redistributionPlan, setRedistributionPlan] = useState(null);
	const weeks = useMemo(() => getMonthWeeks(viewDate), [viewDate]);
	const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
	const today = todayDateStr();
	const selectedWorkload = selectedDate ? getDayWorkload(tasksByDate[selectedDate] ?? [], overloadHours) : null;
	function handleAddTask(taskData) {
		addTask(taskData);
		setSelectedDate(null);
	}
	function handleDrop(event, dateStr) {
		event.preventDefault();
		setDropTarget(null);
		const id = event.dataTransfer.getData("text/plain");
		if (id) setDeadline(id, dateStr);
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell calendar-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "hero",
				children: [/* @__PURE__ */ jsx("h1", { children: "Calendar" }), /* @__PURE__ */ jsx("p", {
					className: "hero-copy",
					children: "Tasks are plotted on their deadline date. Click a day to add a task due then."
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "entry-card calendar-card",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "calendar-toolbar",
						children: [
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "calendar-nav",
								onClick: () => setViewDate((current) => addMonths(current, -1)),
								"aria-label": "Previous month",
								children: [/* @__PURE__ */ jsx(ChevronLeftIcon, {}), /* @__PURE__ */ jsx("span", { children: "Prev" })]
							}),
							/* @__PURE__ */ jsx("h2", { children: formatMonthLabel(viewDate) }),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "calendar-nav calendar-today",
								onClick: () => setViewDate(/* @__PURE__ */ new Date()),
								children: "Today"
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "calendar-nav",
								onClick: () => setViewDate((current) => addMonths(current, 1)),
								"aria-label": "Next month",
								children: [/* @__PURE__ */ jsx("span", { children: "Next" }), /* @__PURE__ */ jsx(ChevronRightIcon, {})]
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "calendar-weekdays",
						children: WEEKDAY_LABELS.map((label, index) => /* @__PURE__ */ jsx("span", { children: label }, `${label}-${index}`))
					}),
					/* @__PURE__ */ jsx("div", {
						className: "calendar-grid",
						children: weeks.flat().map(({ dateStr, day, inMonth }) => {
							const dayTasks = tasksByDate[dateStr] ?? [];
							const workload = getDayWorkload(dayTasks, overloadHours);
							const classNames = ["calendar-day"];
							if (!inMonth) classNames.push("outside");
							if (dateStr === today) classNames.push("today");
							if (dropTarget === dateStr) classNames.push("drop-target");
							if (workload.overloaded) classNames.push("overloaded");
							return /* @__PURE__ */ jsxs("button", {
								type: "button",
								className: classNames.join(" "),
								onClick: () => setSelectedDate(dateStr),
								onDragOver: (event) => {
									event.preventDefault();
									event.dataTransfer.dropEffect = "move";
									setDropTarget(dateStr);
								},
								onDragLeave: (event) => {
									if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget((current) => current === dateStr ? null : current);
								},
								onDrop: (event) => handleDrop(event, dateStr),
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "calendar-day-number",
										children: day
									}),
									dayTasks.length === 1 && /* @__PURE__ */ jsxs("span", {
										className: "calendar-day-task",
										draggable: true,
										onDragStart: (event) => {
											event.stopPropagation();
											event.dataTransfer.setData("text/plain", dayTasks[0].id);
											event.dataTransfer.effectAllowed = "move";
										},
										children: [/* @__PURE__ */ jsx("span", {
											className: "reminder-dot",
											"aria-hidden": "true"
										}), dayTasks[0].title]
									}),
									dayTasks.length > 1 && /* @__PURE__ */ jsxs("span", {
										className: "calendar-day-count",
										children: [/* @__PURE__ */ jsx("strong", { children: dayTasks.length }), /* @__PURE__ */ jsx("span", { children: "tasks" })]
									}),
									(workload.estimatedMinutes > 0 || workload.unestimated > 0) && /* @__PURE__ */ jsxs("span", {
										className: "calendar-day-workload",
										title: `${formatWorkload(workload.estimatedMinutes)} estimated${workload.unestimated ? ` · ${workload.unestimated} without estimates` : ""}`,
										children: [formatWorkload(workload.estimatedMinutes), workload.overloaded && /* @__PURE__ */ jsx("em", { children: "overloaded" })]
									})
								]
							}, dateStr);
						})
					}),
					selectedDate && selectedWorkload?.overloaded && /* @__PURE__ */ jsxs("div", {
						className: "calendar-overload-action",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("strong", { children: [formatWorkload(selectedWorkload.estimatedMinutes), " scheduled"] }), /* @__PURE__ */ jsxs("span", { children: [
							"Above your ",
							overloadHours,
							"-hour daily threshold."
						] })] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "secondary",
							onClick: () => setRedistributionPlan(buildRedistributionPlan(tasks, selectedDate, overloadHours)),
							children: "Preview moving flexible tasks"
						})]
					})
				]
			}),
			selectedDate && /* @__PURE__ */ jsx(TaskForm, {
				heading: `Add task for ${formatDate(selectedDate)}`,
				initialDeadline: selectedDate,
				allTasks: tasks,
				onAddTask: handleAddTask,
				templates
			}, selectedDate),
			redistributionPlan && /* @__PURE__ */ jsx(WorkloadRedistributeDialog, {
				plan: redistributionPlan,
				onClose: () => setRedistributionPlan(null),
				onConfirm: (proposals) => rescheduleTasks(proposals.map((proposal) => ({
					id: proposal.task.id,
					deadline: proposal.to
				})), "calendar")
			})
		]
	});
}
//#endregion
export { CalendarPage as t };
