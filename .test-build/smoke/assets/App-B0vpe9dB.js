import { D as SearchIcon, O as SettingsIcon, T as RepeatIcon, _ as HomeIcon, a as BoardIcon, b as MenuIcon, f as CloseIcon, l as ChevronLeftIcon, o as CalendarIcon, p as CommandIcon, w as PlusIcon } from "./icons-BWrl8Kfc.js";
import { i as filterTasks, n as deadlineForBucket, r as DEFAULT_FILTERS, t as BoardPage } from "./BoardPage-B1YZasAw.js";
import { t as durationToMinutes } from "./calibration-qStEAgJC.js";
import { f as toDateStr, r as formatDate } from "./dates-DhUD90mg.js";
import { i as tagTone, l as getTaskTimingLabel, n as collectTags } from "./TagList-B3Uu9qDt.js";
import { t as Checkbox } from "./Checkbox-DZRZTY-b.js";
import { t as CompletionFeedbackToast } from "./CompletionFeedbackToast-CW0hzlpf.js";
import { t as NowPage } from "./NowPage-bHI_8dDo.js";
import { a as registerNotificationWorker, r as notifyReminder, t as ensureNotificationPermission } from "./notifications-DxfYIWpl.js";
import { c as describeRecurrence, i as reminderInstances, u as nextOccurrence } from "./reminders-3dk3K5ia.js";
import { t as CalendarPage } from "./CalendarPage-B7jf5gjB.js";
import { a as normalizeRoutine, i as migrateRoutineData, o as parseImportedRoutines, s as routineEnvelope, t as ROUTINE_STORAGE_KEY } from "./routineIO-BFJIslfv.js";
import { a as migrateTaskData, i as cleanupLegacyPreferences, n as ACCENT_OPTIONS, o as parseImportedTasks, r as useTheme, s as taskEnvelope, t as SettingsPage } from "./SettingsPage-DSWhNncI.js";
import { t as RoutinesPage } from "./RoutinesPage-U2pqtEy3.js";
import { t as normalizeTask } from "./taskMigration-BIdC-EiI.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import * as chrono from "chrono-node";
//#region src/components/BrandMonogram.jsx
function BrandMonogram({ size = 22 }) {
	const width = Math.round(size * (600 / 490));
	return /* @__PURE__ */ jsxs("svg", {
		width,
		height: size,
		viewBox: "210 120 600 490",
		fill: "none",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("path", {
				d: "M260 170 H560 M410 170 V560",
				stroke: "currentColor",
				strokeWidth: "56"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M560 250 V560 H760",
				stroke: "currentColor",
				strokeWidth: "56"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M640 280 H760",
				stroke: "currentColor",
				strokeWidth: "24",
				opacity: "0.5"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M640 360 H760",
				stroke: "currentColor",
				strokeWidth: "24",
				opacity: "0.5"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M640 440 H760",
				stroke: "currentColor",
				strokeWidth: "24",
				opacity: "0.5"
			})
		]
	});
}
//#endregion
//#region src/components/Sidebar.jsx
var NAV_ITEMS = [
	{
		href: "/",
		label: "Now",
		Icon: HomeIcon
	},
	{
		href: "/board",
		label: "Board",
		Icon: BoardIcon
	},
	{
		href: "/calendar",
		label: "Calendar",
		Icon: CalendarIcon
	}
];
function Sidebar({ isOpen, isCollapsed, onToggleCollapse, onNavigate, onOpenPalette, workspaceName = "TidyLine", tasks = [], onOpenTask }) {
	const [location] = useLocation();
	const activeIndex = NAV_ITEMS.findIndex((item) => item.href === location);
	const listRef = useRef(null);
	const searchRef = useRef(null);
	const [query, setQuery] = useState("");
	const [activeResult, setActiveResult] = useState(-1);
	const [indicator, setIndicator] = useState({
		top: 0,
		height: 42
	});
	const results = useMemo(() => {
		if (!query.trim()) return [];
		return filterTasks(tasks, {
			...DEFAULT_FILTERS,
			query
		}).filter((task) => !task.archived).slice(0, 7);
	}, [query, tasks]);
	const activeResultIndex = results.length ? Math.min(Math.max(activeResult, 0), results.length - 1) : -1;
	useEffect(() => {
		function closeSearch(event) {
			if (searchRef.current && !searchRef.current.contains(event.target)) setQuery("");
		}
		document.addEventListener("pointerdown", closeSearch);
		return () => document.removeEventListener("pointerdown", closeSearch);
	}, []);
	useLayoutEffect(() => {
		if (!listRef.current || activeIndex < 0) return void 0;
		const list = listRef.current;
		const active = list.querySelectorAll(".nav-item")[activeIndex];
		function measure() {
			if (!active) return;
			const listRect = list.getBoundingClientRect();
			const activeRect = active.getBoundingClientRect();
			setIndicator({
				top: activeRect.top - listRect.top,
				height: activeRect.height
			});
		}
		measure();
		const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
		observer?.observe(list);
		observer?.observe(active);
		window.addEventListener("resize", measure);
		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [
		activeIndex,
		isCollapsed,
		isOpen
	]);
	function openResult(task) {
		if (!task) return;
		setQuery("");
		onOpenTask?.(task.id);
	}
	return /* @__PURE__ */ jsxs("nav", {
		id: "sidebar-nav",
		className: isOpen ? "sidebar open" : "sidebar",
		"aria-label": "Main navigation",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "sidebar-brand",
				children: [
					/* @__PURE__ */ jsx(BrandMonogram, {}),
					/* @__PURE__ */ jsx("span", { children: workspaceName }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "icon-mini brand-command",
						onClick: onOpenPalette,
						"aria-label": "Open command palette (Ctrl+K)",
						title: "Command palette — Ctrl+K",
						children: /* @__PURE__ */ jsx(CommandIcon, {})
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "sidebar-search-wrap",
				ref: searchRef,
				children: [/* @__PURE__ */ jsxs("label", {
					className: "sidebar-search",
					children: [
						/* @__PURE__ */ jsx(SearchIcon, {}),
						/* @__PURE__ */ jsx("span", {
							className: "sr-only",
							children: "Search tasks"
						}),
						/* @__PURE__ */ jsx("input", {
							type: "search",
							value: query,
							placeholder: "Search tasks...",
							onChange: (event) => {
								setQuery(event.target.value);
								setActiveResult(0);
							},
							onKeyDown: (event) => {
								if (event.key === "Escape") {
									setQuery("");
									event.currentTarget.blur();
								} else if (event.key === "ArrowDown") {
									event.preventDefault();
									setActiveResult((index) => Math.min(index + 1, results.length - 1));
								} else if (event.key === "ArrowUp") {
									event.preventDefault();
									setActiveResult((index) => Math.max(index - 1, 0));
								} else if (event.key === "Enter") {
									event.preventDefault();
									openResult(results[activeResultIndex]);
								}
							},
							"aria-label": "Search tasks",
							"aria-autocomplete": "list"
						})
					]
				}), query.trim() && /* @__PURE__ */ jsx("div", {
					className: "sidebar-search-results",
					role: "listbox",
					"aria-label": "Task search results",
					children: results.length ? results.map((task, index) => /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: index === activeResultIndex ? "sidebar-search-result active" : "sidebar-search-result",
						role: "option",
						"aria-selected": index === activeResultIndex,
						onMouseEnter: () => setActiveResult(index),
						onClick: () => openResult(task),
						children: [/* @__PURE__ */ jsx("strong", { children: task.title }), /* @__PURE__ */ jsx("span", { children: getTaskTimingLabel(task, tasks) })]
					}, task.id)) : /* @__PURE__ */ jsx("p", {
						className: "sidebar-search-empty",
						children: "No matching tasks."
					})
				})]
			}),
			/* @__PURE__ */ jsxs("ul", {
				className: "nav-list",
				ref: listRef,
				children: [/* @__PURE__ */ jsx("li", {
					className: activeIndex < 0 ? "nav-indicator hidden" : "nav-indicator",
					style: {
						height: `${indicator.height}px`,
						transform: `translateY(${indicator.top}px)`
					},
					"aria-hidden": "true"
				}), NAV_ITEMS.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
					href: item.href,
					title: item.label,
					onClick: onNavigate,
					className: location === item.href ? "nav-item active" : "nav-item",
					children: [/* @__PURE__ */ jsx(item.Icon, {}), /* @__PURE__ */ jsx("span", { children: item.label })]
				}) }, item.href))]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "sidebar-utility-links",
				children: [/* @__PURE__ */ jsxs(Link, {
					href: "/routines",
					className: location === "/routines" ? "sidebar-review active" : "sidebar-review",
					onClick: onNavigate,
					title: "Routines",
					children: [/* @__PURE__ */ jsx(RepeatIcon, {}), /* @__PURE__ */ jsx("span", { children: "Routines" })]
				}), /* @__PURE__ */ jsxs(Link, {
					href: "/settings",
					className: location === "/settings" ? "sidebar-review active" : "sidebar-review",
					onClick: onNavigate,
					title: "Settings",
					children: [/* @__PURE__ */ jsx(SettingsIcon, {}), /* @__PURE__ */ jsx("span", { children: "Settings" })]
				})]
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "sidebar-collapse",
				onClick: onToggleCollapse,
				"aria-label": isCollapsed ? "Expand sidebar" : "Collapse sidebar",
				children: [/* @__PURE__ */ jsx(ChevronLeftIcon, {}), /* @__PURE__ */ jsx("span", { children: "Collapse" })]
			})
		]
	});
}
//#endregion
//#region src/utils/fuzzy.js
/**
* Subsequence fuzzy match: every query character must appear in order.
* Returns a score (higher is better) or -1 for no match. Consecutive hits
* and word-start hits score higher so "ns" ranks "New task" above "Settings".
*/
function fuzzyScore(text, query) {
	if (!query) return 0;
	const haystack = text.toLowerCase();
	const needle = query.toLowerCase().replace(/\s+/g, "");
	let score = 0;
	let cursor = 0;
	let previousIndex = -1;
	for (const char of needle) {
		const index = haystack.indexOf(char, cursor);
		if (index === -1) return -1;
		if (index === previousIndex + 1) score += 3;
		if (index === 0 || haystack[index - 1] === " ") score += 2;
		score += 1;
		previousIndex = index;
		cursor = index + 1;
	}
	return score - haystack.length * .01;
}
function fuzzyFilter(items, query, getText) {
	return items.map((item) => ({
		item,
		score: fuzzyScore(getText(item), query)
	})).filter((entry) => entry.score >= 0).sort((a, b) => b.score - a.score).map((entry) => entry.item);
}
//#endregion
//#region src/components/CommandPalette.jsx
function CommandPalette({ commands, onClose }) {
	const inputRef = useRef(null);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const results = useMemo(() => query ? fuzzyFilter(commands, query, (command) => command.label) : commands, [commands, query]);
	useEffect(() => {
		inputRef.current?.focus();
	}, []);
	function updateQuery(value) {
		setQuery(value);
		setActiveIndex(0);
	}
	function run(command) {
		onClose();
		command?.run();
	}
	function onKeyDown(event) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((index) => Math.min(index + 1, results.length - 1));
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((index) => Math.max(index - 1, 0));
		}
		if (event.key === "Enter") {
			event.preventDefault();
			run(results[activeIndex]);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "palette-layer",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Command palette",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "palette-scrim",
			"aria-label": "Close command palette",
			onClick: onClose
		}), /* @__PURE__ */ jsxs("div", {
			className: "palette",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "palette-search",
				children: [
					/* @__PURE__ */ jsx(SearchIcon, {}),
					/* @__PURE__ */ jsx("input", {
						ref: inputRef,
						type: "text",
						value: query,
						placeholder: "Type a command",
						"aria-label": "Command search",
						onChange: (event) => updateQuery(event.target.value),
						onKeyDown
					}),
					/* @__PURE__ */ jsx("kbd", { children: "Esc" })
				]
			}), results.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "empty palette-empty",
				children: "No matching command."
			}) : /* @__PURE__ */ jsx("ul", {
				className: "palette-list",
				children: results.map((command, index) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: index === activeIndex ? "palette-item active" : "palette-item",
					onMouseEnter: () => setActiveIndex(index),
					onClick: () => run(command),
					children: [/* @__PURE__ */ jsx("span", { children: command.label }), command.hint && /* @__PURE__ */ jsx("span", {
						className: "palette-hint",
						children: command.hint
					})]
				}) }, command.id))
			})]
		})]
	});
}
//#endregion
//#region src/components/DeleteConfirmDialog.jsx
function DeleteConfirmDialog({ taskTitle, onCancel, onConfirm }) {
	const [dontAskAgain, setDontAskAgain] = useState(false);
	const cancelRef = useRef(null);
	useEffect(() => {
		cancelRef.current?.focus();
		function handleKeyDown(event) {
			if (event.key === "Escape") onCancel();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onCancel]);
	return /* @__PURE__ */ jsxs("div", {
		className: "confirm-layer",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "delete-title",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "confirm-scrim",
			onClick: onCancel,
			"aria-label": "Cancel task deletion"
		}), /* @__PURE__ */ jsxs("div", {
			className: "confirm-dialog",
			children: [
				/* @__PURE__ */ jsx("h2", {
					id: "delete-title",
					children: "Delete task?"
				}),
				/* @__PURE__ */ jsxs("p", { children: [
					"“",
					taskTitle,
					"” will be removed. You can still restore it from the undo notification."
				] }),
				/* @__PURE__ */ jsxs("label", {
					className: "confirm-preference",
					children: [/* @__PURE__ */ jsx(Checkbox, {
						checked: dontAskAgain,
						onChange: (event) => setDontAskAgain(event.target.checked)
					}), /* @__PURE__ */ jsx("span", { children: "Don’t show this again" })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "confirm-actions",
					children: [/* @__PURE__ */ jsx("button", {
						ref: cancelRef,
						type: "button",
						className: "secondary",
						onClick: onCancel,
						children: "Cancel"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "primary",
						onClick: () => onConfirm(dontAskAgain),
						children: "Delete task"
					})]
				})
			]
		})]
	});
}
//#endregion
//#region src/components/TaskAddedToast.jsx
var TOAST_MS = 6e3;
function TaskAddedToast({ title, onEdit, onDismiss }) {
	useEffect(() => {
		const timer = window.setTimeout(onDismiss, TOAST_MS);
		return () => window.clearTimeout(timer);
	}, [onDismiss]);
	return /* @__PURE__ */ jsxs("div", {
		className: "undo-toast task-added-toast",
		role: "status",
		"aria-live": "polite",
		children: [
			/* @__PURE__ */ jsxs("span", {
				className: "toast-message",
				children: [/* @__PURE__ */ jsx("strong", { children: "Task added" }), /* @__PURE__ */ jsx("span", { children: title })]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "undo-action",
				onClick: onEdit,
				children: "Edit"
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "icon-mini",
				onClick: onDismiss,
				"aria-label": "Dismiss task-added notification",
				children: /* @__PURE__ */ jsx(CloseIcon, {})
			})
		]
	});
}
//#endregion
//#region src/utils/taskTiming.js
var MINUTE_MS = 6e4;
function validTimestamp(value) {
	if (typeof value !== "string" || !value) return null;
	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}
