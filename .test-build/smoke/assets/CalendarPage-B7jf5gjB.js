import { l as ChevronLeftIcon, u as ChevronRightIcon } from "./icons-BWrl8Kfc.js";
import { r as formatMinutes } from "./calibration-qStEAgJC.js";
import { c as addMonths, d as groupTasksByDate, f as toDateStr, l as formatMonthLabel, n as deadlineMoment, o as startOfDay, p as todayDateStr, r as formatDate, s as WEEKDAY_LABELS, u as getMonthWeeks } from "./dates-DhUD90mg.js";
import { a as deriveStartBy, o as getDayWorkload } from "./TagList-B3Uu9qDt.js";
import { t as TaskForm } from "./TaskForm-BeQtsG2Z.js";
import { l as matchesRecurrence } from "./reminders-3dk3K5ia.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
//#region src/components/TimeRibbon.jsx
var RIBBON_DAYS = 21;
function TimeRibbon({ tasks, referenceDate = /* @__PURE__ */ new Date() }) {
	const days = Array.from({ length: RIBBON_DAYS }, (_, index) => {
		const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + index);
		const dateStr = toDateStr(date);
		return {
			date,
			dateStr,
			workload: getDayWorkload(tasks, dateStr, tasks, referenceDate),
			due: tasks.filter((task) => !task.done && !task.archived && task.deadline === dateStr).length
		};
	});
	const peak = Math.max(1, ...days.map((day) => day.workload.minutes));
	return /* @__PURE__ */ jsxs("section", {
		className: "time-ribbon",
		"aria-label": "Next three weeks of expected work and deadlines",
		children: [/* @__PURE__ */ jsxs("header", { children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
			className: "home-feature-kicker",
			children: "Next three weeks"
		}), /* @__PURE__ */ jsx("h2", { children: "Time ahead" })] }), /* @__PURE__ */ jsx("p", { children: "Height shows how much work needs to begin. Dots mark deadlines." })] }), /* @__PURE__ */ jsx("div", {
			className: "time-ribbon-scroll",
			children: /* @__PURE__ */ jsx("div", {
				className: "time-ribbon-days",
				children: days.map(({ date, dateStr, workload, due }) => /* @__PURE__ */ jsxs("article", {
					className: workload.minutes ? "time-ribbon-day has-work" : "time-ribbon-day",
					title: `${dateStr}: ${formatMinutes(workload.minutes)} to begin, ${due} due`,
					children: [
						/* @__PURE__ */ jsx("span", { children: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date) }),
						/* @__PURE__ */ jsx("strong", { children: date.getDate() }),
						/* @__PURE__ */ jsx("div", {
							className: "time-ribbon-track",
							"aria-hidden": "true",
							children: /* @__PURE__ */ jsx("span", { style: { height: `${Math.max(workload.minutes ? 10 : 0, workload.minutes / peak * 100)}%` } })
						}),
						/* @__PURE__ */ jsx("small", { children: workload.minutes ? formatMinutes(workload.minutes) : "—" }),
						/* @__PURE__ */ jsx("i", {
							className: due ? "deadline-dots active" : "deadline-dots",
							"aria-label": due ? `${due} deadline${due === 1 ? "" : "s"}` : "No deadlines",
							children: due || ""
						})
					]
				}, dateStr))
			})
		})]
	});
}
//#endregion
//#region src/utils/ics.js
var encoder = new TextEncoder();
var WEEKDAYS = [
	"SU",
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA"
];
function escapeText(value) {
	return String(value ?? "").replace(/\\/g, "\\\\").replace(/\r\n|\n|\r/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}
function foldLine(line) {
	const parts = [];
	let part = "";
	let bytes = 0;
	for (const character of line) {
		const size = encoder.encode(character).length;
		if (part && bytes + size > 75) {
			parts.push(part);
			part = ` ${character}`;
			bytes = 1 + size;
		} else {
			part += character;
			bytes += size;
		}
	}
	parts.push(part);
	return parts.join("\r\n");
}
function utcStamp(value) {
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime())) return null;
	return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function recurrenceRule(recurrence) {
	if (!recurrence) return null;
	switch (recurrence.freq) {
		case "daily": return "FREQ=DAILY";
		case "weekdays": return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
		case "weekly": return `FREQ=WEEKLY;BYDAY=${WEEKDAYS[recurrence.weekday ?? 1]}`;
		case "monthly": return "FREQ=MONTHLY";
		case "yearly": return "FREQ=YEARLY";
		case "everyNDays": return `FREQ=DAILY;INTERVAL=${Math.max(1, Math.floor(Number(recurrence.n) || 2))}`;
		default: return null;
	}
}
function alarmLines(reminder, task) {
	let trigger = null;
	if (reminder.kind === "relative" && task.deadline) trigger = `TRIGGER:-PT${Math.max(1, Math.floor(reminder.minutesBefore))}M`;
	if (reminder.kind === "absolute") {
		const at = utcStamp(reminder.at);
		if (at) trigger = `TRIGGER;VALUE=DATE-TIME:${at}`;
	}
	if (!trigger) return [];
	return [
		"BEGIN:VALARM",
		trigger,
		"ACTION:DISPLAY",
		`DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
		"END:VALARM"
	];
}
function eventLines(task, timestamp) {
	if (!task.deadline) return [];
	const start = utcStamp(deadlineMoment(task.deadline));
	if (!start) return [];
	const lines = [
		"BEGIN:VEVENT",
		`UID:${escapeText(`${task.id}@tasks.tidyline.local`)}`,
		`DTSTAMP:${timestamp}`,
		`DTSTART:${start}`,
		`SUMMARY:${escapeText(task.title)}`,
		"TRANSP:TRANSPARENT",
		"STATUS:CONFIRMED"
	];
	const rule = recurrenceRule(task.recurrence);
	if (rule) lines.push(`RRULE:${rule}`);
	if (task.notes) lines.push(`DESCRIPTION:${escapeText(task.notes)}`);
	if (task.location) lines.push(`LOCATION:${escapeText(task.location)}`);
	if (task.tags?.length) lines.push(`CATEGORIES:${task.tags.map(escapeText).join(",")}`);
	task.reminders.filter((reminder) => reminder.kind !== "recurring").forEach((reminder) => lines.push(...alarmLines(reminder, task)));
	lines.push("END:VEVENT");
	return lines;
}
function firstReminderOccurrence(task, reminder, referenceDate) {
	const cursor = startOfDay(referenceDate);
	const [hour, minute] = String(reminder.time ?? "09:00").split(":").map(Number);
	const anchor = task.createdAt?.slice(0, 10);
	for (let guard = 0; guard < 3660; guard += 1) {
		if (matchesRecurrence(cursor, reminder.rule, anchor)) {
			const occurrence = new Date(cursor);
			occurrence.setHours(hour || 0, minute || 0, 0, 0);
			if (occurrence >= referenceDate) return occurrence;
		}
		cursor.setDate(cursor.getDate() + 1);
	}
	return null;
}
function recurringReminderLines(task, reminder, timestamp, referenceDate) {
	const first = firstReminderOccurrence(task, reminder, referenceDate);
	const rule = recurrenceRule(reminder.rule);
	if (!first || !rule) return [];
	return [
		"BEGIN:VEVENT",
		`UID:${escapeText(`${task.id}-${reminder.id}@reminders.tidyline.local`)}`,
		`DTSTAMP:${timestamp}`,
		`DTSTART:${utcStamp(first)}`,
		`RRULE:${rule}`,
		`SUMMARY:${escapeText(`Reminder: ${task.title}`)}`,
		"DURATION:PT5M",
		"TRANSP:TRANSPARENT",
		"STATUS:CONFIRMED",
		"BEGIN:VALARM",
		"TRIGGER:PT0M",
		"ACTION:DISPLAY",
		`DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
		"END:VALARM",
		"END:VEVENT"
	];
}
function standaloneReminderLines(task, reminder, timestamp) {
	if (reminder.kind !== "absolute" || task.deadline) return [];
	const start = utcStamp(reminder.at);
	if (!start) return [];
	return [
		"BEGIN:VEVENT",
		`UID:${escapeText(`${task.id}-${reminder.id}@reminders.tidyline.local`)}`,
		`DTSTAMP:${timestamp}`,
		`DTSTART:${start}`,
		`SUMMARY:${escapeText(`Reminder: ${task.title}`)}`,
		"DURATION:PT5M",
		"TRANSP:TRANSPARENT",
		"STATUS:CONFIRMED",
		"BEGIN:VALARM",
		"TRIGGER:PT0M",
		"ACTION:DISPLAY",
		`DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
		"END:VALARM",
		"END:VEVENT"
	];
}
function serializeCalendar(tasks, { generatedAt = /* @__PURE__ */ new Date(), referenceDate = generatedAt, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } = {}) {
	const timestamp = utcStamp(generatedAt);
	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//TidyLine//Task deadlines//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"X-WR-CALNAME:TidyLine deadlines",
		`X-WR-TIMEZONE:${escapeText(timeZone)}`
	];
	tasks.filter((task) => !task.done && !task.archived).forEach((task) => {
		lines.push(...eventLines(task, timestamp));
		task.reminders.filter((reminder) => reminder.kind === "recurring").forEach((reminder) => lines.push(...recurringReminderLines(task, reminder, timestamp, referenceDate)));
		task.reminders.filter((reminder) => reminder.kind === "absolute").forEach((reminder) => lines.push(...standaloneReminderLines(task, reminder, timestamp)));
	});
	lines.push("END:VCALENDAR");
	return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
//#endregion
//#region src/pages/CalendarPage.jsx
function CalendarPage({ tasks, addTask, setDeadline }) {
	const [viewDate, setViewDate] = useState(() => /* @__PURE__ */ new Date());
	const [selectedDate, setSelectedDate] = useState(null);
	const [dropTarget, setDropTarget] = useState(null);
	const [referenceDate] = useState(() => /* @__PURE__ */ new Date());
	const weeks = useMemo(() => getMonthWeeks(viewDate), [viewDate]);
	const tasksByDate = useMemo(() => groupTasksByDate(tasks.filter((task) => !task.archived && task.deadline)), [tasks]);
	const today = todayDateStr();
	const startsByDate = useMemo(() => {
		const grouped = {};
		tasks.filter((task) => !task.archived && !task.done).forEach((task) => {
			const startBy = deriveStartBy(task, tasks, referenceDate);
			if (!startBy) return;
			grouped[startBy] = [...grouped[startBy] ?? [], task];
		});
		return grouped;
	}, [referenceDate, tasks]);
	function handleDrop(event, dateStr) {
		event.preventDefault();
		setDropTarget(null);
		const id = event.dataTransfer.getData("text/plain");
		if (id) setDeadline(id, dateStr);
	}
	function exportCalendar() {
		const calendar = serializeCalendar(tasks);
		const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "tidyline-deadlines.ics";
		link.click();
		URL.revokeObjectURL(url);
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell calendar-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "hero calendar-hero",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", { children: "Calendar" }), /* @__PURE__ */ jsx("p", {
					className: "hero-copy",
					children: "See where deadlines collect and how far apart they really are."
				})] }), /* @__PURE__ */ jsxs("div", {
					className: "calendar-export",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: exportCalendar,
						children: "Export calendar"
					}), /* @__PURE__ */ jsx("small", { children: "Open deadlines and reminders · device timezone" })]
				})]
			}),
			/* @__PURE__ */ jsx(TimeRibbon, {
				tasks,
				referenceDate
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
							const startTasks = startsByDate[dateStr] ?? [];
							const classNames = ["calendar-day"];
							if (!inMonth) classNames.push("outside");
							if (dateStr === today) classNames.push("today");
							if (dropTarget === dateStr) classNames.push("drop-target");
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
									startTasks.length > 0 && /* @__PURE__ */ jsxs("span", {
										className: "calendar-start-count",
										children: ["Start ", startTasks.length]
									})
								]
							}, dateStr);
						})
					})
				]
			}),
			selectedDate && /* @__PURE__ */ jsx(TaskForm, {
				heading: `Add task for ${formatDate(selectedDate)}`,
				initialDeadline: selectedDate,
				allTasks: tasks,
				onAddTask: (task) => {
					addTask(task);
					setSelectedDate(null);
				}
			}, selectedDate)
		]
	});
}
//#endregion
export { CalendarPage as t };
