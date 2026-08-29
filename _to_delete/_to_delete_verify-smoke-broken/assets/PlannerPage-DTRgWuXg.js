import { p as CloseIcon } from "./icons-98MzWrNh.js";
import { p as toDateStr, r as formatDate } from "./dates-OcvPtNgq.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
//#region src/pages/PlannerPage.jsx
var DAY_START = 360;
var PIXELS_PER_HOUR = 72;
var TIMELINE_HEIGHT = 960 / 60 * PIXELS_PER_HOUR;
function durationMinutes(task) {
	if (!task.duration) return 30;
	return task.duration.unit === "hr" ? task.duration.value * 60 : task.duration.value;
}
function timeLabel(minutes) {
	const hour = Math.floor(minutes / 60);
	const minute = minutes % 60;
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function addDays(dateStr, amount) {
	const date = /* @__PURE__ */ new Date(`${dateStr}T00:00:00`);
	date.setDate(date.getDate() + amount);
	return toDateStr(date);
}
function PlannerPage({ tasks, setScheduledStart, updateTask }) {
	const [date, setDate] = useState(() => toDateStr(/* @__PURE__ */ new Date()));
	const timelineRef = useRef(null);
	const actionable = useMemo(() => tasks.filter((task) => task.deadline && !task.done && !task.archived && task.status !== "waiting"), [tasks]);
	const scheduled = useMemo(() => actionable.filter((task) => task.scheduledStart?.slice(0, 10) === date), [actionable, date]);
	const sourceTasks = useMemo(() => actionable.filter((task) => task.scheduledStart?.slice(0, 10) !== date), [actionable, date]);
	function scheduleFromPointer(taskId, clientY) {
		const rect = timelineRef.current?.getBoundingClientRect();
		if (!rect) return;
		const rawMinutes = DAY_START + (clientY - rect.top) / rect.height * 960;
		const snapped = Math.round(rawMinutes / 15) * 15;
		setScheduledStart(taskId, `${date}T${timeLabel(Math.max(DAY_START, Math.min(1305, snapped)))}`);
	}
	function beginResize(event, task) {
		event.preventDefault();
		event.stopPropagation();
		const startY = event.clientY;
		const original = durationMinutes(task);
		let latestY = startY;
		function move(pointerEvent) {
			latestY = pointerEvent.clientY;
		}
		function finish() {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", finish);
			const deltaMinutes = (latestY - startY) / PIXELS_PER_HOUR * 60;
			const minutes = Math.max(15, Math.round((original + deltaMinutes) / 15) * 15);
			updateTask(task.id, { duration: {
				value: minutes,
				unit: "min"
			} });
		}
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", finish, { once: true });
	}
	const hours = Array.from({ length: 17 }, (_, index) => DAY_START / 60 + index);
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell planner-shell",
		children: [/* @__PURE__ */ jsxs("header", {
			className: "hero planner-hero",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", { children: "Day planner" }), /* @__PURE__ */ jsx("p", {
				className: "hero-copy",
				children: "Drag actionable tasks onto a time and shape the day."
			})] }), /* @__PURE__ */ jsxs("div", {
				className: "planner-date-controls",
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: () => setDate(addDays(date, -1)),
						children: "Previous"
					}),
					/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("span", {
						className: "sr-only",
						children: "Planner date"
					}), /* @__PURE__ */ jsx("input", {
						type: "date",
						value: date,
						onChange: (event) => setDate(event.target.value)
					})] }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: () => setDate(addDays(date, 1)),
						children: "Next"
					})
				]
			})]
		}), /* @__PURE__ */ jsxs("section", {
			className: "planner-layout",
			"aria-label": `Plan for ${formatDate(date)}`,
			children: [/* @__PURE__ */ jsxs("aside", {
				className: "entry-card planner-source",
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Board tasks" }),
					/* @__PURE__ */ jsx("p", {
						className: "card-note",
						children: "Drag onto the timeline. Waiting tasks stay off this list."
					}),
					sourceTasks.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "empty",
						children: "Everything actionable is scheduled."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "planner-source-list",
						children: sourceTasks.map((task) => /* @__PURE__ */ jsxs("li", {
							draggable: true,
							onDragStart: (event) => {
								event.dataTransfer.setData("text/plain", task.id);
								event.dataTransfer.effectAllowed = "move";
							},
							children: [/* @__PURE__ */ jsx("strong", { children: task.title }), /* @__PURE__ */ jsxs("span", { children: [
								durationMinutes(task),
								" min · due ",
								formatDate(task.deadline)
							] })]
						}, task.id))
					})
				]
			}), /* @__PURE__ */ jsxs("article", {
				className: "entry-card planner-day",
				children: [/* @__PURE__ */ jsx("h2", { children: formatDate(date) }), /* @__PURE__ */ jsxs("div", {
					ref: timelineRef,
					className: "planner-timeline",
					style: { height: `${TIMELINE_HEIGHT}px` },
					onDragOver: (event) => {
						event.preventDefault();
						event.dataTransfer.dropEffect = "move";
					},
					onDrop: (event) => {
						event.preventDefault();
						const taskId = event.dataTransfer.getData("text/plain");
						if (taskId) scheduleFromPointer(taskId, event.clientY);
					},
					children: [hours.map((hour, index) => /* @__PURE__ */ jsx("div", {
						className: "planner-hour",
						style: { top: `${index * PIXELS_PER_HOUR}px` },
						children: /* @__PURE__ */ jsx("span", { children: timeLabel(hour * 60) })
					}, hour)), scheduled.map((task) => {
						const time = task.scheduledStart.slice(11, 16);
						const [hour, minute] = time.split(":").map(Number);
						const top = (hour * 60 + minute - DAY_START) / 60 * PIXELS_PER_HOUR;
						const height = Math.max(18, durationMinutes(task) / 60 * PIXELS_PER_HOUR);
						return /* @__PURE__ */ jsxs("div", {
							className: "planner-block",
							style: {
								top: `${top}px`,
								height: `${height}px`
							},
							draggable: true,
							onDragStart: (event) => {
								event.dataTransfer.setData("text/plain", task.id);
								event.dataTransfer.effectAllowed = "move";
							},
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: task.title }), /* @__PURE__ */ jsxs("span", { children: [
									time,
									" · ",
									durationMinutes(task),
									" min"
								] })] }),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini",
									onClick: () => setScheduledStart(task.id, null),
									"aria-label": `Remove ${task.title} from the timeline`,
									title: "Remove from timeline",
									children: /* @__PURE__ */ jsx(CloseIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "planner-resize",
									"aria-label": `Resize ${task.title}`,
									title: "Drag to resize",
									onPointerDown: (event) => beginResize(event, task)
								})
							]
						}, task.id);
					})]
				})]
			})]
		})]
	});
}
//#endregion
export { PlannerPage as t };