function elapsedMinutes(startedAt, endedAt = (/* @__PURE__ */ new Date()).toISOString()) {
	const start = validTimestamp(startedAt);
	const end = validTimestamp(endedAt);
	if (start === null || end === null || end <= start) return 0;
	return Math.max(1, Math.round((end - start) / MINUTE_MS));
}
function startTiming(task, at = (/* @__PURE__ */ new Date()).toISOString()) {
	if (task.done || task.archived || task.startedAt || validTimestamp(at) === null) return task;
	return {
		...task,
		startedAt: at
	};
}
function pauseTiming(task, at = (/* @__PURE__ */ new Date()).toISOString()) {
	if (!task.startedAt) return task;
	const elapsed = elapsedMinutes(task.startedAt, at);
	return {
		...task,
		startedAt: null,
		actualMinutes: Math.max(0, Number(task.actualMinutes) || 0) + elapsed || null
	};
}
function completeTiming(task, at = (/* @__PURE__ */ new Date()).toISOString()) {
	return {
		...pauseTiming(task, at),
		done: true,
		completedAt: at,
		startedAt: null
	};
}
//#endregion
//#region src/hooks/useTasks.js
var STORAGE_KEY$1 = "tidyline:tasks";
var UNDO_MS = 6e3;
function loadTaskState() {
	cleanupLegacyPreferences(localStorage);
	const raw = localStorage.getItem(STORAGE_KEY$1);
	if (!raw) return {
		tasks: [],
		canPersist: true,
		dataError: ""
	};
	try {
		return {
			tasks: migrateTaskData(JSON.parse(raw)).tasks.map(normalizeTask),
			canPersist: true,
			dataError: ""
		};
	} catch {
		return {
			tasks: [],
			canPersist: false,
			dataError: "Your saved tasks could not be read. The original browser data has been left untouched."
		};
	}
}
function nextInstance(task, deadline) {
	return normalizeTask({
		...task,
		id: crypto.randomUUID(),
		deadline,
		resurfaceDate: null,
		done: false,
		completedAt: null,
		pinned: false,
		archived: false,
		startedAt: null,
		actualMinutes: null,
		checklist: task.checklist.map((item) => ({
			...item,
			done: false
		})),
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	});
}
function useTasks() {
	const [initial] = useState(loadTaskState);
	const [tasks, setTasks] = useState(initial.tasks);
	const [undoState, setUndoState] = useState(null);
	const [completionFeedback, setCompletionFeedback] = useState(null);
	useEffect(() => {
		if (!initial.canPersist) return;
		localStorage.setItem(STORAGE_KEY$1, JSON.stringify(taskEnvelope(tasks)));
	}, [initial.canPersist, tasks]);
	useEffect(() => {
		if (!undoState) return void 0;
		const timer = setTimeout(() => setUndoState(null), UNDO_MS);
		return () => clearTimeout(timer);
	}, [undoState]);
	function commit(message, nextTasks) {
		setUndoState({
			message,
			snapshot: tasks
		});
		setTasks(nextTasks);
	}
	function persistImmediately(nextTasks) {
		if (!initial.canPersist) return;
		localStorage.setItem(STORAGE_KEY$1, JSON.stringify(taskEnvelope(nextTasks)));
	}
	function mapTask(id, changes) {
		return tasks.map((task) => task.id === id ? normalizeTask({
			...task,
			...changes
		}) : task);
	}
	function patch(id, updater) {
		setTasks((current) => current.map((task) => task.id === id ? normalizeTask({
			...task,
			...updater(task)
		}) : task));
	}
	function addTask({ title, deadline, resurfaceDate = null, reminders = [], tags = [], recurrence = null, notes = "", checklist = [], links = [], location = "", duration = null, archived = false }) {
		const task = normalizeTask({
			id: crypto.randomUUID(),
			title,
			deadline,
			resurfaceDate,
			reminders,
			tags,
			recurrence,
			notes,
			checklist,
			links,
			location,
			duration,
			archived,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		setTasks((current) => [task, ...current]);
		return task;
	}
	function updateTask(id, updates) {
		patch(id, () => updates);
	}
	function deleteTask(id) {
		commit("Task deleted", tasks.filter((task) => task.id !== id));
	}
	function completeTask(id) {
		const target = tasks.find((task) => task.id === id);
		if (!target || target.done) return;
		const completedAt = (/* @__PURE__ */ new Date()).toISOString();
		const completedTarget = normalizeTask(completeTiming(target, completedAt));
		let next = tasks.map((task) => task.id === id ? completedTarget : task);
		let createdNext = false;
		if (target.recurrence && target.deadline) {
			const upcoming = nextOccurrence(target.recurrence, target.deadline);
			if (upcoming) {
				next = [nextInstance(target, upcoming), ...next];
				createdNext = true;
			}
		}
		const estimateMinutes = durationToMinutes(target.duration);
		if (estimateMinutes && completedTarget.actualMinutes) setCompletionFeedback({
			id: `${target.id}:${completedAt}`,
			title: target.title,
			estimateMinutes,
			actualMinutes: completedTarget.actualMinutes
		});
		persistImmediately(next);
		commit(createdNext ? "Completed — next one scheduled" : "Task completed", next);
	}
	function startTask(id) {
		const next = tasks.map((task) => task.id === id ? normalizeTask(startTiming(task)) : task);
		persistImmediately(next);
		setTasks(next);
	}
	function pauseTask(id) {
		const next = tasks.map((task) => task.id === id ? normalizeTask(pauseTiming(task)) : task);
		persistImmediately(next);
		setTasks(next);
	}
	function toggleTask(id) {
		const target = tasks.find((task) => task.id === id);
		if (target && !target.done) {
			completeTask(id);
			return;
		}
		setCompletionFeedback(null);
		setTasks(mapTask(id, {
			done: false,
			completedAt: null
		}));
	}
	function togglePin(id) {
		const target = tasks.find((task) => task.id === id);
		setTasks(mapTask(id, { pinned: !target?.pinned }));
	}
	function archiveTask(id) {
		commit("Task archived", mapTask(id, { archived: true }));
	}
	function unarchiveTask(id) {
		setTasks(mapTask(id, { archived: false }));
	}
	function duplicateTask(id) {
		const target = tasks.find((task) => task.id === id);
		if (!target) return;
		const copy = normalizeTask({
			...target,
			id: crypto.randomUUID(),
			title: `${target.title} (copy)`,
			done: false,
			completedAt: null,
			pinned: false,
			archived: false,
			startedAt: null,
			actualMinutes: null,
			resurfaceDate: null,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		const index = tasks.findIndex((task) => task.id === id);
		const next = [...tasks];
		next.splice(index + 1, 0, copy);
		setTasks(next);
	}
	function setDeadline(id, deadline) {
		const target = tasks.find((task) => task.id === id);
		if (!target || target.deadline === deadline) return;
		commit("Task rescheduled", mapTask(id, { deadline }));
	}
	function moveTaskToBucket(id, bucketKey) {
		setDeadline(id, deadlineForBucket(bucketKey));
	}
	function rescheduleTasks(moves) {
		const byId = new Map(moves.map((move) => [move.id, move.deadline]));
		const next = tasks.map((task) => byId.has(task.id) ? normalizeTask({
			...task,
			deadline: byId.get(task.id)
		}) : task);
		commit(`${moves.length} task${moves.length === 1 ? "" : "s"} rescheduled`, next);
	}
	function setRecurrence(id, recurrence) {
		updateTask(id, { recurrence });
	}
	function addReminder(id, reminder) {
		if (!reminder) return;
		patch(id, (task) => task.reminders.some((entry) => entry.id === reminder.id) ? {} : { reminders: [...task.reminders, reminder] });
	}
	function removeReminder(id, reminderId) {
		patch(id, (task) => ({ reminders: task.reminders.filter((entry) => entry.id !== reminderId) }));
	}
	function addChecklistItem(id, text) {
		if (!text.trim()) return;
		patch(id, (task) => ({ checklist: [...task.checklist, {
			id: crypto.randomUUID(),
			text: text.trim(),
			done: false
		}] }));
	}
	function toggleChecklistItem(id, itemId) {
		patch(id, (task) => ({ checklist: task.checklist.map((item) => item.id === itemId ? {
			...item,
			done: !item.done
		} : item) }));
	}
	function removeChecklistItem(id, itemId) {
		patch(id, (task) => ({ checklist: task.checklist.filter((item) => item.id !== itemId) }));
	}
	function moveChecklistItem(id, itemId, direction) {
		patch(id, (task) => {
			const index = task.checklist.findIndex((item) => item.id === itemId);
			const target = index + direction;
			if (index < 0 || target < 0 || target >= task.checklist.length) return {};
			const checklist = [...task.checklist];
			const [moved] = checklist.splice(index, 1);
			checklist.splice(target, 0, moved);
			return { checklist };
		});
	}
	function addLink(id, link) {
		patch(id, (task) => ({ links: [...task.links, {
			id: crypto.randomUUID(),
			...link
		}] }));
	}
	function removeLink(id, linkId) {
		patch(id, (task) => ({ links: task.links.filter((entry) => entry.id !== linkId) }));
	}
	function bulkComplete(ids) {
		const selected = new Set(ids);
		const stamp = (/* @__PURE__ */ new Date()).toISOString();
		const next = tasks.map((task) => selected.has(task.id) && !task.done ? normalizeTask(completeTiming(task, stamp)) : task);
		persistImmediately(next);
		commit(`${ids.length} task${ids.length === 1 ? "" : "s"} completed`, next);
	}
	function bulkArchive(ids) {
		const selected = new Set(ids);
		commit(`${ids.length} task${ids.length === 1 ? "" : "s"} archived`, tasks.map((task) => selected.has(task.id) ? normalizeTask({
			...task,
			archived: true
		}) : task));
	}
	function bulkDelete(ids) {
		const selected = new Set(ids);
		commit(`${ids.length} task${ids.length === 1 ? "" : "s"} deleted`, tasks.filter((task) => !selected.has(task.id)));
	}
	function importTasks(newTasks) {
		setTasks(newTasks.map(normalizeTask));
	}
	function clearCompleted() {
		commit("Completed tasks cleared", tasks.filter((task) => !task.done));
	}
	function undo() {
		if (!undoState) return;
		setCompletionFeedback(null);
		setTasks(undoState.snapshot);
		setUndoState(null);
	}
	return {
		tasks,
		dataError: initial.dataError,
		addTask,
		updateTask,
		deleteTask,
		toggleTask,
		completeTask,
		startTask,
		pauseTask,
		togglePin,
		archiveTask,
		unarchiveTask,
		duplicateTask,
		setDeadline,
		rescheduleTasks,
		moveTaskToBucket,
		setRecurrence,
		addReminder,
		removeReminder,
		addChecklistItem,
		toggleChecklistItem,
		removeChecklistItem,
		moveChecklistItem,
		addLink,
		removeLink,
		bulkComplete,
		bulkArchive,
		bulkDelete,
		importTasks,
		clearCompleted,
		undoState,
		undo,
		dismissUndo: () => setUndoState(null),
		completionFeedback,
		dismissCompletionFeedback: () => setCompletionFeedback(null)
	};
}
//#endregion
//#region src/hooks/useRoutines.js
function loadRoutineState() {
	const raw = localStorage.getItem(ROUTINE_STORAGE_KEY);
	if (!raw) return {
		routines: [],
		canPersist: true,
		dataError: ""
	};
	try {
		return {
			routines: migrateRoutineData(JSON.parse(raw)).routines.map(normalizeRoutine),
			canPersist: true,
			dataError: ""
		};
	} catch {
		return {
			routines: [],
			canPersist: false,
			dataError: "Your saved routines could not be read. The original browser data has been left untouched."
		};
	}
}
function useRoutines() {
	const [initial] = useState(loadRoutineState);
	const [routines, setRoutines] = useState(initial.routines);
	useEffect(() => {
		if (!initial.canPersist) return;
		localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(routineEnvelope(routines)));
	}, [initial.canPersist, routines]);
	function addRoutine({ title, steps }) {
		const routine = normalizeRoutine({
			id: crypto.randomUUID(),
			title,
			steps,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		setRoutines((current) => [...current, routine]);
		return routine;
	}
	function updateRoutine(id, updates) {
		setRoutines((current) => current.map((routine) => routine.id === id ? normalizeRoutine({
			...routine,
			...updates,
			id: routine.id
		}) : routine));
	}
	function deleteRoutine(id) {
		setRoutines((current) => current.filter((routine) => routine.id !== id));
	}
	function importRoutines(newRoutines) {
		setRoutines(newRoutines.map(normalizeRoutine));
	}
	return {
		routines,
		dataError: initial.dataError,
		addRoutine,
		updateRoutine,
		deleteRoutine,
		importRoutines
	};
}
//#endregion
//#region src/hooks/useReminderNotifications.js
var CHECK_INTERVAL_MS = 15e3;
function useReminderNotifications(tasks, { onComplete } = {}) {
	const firedRef = useRef(/* @__PURE__ */ new Set());
	const snoozedRef = useRef(/* @__PURE__ */ new Map());
	const startedAtRef = useRef(null);
	const tasksRef = useRef(tasks);
	useEffect(() => {
		tasksRef.current = tasks;
	}, [tasks]);
	useEffect(() => {
		registerNotificationWorker();
	}, []);
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;
		function handleMessage(event) {
			const data = event.data;
			if (!data || data.source !== "tidyline-notification") return;
			if (data.action === "complete" && data.taskId) onComplete?.(data.taskId);
			if (data.action === "snooze" && data.taskId) snoozedRef.current.set(`${data.taskId}:${data.reminderId}`, {
				dueAt: Date.now() + 6e5,
				taskId: data.taskId,
				reminderId: data.reminderId
			});
		}
		navigator.serviceWorker.addEventListener("message", handleMessage);
		return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
	}, [onComplete]);
	useEffect(() => {
		if (startedAtRef.current === null) startedAtRef.current = Date.now();
		function checkReminders() {
			const now = Date.now();
			const windowStart = startedAtRef.current;
			tasksRef.current.forEach((task) => {
				if (task.done || task.archived || !task.deadline) return;
				task.reminders.forEach((reminder) => {
					const snoozeKey = `${task.id}:${reminder.id}`;
					const snoozedUntil = snoozedRef.current.get(snoozeKey)?.dueAt;
					if (snoozedUntil && now < snoozedUntil) return;
					reminderInstances(task, reminder, windowStart, now).forEach((instance) => {
						const key = snoozedUntil ? `${instance.key}:${snoozedUntil}` : instance.key;
						if (firedRef.current.has(key)) return;
						if (instance.at > now || instance.at < windowStart) return;
						firedRef.current.add(key);
						notifyReminder({
							title: task.title,
							body: `Deadline: ${formatDate(task.deadline)}`,
							taskId: task.id,
							reminderId: reminder.id
						});
					});
				});
			});
			snoozedRef.current.forEach(({ dueAt, taskId, reminderId }, key) => {
				if (now < dueAt || firedRef.current.has(`snooze:${key}:${dueAt}`)) return;
				const task = tasksRef.current.find((entry) => entry.id === taskId);
				if (!task || task.done || task.archived) {
					snoozedRef.current.delete(key);
					return;
				}
				firedRef.current.add(`snooze:${key}:${dueAt}`);
				snoozedRef.current.delete(key);
				notifyReminder({
					title: task.title,
					body: `Snoozed reminder — deadline ${formatDate(task.deadline)}`,
					taskId,
					reminderId
				});
			});
		}
		checkReminders();
		const id = setInterval(checkReminders, CHECK_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);
}
//#endregion
//#region src/hooks/useProfile.js
var STORAGE_KEY = "tidyline:profile";
var GUEST_NAME = "Guest";
function normalizeName(value) {
	return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
}
function loadProfile() {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
		if (!stored?.isSetUp) return {
			isSetUp: false,
			name: "",
			isGuest: false
		};
		return {
			isSetUp: true,
			name: normalizeName(stored.name) || GUEST_NAME,
			isGuest: Boolean(stored.isGuest)
		};
	} catch {
		return {
			isSetUp: false,
			name: "",
			isGuest: false
		};
	}
}
/**
* Local-only profile metadata. It deliberately stays separate from task data,
* so a future synced account can replace this record without migrating tasks.
*/
function useProfile() {
	const [profile, setProfile] = useState(loadProfile);
	useEffect(() => {
		if (!profile.isSetUp) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
	}, [profile]);
	function completeSetup(name, isGuest = false) {
		setProfile({
			isSetUp: true,
			name: isGuest ? GUEST_NAME : normalizeName(name) || GUEST_NAME,
			isGuest
		});
	}
	function setName(name) {
		setProfile((current) => ({
			...current,
			isSetUp: true,
			name: normalizeName(name) || GUEST_NAME,
			isGuest: normalizeName(name) === ""
		}));
	}
	return {
		...profile,
		completeSetup,
		setName
	};
}
//#endregion
//#region src/hooks/useShortcuts.js
var TEXT_ENTRY = /* @__PURE__ */ new Set([
	"INPUT",
	"TEXTAREA",
	"SELECT"
]);
/** True when focus sits somewhere that should swallow single-key shortcuts. */
function isTypingTarget(target) {
	if (!target) return false;
	return TEXT_ENTRY.has(target.tagName) || target.isContentEditable === true;
}
function useShortcuts(handlers) {
	useEffect(() => {
		function onKeyDown(event) {
			const typing = isTypingTarget(event.target);
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				handlers.onPalette?.();
				return;
			}
			if (event.key === "Escape") {
				handlers.onEscape?.();
				return;
			}
			if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
			switch (event.key) {
				case "q":
				case "Q":
				case "n":
				case "N":
					event.preventDefault();
					handlers.onQuickAdd?.();
					break;
				case "/":
					event.preventDefault();
					handlers.onFocusSearch?.();
					break;
				case " ":
					if (handlers.onToggleActive?.()) event.preventDefault();
					break;
				case "Delete":
				case "Backspace": if (handlers.onDeleteActive?.()) event.preventDefault();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handlers]);
}
//#endregion
//#region src/utils/parseNaturalTask.js
/**
* Parse the small amount of structure that saves real typing:
* natural-language deadline, #tags, duration, reminder, and recurrence.
*/
function parseNaturalTask(input, referenceDate = /* @__PURE__ */ new Date()) {
	const matchedTokens = [];
	let workingText = String(input ?? "");
	function registerMatch(type, value, startIdx, length, text) {
		matchedTokens.push({
			type,
			value,
			text
		});
		workingText = workingText.slice(0, startIdx) + " ".repeat(length) + workingText.slice(startIdx + length);
	}
	let match;
	const tagRegex = /(?:^|\s)#(\w[\w-]*)\b/gi;
	while ((match = tagRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("tag", match[1].toLowerCase(), startIdx, text.length, text);
	}
	const durationRegex = /(?:^|\s)for\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/gi;
	while ((match = durationRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const amount = Number(match[1]);
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("duration", match[2].toLowerCase().startsWith("h") ? amount * 60 : amount, startIdx, text.length, text);
	}
	const reminderRegex = /(?:^|\s)remind\s+(?:me\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\s+before\b/gi;
	while ((match = reminderRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const amount = Number(match[1]);
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("reminder", match[2].toLowerCase().startsWith("h") ? amount * 60 : amount, startIdx, text.length, text);
	}
	const weekdays = {
		sunday: 0,
		sun: 0,
		monday: 1,
		mon: 1,
		tuesday: 2,
		tue: 2,
		tues: 2,
		wednesday: 3,
		wed: 3,
		thursday: 4,
		thu: 4,
		thur: 4,
		thurs: 4,
		friday: 5,
		fri: 5,
		saturday: 6,
		sat: 6
	};
	const recurrenceRegex = /(?:^|\s)every\s+(day|daily|weekday|weekdays|week|month|monthly|year|yearly|\d+\s+(?:days?|weeks?|months?)|(?:sun|mon|tue(?:s)?|wed|thu(?:rs?)?|fri|sat)(?:urday|nesday|rsday|urday)?(?:day)?)\b/gi;
	while ((match = recurrenceRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const raw = match[1].trim().toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		let recurrence = null;
		if (raw === "day" || raw === "daily") recurrence = { freq: "daily" };
		else if (raw === "weekday" || raw === "weekdays") recurrence = { freq: "weekdays" };
		else if (raw === "week") recurrence = {
			freq: "weekly",
			weekday: referenceDate.getDay()
		};
		else if (raw === "month" || raw === "monthly") recurrence = { freq: "monthly" };
		else if (raw === "year" || raw === "yearly") recurrence = { freq: "yearly" };
		else {
			const interval = /^(\d+)\s+(days?|weeks?|months?)$/.exec(raw);
			if (interval) {
				const amount = Number(interval[1]);
				const unit = interval[2].replace(/s$/, "");
				if (unit === "day") recurrence = {
					freq: "everyNDays",
					n: amount
				};
				if (unit === "week") recurrence = {
					freq: "everyNDays",
					n: amount * 7
				};
				if (unit === "month") recurrence = { freq: "monthly" };
			} else if (weekdays[raw] !== void 0) recurrence = {
				freq: "weekly",
				weekday: weekdays[raw]
			};
		}
		if (recurrence) registerMatch("recurrence", recurrence, startIdx, text.length, text);
	}
	const parsedDates = chrono.parse(workingText, referenceDate, { forwardDate: true });
	if (parsedDates.length > 0) {
		const dateMatch = parsedDates[0];
		let startIdx = dateMatch.index;
		let text = dateMatch.text;
		const preceding = workingText.slice(0, startIdx);
		const prepMatch = /\b(no\s+later\s+than|due\s+on|due|before|until|till|til|by)\s+$/i.exec(preceding);
		if (prepMatch) {
			startIdx -= prepMatch[0].length;
			text = workingText.slice(startIdx, dateMatch.index + dateMatch.text.length);
		}
		registerMatch("deadline", dateMatch.start.date(), startIdx, text.length, text);
	}
	return {
		title: workingText.replace(/\s+/g, " ").trim(),
		deadline: matchedTokens.find((token) => token.type === "deadline")?.value ?? null,
		reminderMinutes: matchedTokens.find((token) => token.type === "reminder")?.value ?? null,
		durationMinutes: matchedTokens.find((token) => token.type === "duration")?.value ?? null,
		recurrence: matchedTokens.find((token) => token.type === "recurrence")?.value ?? null,
		tags: matchedTokens.filter((token) => token.type === "tag").map((token) => token.value),
		matchedTokens
	};
}
//#endregion
//#region src/components/QuickAddModal.jsx
var EXAMPLE_HINTS = [
	"tomorrow 8pm",
	"for 2h",
	"remind 1h before",
	"every weekday",
	"#tag"
];
function formatMinutes(minutes) {
	if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
	if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
	return `${minutes}m`;
}
function toLocalDate(date) {
	return date ? toDateStr(date) : null;
}
function QuickAddModal({ isOpen, onClose, onAddTask, onOpenFullForm, tasks = [] }) {
	const inputRef = useRef(null);
	const [rawInput, setRawInput] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [activeSuggestion, setActiveSuggestion] = useState(-1);
	const parsed = parseNaturalTask(rawInput);
	const suggestions = useMemo(() => {
		const hashMatch = /#(\w*)$/.exec(rawInput);
		if (!hashMatch) return [];
		const partial = hashMatch[1].toLowerCase();
		return collectTags(tasks).filter((tag) => tag.startsWith(partial) && tag !== partial).slice(0, 6).map((tag) => ({
			label: `#${tag}`,
			replace: hashMatch[0],
			with: `#${tag}`
		}));
	}, [rawInput, tasks]);
	useEffect(() => {
		const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
		return () => window.clearTimeout(timer);
	}, []);
	if (!isOpen) return null;
	function applySuggestion(suggestion) {
		setRawInput(rawInput.slice(0, rawInput.lastIndexOf(suggestion.replace)) + suggestion.with);
		setActiveSuggestion(-1);
		inputRef.current?.focus();
	}
	function removeToken(token, event) {
		event.stopPropagation();
		const start = rawInput.indexOf(token.text);
		if (start >= 0) setRawInput(rawInput.slice(0, start) + rawInput.slice(start + token.text.length));
	}
	function editToken(token) {
		const start = rawInput.indexOf(token.text);
		if (start >= 0) {
			inputRef.current?.focus();
			inputRef.current?.setSelectionRange(start, start + token.text.length);
		}
	}
	function submit() {
		if (!parsed.title.trim()) {
			setSubmitError("Task title cannot be empty.");
			return;
		}
		if (!parsed.deadline) {
			setSubmitError("Add a deadline in natural language, such as “Friday” or “tomorrow”.");
			return;
		}
		const deadline = toLocalDate(parsed.deadline);
		if (deadline < toDateStr(/* @__PURE__ */ new Date())) {
			setSubmitError("Deadline cannot be in the past.");
			return;
		}
		if (parsed.durationMinutes !== null && parsed.durationMinutes <= 0) {
			setSubmitError("Duration must be greater than zero.");
			return;
		}
		if (parsed.reminderMinutes !== null && parsed.reminderMinutes <= 0) {
			setSubmitError("Reminder must be before the deadline.");
			return;
		}
		if (parsed.reminderMinutes !== null) ensureNotificationPermission();
		onAddTask({
			title: parsed.title,
			deadline,
			tags: parsed.tags,
			reminders: parsed.reminderMinutes === null ? [] : [{
				id: `rel:${parsed.reminderMinutes}`,
				kind: "relative",
				minutesBefore: parsed.reminderMinutes
			}],
			recurrence: parsed.recurrence,
			duration: parsed.durationMinutes === null ? null : {
				value: parsed.durationMinutes,
				unit: "min"
			}
		});
		onClose();
	}
	function handleKeyDown(event) {
		if (suggestions.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setActiveSuggestion((index) => Math.min(index + 1, suggestions.length - 1));
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setActiveSuggestion((index) => Math.max(index - 1, -1));
				return;
			}
			if ((event.key === "Enter" || event.key === "Tab") && activeSuggestion >= 0) {
				event.preventDefault();
				applySuggestion(suggestions[activeSuggestion]);
				return;
			}
		}
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (event.shiftKey) {
				onOpenFullForm(parsed);
				onClose();
			} else submit();
		}
	}
	const deadlineToken = parsed.matchedTokens.find((token) => token.type === "deadline");
	const recurrenceToken = parsed.matchedTokens.find((token) => token.type === "recurrence");
	const reminderToken = parsed.matchedTokens.find((token) => token.type === "reminder");
	const durationToken = parsed.matchedTokens.find((token) => token.type === "duration");
	const tagTokens = parsed.matchedTokens.filter((token) => token.type === "tag");
	const chips = [
		deadlineToken,
		recurrenceToken,
		reminderToken,
		durationToken,
		...tagTokens
	].filter(Boolean);
	return /* @__PURE__ */ jsxs("div", {
		className: "palette-layer",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Quick add task",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "palette-scrim",
			"aria-label": "Close",
			onClick: onClose
		}), /* @__PURE__ */ jsxs("div", {
			className: "palette quick-add-palette",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "palette-search",
					children: [
						/* @__PURE__ */ jsx(PlusIcon, {}),
						/* @__PURE__ */ jsx("input", {
							ref: inputRef,
							type: "text",
							value: rawInput,
							placeholder: "Submit assignment Friday for 2h #university",
							"aria-label": "Quick add task",
							"aria-autocomplete": "list",
							"aria-controls": suggestions.length ? "quick-add-suggestions" : void 0,
							onChange: (event) => {
								setRawInput(event.target.value);
								setSubmitError("");
								setActiveSuggestion(-1);
							},
							onKeyDown: handleKeyDown
						}),
						/* @__PURE__ */ jsx("kbd", { children: "Esc" })
					]
				}),
				suggestions.length > 0 && /* @__PURE__ */ jsx("ul", {
					id: "quick-add-suggestions",
					className: "quick-add-suggestions",
					role: "listbox",
					children: suggestions.map((suggestion, index) => /* @__PURE__ */ jsx("li", {
						role: "option",
						"aria-selected": index === activeSuggestion,
						className: index === activeSuggestion ? "quick-add-suggestion is-active" : "quick-add-suggestion",
						onMouseDown: (event) => {
							event.preventDefault();
							applySuggestion(suggestion);
						},
						children: suggestion.label
					}, suggestion.label))
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "quick-add-body",
					children: [
						chips.length > 0 && /* @__PURE__ */ jsxs("div", {
							className: "quick-add-chips-container",
							children: [/* @__PURE__ */ jsx("span", {
								className: "quick-add-chips-label",
								children: "Understood"
							}), /* @__PURE__ */ jsxs("ul", {
								className: "tag-list quick-add-chips",
								children: [
									deadlineToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-accent quick-add-chip",
										onClick: () => editToken(deadlineToken),
										children: [/* @__PURE__ */ jsx("span", { children: formatDate(toLocalDate(deadlineToken.value)) }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (event) => removeToken(deadlineToken, event),
											"aria-label": "Remove deadline",
											children: "×"
										})]
									}),
									durationToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-neutral quick-add-chip",
										onClick: () => editToken(durationToken),
										children: [/* @__PURE__ */ jsx("span", { children: formatMinutes(parsed.durationMinutes) }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (event) => removeToken(durationToken, event),
											"aria-label": "Remove duration",
											children: "×"
										})]
									}),
									reminderToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-lavender quick-add-chip",
										onClick: () => editToken(reminderToken),
										children: [/* @__PURE__ */ jsxs("span", { children: [formatMinutes(parsed.reminderMinutes), " before"] }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (event) => removeToken(reminderToken, event),
											"aria-label": "Remove reminder",
											children: "×"
										})]
									}),
									recurrenceToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-lavender quick-add-chip",
										onClick: () => editToken(recurrenceToken),
										children: [/* @__PURE__ */ jsx("span", { children: describeRecurrence(parsed.recurrence) }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (event) => removeToken(recurrenceToken, event),
											"aria-label": "Remove recurrence",
											children: "×"
										})]
									}),
									tagTokens.map((token) => /* @__PURE__ */ jsxs("li", {
										className: `tag ${tagTone(token.value)} quick-add-chip`,
										onClick: () => editToken(token),
										children: [/* @__PURE__ */ jsxs("span", { children: ["#", token.value] }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (event) => removeToken(token, event),
											"aria-label": `Remove tag ${token.value}`,
											children: "×"
										})]
									}, token.text))
								]
							})]
						}),
						reminderToken && /* @__PURE__ */ jsx("small", {
							className: "reminder-truth",
							children: "Alerts are checked only while TidyLine is open."
						}),
						!rawInput.trim() && /* @__PURE__ */ jsxs("div", {
							className: "quick-add-hints",
							children: [/* @__PURE__ */ jsx("span", { children: "Try" }), EXAMPLE_HINTS.map((hint) => /* @__PURE__ */ jsx("code", { children: hint }, hint))]
						}),
						submitError && /* @__PURE__ */ jsx("p", {
							className: "quick-add-error",
							role: "alert",
							children: submitError
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "palette-footer quick-add-footer",
					children: [/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("kbd", { children: "Enter" }), " add"] }), /* @__PURE__ */ jsxs("span", { children: [
						/* @__PURE__ */ jsx("kbd", { children: "Shift" }),
						" + ",
						/* @__PURE__ */ jsx("kbd", { children: "Enter" }),
						" open details"
					] })]
				})
			]
		})]
	});
}
//#endregion
//#region src/components/WelcomeDialog.jsx
function WelcomeDialog({ accent, onAccentChange, onImportTasks, onImportRoutines, onComplete }) {
	const nameInputRef = useRef(null);
	const fileInputRef = useRef(null);
	const [name, setName] = useState("");
	const [importMessage, setImportMessage] = useState("");
	useEffect(() => {
		nameInputRef.current?.focus();
	}, []);
	function finishAsGuest() {
		onComplete("", true);
	}
	function handleSubmit(event) {
		event.preventDefault();
		if (!name.trim()) return;
		onComplete(name, false);
	}
	function handleImport(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const raw = String(reader.result);
				const tasks = parseImportedTasks(raw);
				const routines = parseImportedRoutines(raw);
				onImportTasks(tasks);
				onImportRoutines?.(routines ?? []);
				setImportMessage(`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}${routines?.length ? ` and ${routines.length} ${routines.length === 1 ? "routine" : "routines"}` : ""} imported.`);
			} catch {
				setImportMessage("That file is not a valid TidyLine export.");
			}
		};
		reader.readAsText(file);
		event.target.value = "";
	}
	return /* @__PURE__ */ jsx("main", {
		className: "welcome-screen",
		children: /* @__PURE__ */ jsxs("section", {
			className: "welcome-card",
			"aria-labelledby": "welcome-title",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "welcome-brand",
					children: [/* @__PURE__ */ jsx(BrandMonogram, { size: 30 }), /* @__PURE__ */ jsx("span", { children: "TidyLine" })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "welcome-copy",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "welcome-kicker",
							children: "Local workspace"
						}),
						/* @__PURE__ */ jsx("h1", {
							id: "welcome-title",
							children: "Make this space yours."
						}),
						/* @__PURE__ */ jsx("p", { children: "Your name helps distinguish this local TidyLine workspace. No account or online signup is needed." })
					]
				}),
				/* @__PURE__ */ jsxs("form", {
					className: "welcome-form",
					onSubmit: handleSubmit,
					children: [
						/* @__PURE__ */ jsxs("label", {
							className: "welcome-name-field",
							children: [/* @__PURE__ */ jsx("span", { children: "Your name" }), /* @__PURE__ */ jsx("input", {
								ref: nameInputRef,
								type: "text",
								value: name,
								maxLength: "48",
								placeholder: "What should we call this workspace?",
								onChange: (event) => setName(event.target.value)
							})]
						}),
						/* @__PURE__ */ jsxs("fieldset", {
							className: "welcome-accent-field",
							children: [/* @__PURE__ */ jsx("legend", { children: "Choose an accent colour" }), /* @__PURE__ */ jsx("div", {
								className: "accent-choices",
								role: "group",
								"aria-label": "Choose an accent colour",
								children: ACCENT_OPTIONS.map((option) => /* @__PURE__ */ jsx("button", {
									type: "button",
									className: accent === option.value ? "accent-swatch active" : "accent-swatch",
									style: { background: option.value },
									onClick: () => onAccentChange(option.value),
									"aria-pressed": accent === option.value,
									"aria-label": option.label,
									title: option.label
								}, option.value))
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "welcome-import",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: "Already have TidyLine data?" }), /* @__PURE__ */ jsx("span", { children: "Import a previous JSON export before you start." })] }),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "secondary",
									onClick: () => fileInputRef.current?.click(),
									children: "Import JSON"
								}),
								/* @__PURE__ */ jsx("input", {
									ref: fileInputRef,
									type: "file",
									accept: "application/json",
									onChange: handleImport,
									hidden: true
								})
							]
						}),
						importMessage && /* @__PURE__ */ jsx("p", {
							className: "welcome-import-message",
							role: "status",
							children: importMessage
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "welcome-actions",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "secondary",
								onClick: finishAsGuest,
								children: "Start as guest"
							}), /* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "primary",
								disabled: !name.trim(),
								children: "Continue"
							})]
						})
					]
				})
			]
		})
	});
}
//#endregion
//#region src/App.jsx
var DELETE_CONFIRM_KEY = "tidyline:confirm-delete";
var ROUTES = /* @__PURE__ */ new Set([
	"/",
	"/board",
	"/calendar",
	"/routines",
	"/settings"
]);
function loadDeleteConfirmation() {
	return localStorage.getItem(DELETE_CONFIRM_KEY) !== "false";
}
function activeTaskId() {
	const focused = document.activeElement?.closest?.("[data-task-id]");
	if (focused) return focused.dataset.taskId;
	return document.querySelector("[data-task-id]:hover")?.dataset.taskId ?? null;
}
function App() {
	const taskState = useTasks();
	const routineState = useRoutines();
	const appearance = useTheme();
	const profile = useProfile();
	const [location, navigate] = useLocation();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isPaletteOpen, setIsPaletteOpen] = useState(false);
	const [askBeforeDelete, setAskBeforeDelete] = useState(loadDeleteConfirmation);
	const [pendingDeleteId, setPendingDeleteId] = useState(null);
	const [taskAdded, setTaskAdded] = useState(null);
	const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
	useEffect(() => {
		if (!ROUTES.has(location)) navigate("/", { replace: true });
	}, [location, navigate]);
	useEffect(() => {
		localStorage.setItem(DELETE_CONFIRM_KEY, String(askBeforeDelete));
	}, [askBeforeDelete]);
	useEffect(() => {
		if (!isDrawerOpen) return void 0;
		function closeOnEscape(event) {
			if (event.key === "Escape") setIsDrawerOpen(false);
		}
		window.addEventListener("keydown", closeOnEscape);
		return () => window.removeEventListener("keydown", closeOnEscape);
	}, [isDrawerOpen]);
	const onNotificationComplete = useCallback((taskId) => taskState.completeTask(taskId), [taskState]);
	useReminderNotifications(taskState.tasks, { onComplete: onNotificationComplete });
	function createTask(taskData) {
		const task = taskState.addTask(taskData);
		setTaskAdded({
			id: task.id,
			title: task.title
		});
		return task;
	}
	const focusSearch = useCallback(() => {
		const input = document.querySelector(".toolbar-search input");
		if (input) {
			input.focus();
			return;
		}
		navigate("/board");
		window.setTimeout(() => document.querySelector(".toolbar-search input")?.focus(), 80);
	}, [navigate]);
	const requestDelete = useCallback((taskId) => {
		setTaskAdded(null);
		if (askBeforeDelete) setPendingDeleteId(taskId);
		else taskState.deleteTask(taskId);
	}, [askBeforeDelete, taskState]);
	const commands = useMemo(() => [
		{
			id: "new",
			label: "Create task",
			hint: "N/Q",
			run: () => setIsQuickAddOpen(true)
		},
		{
			id: "search",
			label: "Focus search",
			hint: "/",
			run: focusSearch
		},
		{
			id: "now",
			label: "Go to Now",
			run: () => navigate("/")
		},
		{
			id: "board",
			label: "Go to Board",
			run: () => navigate("/board")
		},
		{
			id: "calendar",
			label: "Go to Calendar",
			run: () => navigate("/calendar")
		},
		{
			id: "routines",
			label: "Go to Routines",
			run: () => navigate("/routines")
		},
		{
			id: "settings",
			label: "Go to Settings",
			run: () => navigate("/settings")
		},
		{
			id: "archive",
			label: "Show archived tasks",
			run: () => navigate("/board?view=archived")
		},
		{
			id: "theme",
			label: `Switch to ${appearance.theme === "dark" ? "light" : "dark"} theme`,
			run: appearance.toggleTheme
		},
		{
			id: "density",
			label: `Use ${appearance.density === "compact" ? "comfortable" : "compact"} density`,
			run: () => appearance.setDensity(appearance.density === "compact" ? "comfortable" : "compact")
		}
	], [
		appearance,
		focusSearch,
		navigate
	]);
	useShortcuts(useMemo(() => ({
		onPalette: () => setIsPaletteOpen((open) => !open),
		onEscape: () => {
			setIsPaletteOpen(false);
			setIsQuickAddOpen(false);
		},
		onQuickAdd: () => setIsQuickAddOpen(true),
		onFocusSearch: focusSearch,
		onToggleActive: () => {
			const id = activeTaskId();
			if (!id) return false;
			taskState.toggleTask(id);
			return true;
		},
		onDeleteActive: () => {
			const id = activeTaskId();
			if (!id) return false;
			requestDelete(id);
			return true;
		}
	}), [
		focusSearch,
		requestDelete,
		taskState
	]));
	function openFullForm(parsed) {
		const params = new URLSearchParams({ add: "1" });
		if (parsed.title) params.set("title", parsed.title);
		if (parsed.deadline) params.set("deadline", toDateStr(parsed.deadline));
		if (parsed.tags.length) params.set("tags", parsed.tags.join(", "));
		if (parsed.reminderMinutes) params.set("reminderMinutes", String(parsed.reminderMinutes));
		if (parsed.durationMinutes) params.set("durationMinutes", String(parsed.durationMinutes));
		if (parsed.recurrence) params.set("recurrence", JSON.stringify(parsed.recurrence));
		navigate(`/board?${params.toString()}`);
	}
	if (!profile.isSetUp) return /* @__PURE__ */ jsx(WelcomeDialog, {
		accent: appearance.accent,
		onAccentChange: appearance.setAccent,
		onImportTasks: taskState.importTasks,
		onImportRoutines: routineState.importRoutines,
		onComplete: profile.completeSetup
	});
	return /* @__PURE__ */ jsxs("div", {
		className: isCollapsed ? "app-layout collapsed" : "app-layout",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "topbar",
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "icon-button",
					onClick: () => setIsDrawerOpen(true),
					"aria-label": "Open navigation",
					"aria-expanded": isDrawerOpen,
					"aria-controls": "sidebar-nav",
					children: /* @__PURE__ */ jsx(MenuIcon, {})
				}), /* @__PURE__ */ jsx("span", {
					className: "topbar-title",
					children: profile.name
				})]
			}),
			/* @__PURE__ */ jsx(Sidebar, {
				isOpen: isDrawerOpen,
				isCollapsed,
				onToggleCollapse: () => setIsCollapsed((current) => !current),
				onNavigate: () => setIsDrawerOpen(false),
				onOpenPalette: () => {
					setIsDrawerOpen(false);
					setIsPaletteOpen(true);
				},
				workspaceName: profile.name,
				tasks: taskState.tasks,
				onOpenTask: (taskId) => {
					setIsDrawerOpen(false);
					navigate(`/board?expand=${encodeURIComponent(taskId)}`);
				}
			}),
			isDrawerOpen && /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "sidebar-backdrop",
				"aria-label": "Close navigation",
				onClick: () => setIsDrawerOpen(false)
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "app-content",
				children: [taskState.dataError && /* @__PURE__ */ jsx("p", {
					className: "data-error",
					role: "alert",
					children: taskState.dataError
				}), /* @__PURE__ */ jsx("div", {
					className: "route-view",
					children: /* @__PURE__ */ jsxs(Switch, { children: [
						/* @__PURE__ */ jsx(Route, {
							path: "/",
							children: /* @__PURE__ */ jsx(NowPage, {
								tasks: taskState.tasks,
								onComplete: taskState.completeTask,
								onStart: taskState.startTask,
								onPause: taskState.pauseTask
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/board",
							children: /* @__PURE__ */ jsx(BoardPage, {
								...taskState,
								addTask: createTask,
								deleteTask: requestDelete
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/calendar",
							children: /* @__PURE__ */ jsx(CalendarPage, {
								tasks: taskState.tasks,
								addTask: createTask,
								setDeadline: taskState.setDeadline
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/routines",
							children: /* @__PURE__ */ jsx(RoutinesPage, {
								routines: routineState.routines,
								dataError: routineState.dataError,
								onAdd: routineState.addRoutine,
								onUpdate: routineState.updateRoutine,
								onDelete: routineState.deleteRoutine
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/settings",
							children: /* @__PURE__ */ jsx(SettingsPage, {
								tasks: taskState.tasks,
								appearance,
								importTasks: taskState.importTasks,
								clearCompleted: taskState.clearCompleted,
								askBeforeDelete,
								onAskBeforeDeleteChange: setAskBeforeDelete,
								profile,
								routines: routineState.routines,
								importRoutines: routineState.importRoutines
							})
						})
					] })
				}, location)]
			}),
			isPaletteOpen && /* @__PURE__ */ jsx(CommandPalette, {
				commands,
				onClose: () => setIsPaletteOpen(false)
			}),
			isQuickAddOpen && /* @__PURE__ */ jsx(QuickAddModal, {
				isOpen: true,
				onClose: () => setIsQuickAddOpen(false),
				onAddTask: createTask,
				onOpenFullForm: openFullForm,
				tasks: taskState.tasks
			}),
			pendingDeleteId && /* @__PURE__ */ jsx(DeleteConfirmDialog, {
				taskTitle: taskState.tasks.find((task) => task.id === pendingDeleteId)?.title ?? "This task",
				onCancel: () => setPendingDeleteId(null),
				onConfirm: (dontAskAgain) => {
					if (dontAskAgain) setAskBeforeDelete(false);
					taskState.deleteTask(pendingDeleteId);
					setPendingDeleteId(null);
				}
			}),
			taskAdded && /* @__PURE__ */ jsx(TaskAddedToast, {
				title: taskAdded.title,
				onEdit: () => {
					navigate(`/board?expand=${encodeURIComponent(taskAdded.id)}`);
					setTaskAdded(null);
				},
				onDismiss: () => setTaskAdded(null)
			}, taskAdded.id),
			taskState.completionFeedback && /* @__PURE__ */ jsx(CompletionFeedbackToast, {
				feedback: taskState.completionFeedback,
				onDismiss: taskState.dismissCompletionFeedback
			}, taskState.completionFeedback.id)
		]
	});
}
//#endregion
export { App as default };
