import { C as MenuIcon, M as SettingsIcon, O as PlusIcon, f as ClockIcon, j as SearchIcon, m as CommandIcon, o as BoardIcon, p as CloseIcon, s as CalendarIcon, t as AnalyticsIcon, u as ChevronLeftIcon, w as NotesIcon, y as HomeIcon } from "./icons-98MzWrNh.js";
import { n as BrandMonogram, t as WelcomeDialog } from "./WelcomeDialog-CZS_Yl5i.js";
import { a as getCountdownLabel, n as deadlineMoment, p as toDateStr, r as formatDate } from "./dates-OcvPtNgq.js";
import { n as DEFAULT_FILTERS, r as filterTasks, t as BoardPage } from "./BoardPage-2cEkHGFu.js";
import { t as Checkbox } from "./Checkbox-BFHOKa4z.js";
import { a as isTaskUpcoming, i as isTaskPlannedForToday } from "./taskFields-B8eA_8sb.js";
import { n as BUCKET_ORDER, o as normalizeBucketOrder, r as REQUIRED_BUCKETS } from "./buckets-CeS2d1pg.js";
import { n as useAuth, t as HomePage } from "./HomePage-CWQZMUyT.js";
import { i as tagTone, n as collectTags } from "./TagList-QBt6i8xH.js";
import { a as registerNotificationWorker, r as notifyReminder } from "./notifications-DxfYIWpl.js";
import { c as describeRecurrence, i as reminderInstances } from "./reminders-Dz29wQZM.js";
import { t as CalendarPage } from "./CalendarPage-zKQ5QP4x.js";
import { t as AnalyticsPage } from "./AnalyticsPage-D0acd1wd.js";
import { n as useTheme, t as SettingsPage } from "./SettingsPage-DOR69axB.js";
import { n as useTasks } from "./useTasks-BkOrNhDU.js";
import { t as PlannerPage } from "./PlannerPage-DTRgWuXg.js";
import { t as SomedayPage } from "./SomedayPage-Dzxqa9ir.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { createPortal } from "react-dom";
import * as chrono from "chrono-node";
//#region src/components/Sidebar.jsx
var NAV_ITEMS = [
	{
		href: "/",
		label: "Home",
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
	},
	{
		href: "/planner",
		label: "Day planner",
		Icon: ClockIcon
	},
	{
		href: "/someday",
		label: "Someday / Maybe",
		Icon: NotesIcon
	},
	{
		href: "/analytics",
		label: "Analytics",
		Icon: AnalyticsIcon
	},
	{
		href: "/settings",
		label: "Settings",
		Icon: SettingsIcon
	}
];
function Sidebar({ isOpen, isCollapsed, onToggleCollapse, onNavigate, onOpenPalette, onOpenShutdown, workspaceName = "TidyLine", tasks = [], onOpenTask }) {
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
		function handlePointerDown(event) {
			if (searchRef.current && !searchRef.current.contains(event.target)) setQuery("");
		}
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, []);
	function openResult(task) {
		if (!task) return;
		setQuery("");
		onOpenTask?.(task.id);
	}
	function handleSearchKeyDown(event) {
		if (event.key === "Escape") {
			setQuery("");
			event.currentTarget.blur();
			return;
		}
		if (!results.length) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveResult((current) => Math.min(current + 1, results.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveResult((current) => Math.max(current - 1, 0));
		} else if (event.key === "Enter") {
			event.preventDefault();
			openResult(results[activeResultIndex]);
		}
	}
	useLayoutEffect(() => {
		if (!listRef.current || activeIndex < 0) return;
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
		if (active) measure();
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
							onKeyDown: handleSearchKeyDown,
							"aria-label": "Search tasks",
							"aria-autocomplete": "list",
							"aria-controls": "sidebar-task-results",
							"aria-activedescendant": activeResultIndex >= 0 ? `sidebar-task-${results[activeResultIndex]?.id}` : void 0
						})
					]
				}), query.trim() && /* @__PURE__ */ jsx("div", {
					id: "sidebar-task-results",
					className: "sidebar-search-results",
					role: "listbox",
					"aria-label": "Task search results",
					children: results.length ? results.map((task, index) => /* @__PURE__ */ jsxs("button", {
						id: `sidebar-task-${task.id}`,
						type: "button",
						className: index === activeResultIndex ? "sidebar-search-result active" : "sidebar-search-result",
						role: "option",
						"aria-selected": index === activeResultIndex,
						onMouseEnter: () => setActiveResult(index),
						onClick: () => openResult(task),
						children: [/* @__PURE__ */ jsx("strong", { children: task.title }), /* @__PURE__ */ jsx("span", { children: task.done ? "Completed" : task.deadline ? getCountdownLabel(task.deadline) : "Someday / Maybe" })]
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
				}), NAV_ITEMS.map((item) => {
					const ItemIcon = item.Icon;
					return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						href: item.href,
						title: item.label,
						onClick: onNavigate,
						className: location === item.href ? "nav-item active" : "nav-item",
						children: [/* @__PURE__ */ jsx(ItemIcon, {}), /* @__PURE__ */ jsx("span", { children: item.label })]
					}) }, item.href);
				})]
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "sidebar-review",
				onClick: onOpenShutdown,
				title: "Review the day",
				children: [/* @__PURE__ */ jsx(ClockIcon, {}), /* @__PURE__ */ jsx("span", { children: "Review the day" })]
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
function tomorrowDate(referenceDate = /* @__PURE__ */ new Date()) {
	const tomorrow = new Date(referenceDate);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return toDateStr(tomorrow);
}
//#endregion
//#region src/components/ShutdownDialog.jsx
var EXIT_MS = 160;
function ShutdownDialog({ tasks, setDeadline, archiveTask, onClose }) {
	const summary = getDailyShutdown(tasks);
	const [handled, setHandled] = useState([]);
	const [dates, setDates] = useState({});
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
	function resolve(id) {
		setHandled((current) => [...current, id]);
	}
	const unfinished = summary.unfinished.filter((task) => !handled.includes(task.id));
	return createPortal(/* @__PURE__ */ jsxs("div", {
		className: closing ? "task-detail-layer closing" : "task-detail-layer",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Daily shutdown",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "task-detail-scrim",
			"aria-label": "Close daily shutdown",
			onClick: close
		}), /* @__PURE__ */ jsxs("article", {
			className: "task-detail-dialog shutdown-dialog",
			children: [/* @__PURE__ */ jsxs("header", {
				className: "task-detail-heading",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", { children: "Daily shutdown" }), /* @__PURE__ */ jsx("span", { children: formatDate(summary.date) })] }), /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "icon-mini",
					onClick: close,
					"aria-label": "Close daily shutdown",
					children: /* @__PURE__ */ jsx(CloseIcon, {})
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "shutdown-dialog-content",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "shutdown-stat",
						children: [/* @__PURE__ */ jsxs("strong", { children: [
							summary.completed,
							"/",
							summary.tasks.length
						] }), /* @__PURE__ */ jsx("span", { children: "tasks completed today" })]
					}),
					unfinished.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "empty",
						children: "No unfinished tasks left to review."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "shutdown-list",
						children: unfinished.map((task) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: task.title }), /* @__PURE__ */ jsxs("div", {
							className: "shutdown-actions",
							children: [
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "secondary",
									onClick: () => {
										setDeadline(task.id, tomorrowDate(), "edit", { plannedDate: null });
										resolve(task.id);
									},
									children: "Tomorrow"
								}),
								/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsxs("span", {
									className: "sr-only",
									children: ["New deadline for ", task.title]
								}), /* @__PURE__ */ jsx("input", {
									type: "date",
									value: dates[task.id] ?? "",
									onChange: (event) => setDates((current) => ({
										...current,
										[task.id]: event.target.value
									}))
								})] }),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "secondary",
									disabled: !dates[task.id],
									onClick: () => {
										setDeadline(task.id, dates[task.id], "edit", { plannedDate: null });
										resolve(task.id);
									},
									children: "Move"
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "secondary",
									onClick: () => resolve(task.id),
									children: task.deadline === summary.date ? "Keep as overdue" : "Keep as is"
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "secondary",
									onClick: () => {
										archiveTask(task.id);
										resolve(task.id);
									},
									children: "Archive"
								})
							]
						})] }, task.id))
					}),
					/* @__PURE__ */ jsx("div", {
						className: "dialog-actions",
						children: /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "primary",
							onClick: close,
							children: "Finish review"
						})
					})
				]
			})]
		})]
	}), document.body);
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
			if (data.action === "snooze" && data.taskId) snoozedRef.current.set(`${data.taskId}:${data.reminderId}`, Date.now() + 6e5);
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
					const snoozedUntil = snoozedRef.current.get(snoozeKey);
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
			snoozedRef.current.forEach((dueAt, key) => {
				if (now < dueAt || firedRef.current.has(`snooze:${key}:${dueAt}`)) return;
				const [taskId, reminderId] = key.split(":");
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
var STORAGE_KEY$3 = "tidyline:profile";
var GUEST_NAME = "Guest";
function normalizeName(value) {
	return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
}
function loadProfile() {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY$3) ?? "null");
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
*
* Pass `authUser` (the raw Supabase user object from useAuth().user) so this
* hook can react to sign-in and sign-out events in a single, race-free place:
*
*   SIGNED IN  → if profile isn't set up or is a guest session, update the
*                name to the Google display name.
*   SIGNED OUT → automatically reset the profile so the WelcomeDialog shows.
*                No external coordination in App.jsx is needed.
*/
function useProfile(authUser = null) {
	const [profile, setProfile] = useState(loadProfile);
	useEffect(() => {
		if (!profile.isSetUp) return;
		localStorage.setItem(STORAGE_KEY$3, JSON.stringify(profile));
	}, [profile]);
	const prevUserRef = useRef(authUser);
	useEffect(() => {
		const prevUser = prevUserRef.current;
		prevUserRef.current = authUser;
		if (authUser) {
			const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User";
			setProfile((current) => {
				if (!current.isSetUp || current.isGuest) return {
					isSetUp: true,
					name: normalizeName(googleName) || GUEST_NAME,
					isGuest: false
				};
				return current;
			});
		} else if (prevUser) {
			localStorage.removeItem(STORAGE_KEY$3);
			setProfile({
				isSetUp: false,
				name: "",
				isGuest: false
			});
		}
	}, [authUser]);
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
	function resetProfile() {
		localStorage.removeItem(STORAGE_KEY$3);
		setProfile({
			isSetUp: false,
			name: "",
			isGuest: false
		});
	}
	return {
		...profile,
		completeSetup,
		setName,
		resetProfile
	};
}
//#endregion
//#region src/hooks/useBucketConfig.js
var STORAGE_KEY$2 = "tidyline:bucket-order";
function loadBucketOrder() {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY$2) ?? "null");
		return normalizeBucketOrder(stored ?? BUCKET_ORDER);
	} catch {
		return BUCKET_ORDER;
	}
}
function useBucketConfig() {
	const [bucketOrder, setBucketOrder] = useState(loadBucketOrder);
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY$2, JSON.stringify(bucketOrder));
	}, [bucketOrder]);
	function toggleBucket(bucketKey) {
		if (REQUIRED_BUCKETS.includes(bucketKey)) return;
		setBucketOrder((current) => normalizeBucketOrder(current.includes(bucketKey) ? current.filter((bucket) => bucket !== bucketKey) : [...current, bucketKey]));
	}
	function resetBuckets() {
		setBucketOrder(BUCKET_ORDER);
	}
	return {
		bucketOrder,
		toggleBucket,
		resetBuckets
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
//#region src/hooks/useTemplates.js
var STORAGE_KEY$1 = "tidyline:task-templates";
function list(value) {
	return Array.isArray(value) ? value : [];
}
function normalizeTemplate(template) {
	return {
		id: typeof template.id === "string" ? template.id : crypto.randomUUID(),
		name: typeof template.name === "string" && template.name.trim() ? template.name.trim() : "Untitled template",
		notes: typeof template.notes === "string" ? template.notes : "",
		tags: list(template.tags).filter((tag) => typeof tag === "string"),
		checklist: list(template.checklist).filter((item) => item && typeof item.text === "string").map((item) => ({ text: item.text })),
		duration: template.duration ?? null,
		reminders: list(template.reminders),
		recurrence: template.recurrence ?? null
	};
}
function loadTemplates() {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY$1) ?? "[]");
		return Array.isArray(parsed) ? parsed.map(normalizeTemplate) : [];
	} catch {
		return [];
	}
}
function taskToTemplate(task, name) {
	return normalizeTemplate({
		id: crypto.randomUUID(),
		name,
		notes: task.notes,
		tags: task.tags,
		checklist: task.checklist,
		duration: task.duration,
		reminders: task.reminders,
		recurrence: task.recurrence
	});
}
function useTemplates() {
	const [templates, setTemplates] = useState(loadTemplates);
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY$1, JSON.stringify(templates));
	}, [templates]);
	function saveTaskTemplate(task, name) {
		if (!name.trim()) return null;
		const template = taskToTemplate(task, name);
		setTemplates((current) => [...current, template]);
		return template;
	}
	function renameTemplate(id, name) {
		if (!name.trim()) return;
		setTemplates((current) => current.map((template) => template.id === id ? {
			...template,
			name: name.trim()
		} : template));
	}
	function deleteTemplate(id) {
		setTemplates((current) => current.filter((template) => template.id !== id));
	}
	return {
		templates,
		saveTaskTemplate,
		renameTemplate,
		deleteTemplate
	};
}
//#endregion
//#region src/hooks/useSavedFilters.js
var STORAGE_KEY = "tidyline:saved-filters";
function normalizeFilters(filters) {
	return {
		...DEFAULT_FILTERS,
		...filters ?? {}
	};
}
function loadSavedFilters() {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((entry) => entry && typeof entry.id === "string" && typeof entry.name === "string").map((entry) => ({
			...entry,
			filters: normalizeFilters(entry.filters)
		}));
	} catch {
		return [];
	}
}
function useSavedFilters() {
	const [savedFilters, setSavedFilters] = useState(loadSavedFilters);
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters));
	}, [savedFilters]);
	function saveFilter(name, filters) {
		if (!name.trim()) return null;
		const saved = {
			id: crypto.randomUUID(),
			name: name.trim(),
			filters: normalizeFilters(filters)
		};
		setSavedFilters((current) => [...current, saved]);
		return saved;
	}
	function deleteFilter(id) {
		setSavedFilters((current) => current.filter((entry) => entry.id !== id));
	}
	return {
		savedFilters,
		saveFilter,
		deleteFilter
	};
}
//#endregion
//#region src/utils/parseNaturalTask.js
/**
* Parses natural language input to extract task metadata.
* Phases 1, 2 & 3:
*
* Supported syntax (order shown is the stripping order, which prevents cross-match):
*
*  Tags            #tagname
*  Priority        !high / !medium / !low  or  p1 / p2 / p3
*  Energy          @low / @normal / @deep / @deep-focus
*  Duration        for 2h / for 45 minutes / for 45m
*  Reminder        remind me 2h before / remind 30m before
*  Recurrence      every day / every weekday / every Monday / every 2 weeks / every week
*  Start date      start Monday / start Friday / start next week
*  Plan today      plan today  (explicit 2-word form; standalone "today" is left for deadline)
*  Deadline        parsed by chrono-node from whatever text remains after the above
*  Prepositions    "due on / due / by" are absorbed into the deadline span
*
* @param {string} input
* @param {Date} [referenceDate]
* @returns {ParsedTask}
*/
function parseNaturalTask(input, referenceDate = /* @__PURE__ */ new Date()) {
	const matchedTokens = [];
	let workingText = input;
	function registerMatch(type, value, startIdx, length, text) {
		matchedTokens.push({
			type,
			value,
			text
		});
		workingText = workingText.slice(0, startIdx) + " ".repeat(length) + workingText.slice(startIdx + length);
	}
	const tagRegex = /(?:^|\s)#(\w[\w-]*)\b/gi;
	let match;
	while ((match = tagRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("tag", match[1].toLowerCase(), startIdx, text.length, text);
	}
	const bangPriorityRegex = /(?:^|\s)!(high|medium|low)\b/gi;
	while ((match = bangPriorityRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("priority", match[1].toLowerCase(), startIdx, text.length, text);
	}
	if (!matchedTokens.some((t) => t.type === "priority")) {
		const pMap = {
			p1: "high",
			p2: "medium",
			p3: "low"
		};
		const pRegex = /(?:^|\s)\b(p1|p2|p3)\b/gi;
		while ((match = pRegex.exec(workingText)) !== null) {
			const text = match[0].trim();
			const startIdx = match.index + (match[0].length - match[0].trimStart().length);
			registerMatch("priority", pMap[match[1].toLowerCase()], startIdx, text.length, text);
		}
	}
	const energyRegex = /(?:^|\s)@(low|normal|deep-focus|deep)\b/gi;
	while ((match = energyRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("energy", match[1].toLowerCase() === "deep" ? "deep-focus" : match[1].toLowerCase(), startIdx, text.length, text);
	}
	const durationRegex = /(?:^|\s)for\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/gi;
	while ((match = durationRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const num = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("duration", unit.startsWith("h") ? num * 60 : num, startIdx, text.length, text);
	}
	const reminderRegex = /(?:^|\s)remind\s+(?:me\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\s+before\b/gi;
	while ((match = reminderRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const num = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("reminder", unit.startsWith("h") ? num * 60 : num, startIdx, text.length, text);
	}
	const WEEKDAY_MAP = {
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
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		const raw = match[1].trim().toLowerCase();
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
			const nMatch = /^(\d+)\s+(days?|weeks?|months?)$/.exec(raw);
			if (nMatch) {
				const n = parseInt(nMatch[1], 10);
				const unit = nMatch[2].replace(/s$/, "");
				if (unit === "day") recurrence = {
					freq: "everyNDays",
					n
				};
				else if (unit === "week") recurrence = n === 1 ? {
					freq: "weekly",
					weekday: referenceDate.getDay()
				} : {
					freq: "everyNDays",
					n: n * 7
				};
				else if (unit === "month") recurrence = { freq: "monthly" };
			} else {
				const wdKey = raw.toLowerCase();
				if (WEEKDAY_MAP[wdKey] !== void 0) recurrence = {
					freq: "weekly",
					weekday: WEEKDAY_MAP[wdKey]
				};
			}
		}
		if (recurrence) registerMatch("recurrence", recurrence, startIdx, text.length, text);
	}
	const startDateRegex = new RegExp(`(?:^|\\s)start\\s+(next\\s+\\w+|this\\s+\\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|tomorrow|today|weekend)`, "gi");
	while ((match = startDateRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		const datePart = match[1].trim();
		const parsedStart = chrono.parse(datePart, referenceDate, { forwardDate: true });
		if (parsedStart.length > 0) registerMatch("startDate", parsedStart[0].start.date(), startIdx, text.length, text);
	}
	const planTodayRegex = /(?:^|\s)(plan today)\b/gi;
	while ((match = planTodayRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		registerMatch("planForToday", true, match.index + (match[0].length - match[0].trimStart().length), text.length, text);
	}
	const parsedDates = chrono.parse(workingText, referenceDate, { forwardDate: true });
	if (parsedDates.length > 0) {
		const dateMatch = parsedDates[0];
		let startIdx = dateMatch.index;
		let text = dateMatch.text;
		const preceding = workingText.slice(0, startIdx);
		const prepMatch = /\b(no\s+later\s+than|due\s+on|due|before|until|till|til|by)\s+$/i.exec(preceding);
		if (prepMatch) {
			const prepLen = prepMatch[0].length;
			startIdx -= prepLen;
			text = workingText.slice(startIdx, startIdx + prepLen + text.length);
		}
		registerMatch("deadline", dateMatch.start.date(), startIdx, text.length, text);
	}
	return {
		title: workingText.replace(/\s+/g, " ").trim(),
		deadline: matchedTokens.find((t) => t.type === "deadline")?.value ?? null,
		startDate: matchedTokens.find((t) => t.type === "startDate")?.value ?? null,
		reminderMinutes: matchedTokens.find((t) => t.type === "reminder")?.value ?? null,
		durationMinutes: matchedTokens.find((t) => t.type === "duration")?.value ?? null,
		recurrence: matchedTokens.find((t) => t.type === "recurrence")?.value ?? null,
		priority: matchedTokens.find((t) => t.type === "priority")?.value ?? null,
		energy: matchedTokens.find((t) => t.type === "energy")?.value ?? null,
		tags: matchedTokens.filter((t) => t.type === "tag").map((t) => t.value),
		planForToday: matchedTokens.some((t) => t.type === "planForToday"),
		matchedTokens
	};
}
//#endregion
//#region src/components/QuickAddModal.jsx
var ENERGY_LABELS = {
	low: "Low energy",
	normal: "Normal energy",
	"deep-focus": "Deep focus"
};
var PRIORITY_LABELS = {
	high: "High priority",
	medium: "Medium priority",
	low: "Low priority"
};
var EXAMPLE_HINTS = [
	"tomorrow 8pm",
	"remind 1h before",
	"for 2h",
	"every weekday",
	"!high",
	"@deep",
	"#tag",
	"plan today",
	"start Monday"
];
function formatMinutes(mins) {
	if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`;
	if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
	return `${mins}m`;
}
function toLocalYMD(date) {
	if (!date) return null;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getValidationWarnings(parsed) {
	const warnings = [];
	if (parsed.reminderMinutes !== null && parsed.deadline) {
		const deadlineMs = deadlineMoment(toDateStr(parsed.deadline)).getTime();
		if (deadlineMs - parsed.reminderMinutes * 60 * 1e3 >= deadlineMs) warnings.push({
			field: "reminder",
			message: "Reminder must be before the deadline."
		});
	}
	if (parsed.reminderMinutes !== null && !parsed.deadline) warnings.push({
		field: "reminder",
		message: "Reminder requires a deadline to calculate from."
	});
	if (parsed.durationMinutes !== null && parsed.durationMinutes <= 0) warnings.push({
		field: "duration",
		message: "Duration must be greater than zero."
	});
	return warnings;
}
function QuickAddModal({ isOpen, onClose, onAddTask, onOpenFullForm, tasks = [] }) {
	const inputRef = useRef(null);
	const [rawInput, setRawInput] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [activeHintIndex, setActiveHintIndex] = useState(-1);
	const parsed = parseNaturalTask(rawInput);
	const warnings = getValidationWarnings(parsed);
	const warningFields = new Set(warnings.map((w) => w.field));
	const suggestions = useMemo(() => {
		const hashMatch = /#(\w*)$/.exec(rawInput);
		if (hashMatch) {
			const partial = hashMatch[1].toLowerCase();
			return collectTags(tasks).filter((t) => t.startsWith(partial) && t !== partial).slice(0, 6).map((t) => ({
				label: `#${t}`,
				replace: hashMatch[0],
				with: `#${t}`
			}));
		}
		return [];
	}, [rawInput, tasks]);
	useEffect(() => {
		setTimeout(() => inputRef.current?.focus(), 80);
	}, []);
	if (!isOpen) return null;
	function applySuggestion(suggestion) {
		const newInput = rawInput.slice(0, rawInput.lastIndexOf(suggestion.replace)) + suggestion.with;
		setRawInput(newInput);
		setActiveHintIndex(-1);
		inputRef.current?.focus();
	}
	function handleRemoveToken(token, event) {
		event.stopPropagation();
		const start = rawInput.indexOf(token.text);
		if (start !== -1) setRawInput(rawInput.slice(0, start) + rawInput.slice(start + token.text.length));
		inputRef.current?.focus();
	}
	function handleEditToken(token) {
		const start = rawInput.indexOf(token.text);
		if (start !== -1 && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.setSelectionRange(start, start + token.text.length);
		}
	}
	function handleKeyDown(event) {
		if (suggestions.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setActiveHintIndex((i) => Math.min(i + 1, suggestions.length - 1));
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setActiveHintIndex((i) => Math.max(i - 1, -1));
				return;
			}
			if ((event.key === "Tab" || event.key === "Enter") && activeHintIndex >= 0) {
				event.preventDefault();
				applySuggestion(suggestions[activeHintIndex]);
				return;
			}
			if (event.key === "Tab" && suggestions.length === 1) {
				event.preventDefault();
				applySuggestion(suggestions[0]);
				return;
			}
		}
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			if (event.shiftKey) {
				onOpenFullForm(parsed);
				onClose();
				return;
			}
			if (!parsed.title.trim()) {
				setSubmitError("Task title cannot be empty.");
				return;
			}
			if (!parsed.deadline) {
				setSubmitError("Please specify a valid deadline (e.g. \"tomorrow\", \"next Friday\").");
				return;
			}
			const todayStr = toDateStr(/* @__PURE__ */ new Date());
			const deadlineStr = toLocalYMD(parsed.deadline);
			if (deadlineStr < todayStr) {
				setSubmitError("Deadline cannot be in the past.");
				return;
			}
			if (warnings.length > 0) {
				setSubmitError(warnings[0].message);
				return;
			}
			const reminderRecord = parsed.reminderMinutes !== null ? [{
				id: `rel:${parsed.reminderMinutes}`,
				kind: "relative",
				minutesBefore: parsed.reminderMinutes
			}] : [];
			const duration = parsed.durationMinutes !== null ? {
				value: parsed.durationMinutes,
				unit: "min"
			} : null;
			onAddTask({
				title: parsed.title,
				deadline: deadlineStr,
				tags: parsed.tags,
				reminders: reminderRecord,
				recurrence: parsed.recurrence,
				notes: "",
				checklist: [],
				links: [],
				attachments: [],
				location: "",
				duration,
				startDate: parsed.startDate ? toLocalYMD(parsed.startDate) : null,
				energyLevel: parsed.energy ?? null,
				status: "active",
				waitingFor: "",
				followUpDate: null,
				plannedDate: parsed.planForToday ? todayStr : null
			});
			onClose();
		}
	}
	const deadlineToken = parsed.matchedTokens.find((t) => t.type === "deadline");
	const startDateToken = parsed.matchedTokens.find((t) => t.type === "startDate");
	const recurrenceToken = parsed.matchedTokens.find((t) => t.type === "recurrence");
	const tagTokens = parsed.matchedTokens.filter((t) => t.type === "tag");
	const priorityToken = parsed.matchedTokens.find((t) => t.type === "priority");
	const energyToken = parsed.matchedTokens.find((t) => t.type === "energy");
	const durationToken = parsed.matchedTokens.find((t) => t.type === "duration");
	const reminderToken = parsed.matchedTokens.find((t) => t.type === "reminder");
	const planTodayToken = parsed.matchedTokens.find((t) => t.type === "planForToday");
	const hasChips = deadlineToken || startDateToken || recurrenceToken || tagTokens.length > 0 || priorityToken || energyToken || durationToken || reminderToken || planTodayToken;
	const todayStr = toDateStr(/* @__PURE__ */ new Date());
	return /* @__PURE__ */ jsxs("div", {
		className: "palette-layer",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Quick Add Task",
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
							id: "quick-add-input",
							type: "text",
							value: rawInput,
							placeholder: "Finish DB assignment tomorrow 8pm for 2h !high @deep #university",
							"aria-label": "Quick add task",
							"aria-autocomplete": "list",
							"aria-controls": suggestions.length > 0 ? "quick-add-suggestions" : void 0,
							onChange: (e) => {
								setRawInput(e.target.value);
								setSubmitError("");
								setActiveHintIndex(-1);
							},
							onKeyDown: handleKeyDown
						}),
						/* @__PURE__ */ jsx("kbd", { children: "Esc" })
					]
				}),
				suggestions.length > 0 && /* @__PURE__ */ jsx("ul", {
					id: "quick-add-suggestions",
					role: "listbox",
					"aria-label": "Tag suggestions",
					className: "quick-add-suggestions",
					children: suggestions.map((s, i) => /* @__PURE__ */ jsx("li", {
						role: "option",
						"aria-selected": i === activeHintIndex,
						className: `quick-add-suggestion${i === activeHintIndex ? " is-active" : ""}`,
						onMouseDown: (e) => {
							e.preventDefault();
							applySuggestion(s);
						},
						children: s.label
					}, s.label))
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "quick-add-body",
					children: [
						hasChips && /* @__PURE__ */ jsxs("div", {
							className: "quick-add-chips-container",
							children: [/* @__PURE__ */ jsx("span", {
								className: "quick-add-chips-label",
								children: "Detected:"
							}), /* @__PURE__ */ jsxs("ul", {
								className: "tag-list quick-add-chips",
								children: [
									deadlineToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-accent quick-add-chip",
										onClick: () => handleEditToken(deadlineToken),
										title: "Click to edit deadline",
										children: [/* @__PURE__ */ jsx("span", { children: formatDate(toLocalYMD(deadlineToken.value)) }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(deadlineToken, e),
											"aria-label": "Remove deadline",
											children: "×"
										})]
									}),
									startDateToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-neutral quick-add-chip",
										onClick: () => handleEditToken(startDateToken),
										title: "Click to edit start date",
										children: [/* @__PURE__ */ jsxs("span", { children: ["Start ", formatDate(toLocalYMD(startDateToken.value))] }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(startDateToken, e),
											"aria-label": "Remove start date",
											children: "×"
										})]
									}),
									recurrenceToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-lavender quick-add-chip",
										onClick: () => handleEditToken(recurrenceToken),
										title: "Click to edit recurrence",
										children: [/* @__PURE__ */ jsx("span", { children: describeRecurrence(recurrenceToken.value) }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(recurrenceToken, e),
											"aria-label": "Remove recurrence",
											children: "×"
										})]
									}),
									reminderToken && /* @__PURE__ */ jsxs("li", {
										className: `tag ${warningFields.has("reminder") ? "tag-warning" : "tag-lavender"} quick-add-chip`,
										onClick: () => handleEditToken(reminderToken),
										title: warningFields.has("reminder") ? warnings.find((w) => w.field === "reminder")?.message : "Click to edit reminder",
										children: [/* @__PURE__ */ jsxs("span", { children: [
											warningFields.has("reminder") ? "⚠ " : "",
											formatMinutes(parsed.reminderMinutes),
											" before"
										] }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(reminderToken, e),
											"aria-label": "Remove reminder",
											children: "×"
										})]
									}),
									durationToken && /* @__PURE__ */ jsxs("li", {
										className: `tag ${warningFields.has("duration") ? "tag-warning" : "tag-neutral"} quick-add-chip`,
										onClick: () => handleEditToken(durationToken),
										title: "Click to edit duration",
										children: [/* @__PURE__ */ jsx("span", { children: formatMinutes(parsed.durationMinutes) }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(durationToken, e),
											"aria-label": "Remove duration",
											children: "×"
										})]
									}),
									priorityToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-accent quick-add-chip",
										onClick: () => handleEditToken(priorityToken),
										title: "Click to edit priority",
										children: [/* @__PURE__ */ jsx("span", { children: PRIORITY_LABELS[parsed.priority] ?? parsed.priority }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(priorityToken, e),
											"aria-label": "Remove priority",
											children: "×"
										})]
									}),
									energyToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-lavender quick-add-chip",
										onClick: () => handleEditToken(energyToken),
										title: "Click to edit energy level",
										children: [/* @__PURE__ */ jsx("span", { children: ENERGY_LABELS[parsed.energy] ?? parsed.energy }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(energyToken, e),
											"aria-label": "Remove energy level",
											children: "×"
										})]
									}),
									planTodayToken && /* @__PURE__ */ jsxs("li", {
										className: "tag tag-accent quick-add-chip",
										onClick: () => handleEditToken(planTodayToken),
										title: "Remove plan-for-today flag",
										children: [/* @__PURE__ */ jsx("span", { children: "Plan today" }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(planTodayToken, e),
											"aria-label": "Remove plan for today",
											children: "×"
										})]
									}),
									tagTokens.map((t, idx) => /* @__PURE__ */ jsxs("li", {
										className: `tag tag-${tagTone(t.value)} quick-add-chip`,
										onClick: () => handleEditToken(t),
										title: "Click to edit tag",
										children: [/* @__PURE__ */ jsxs("span", { children: ["#", t.value] }), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: (e) => handleRemoveToken(t, e),
											"aria-label": `Remove tag ${t.value}`,
											children: "×"
										})]
									}, idx))
								]
							})]
						}),
						warnings.length > 0 && /* @__PURE__ */ jsx("ul", {
							className: "quick-add-warnings",
							children: warnings.map((w, i) => /* @__PURE__ */ jsx("li", {
								className: "quick-add-warning",
								role: "alert",
								children: w.message
							}, i))
						}),
						parsed.deadline && /* @__PURE__ */ jsx("div", {
							className: "quick-add-interpretation",
							children: /* @__PURE__ */ jsxs("span", {
								className: "interpretation-text",
								children: [
									"Deadline:",
									" ",
									/* @__PURE__ */ jsx("strong", { children: new Intl.DateTimeFormat("en-US", {
										weekday: "long",
										month: "long",
										day: "numeric",
										year: "numeric"
									}).format(parsed.deadline) }),
									toLocalYMD(parsed.deadline) === todayStr && /* @__PURE__ */ jsx("span", {
										className: "interp-badge",
										children: "today"
									})
								]
							})
						}),
						submitError && /* @__PURE__ */ jsx("p", {
							className: "field-error quick-add-error",
							role: "alert",
							children: submitError
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "quick-add-hints",
							children: [/* @__PURE__ */ jsx("span", {
								className: "quick-add-syntax",
								children: EXAMPLE_HINTS.map((hint) => /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "quick-add-hint-pill",
									tabIndex: -1,
									onClick: () => {
										const sep = rawInput.length && !rawInput.endsWith(" ") ? " " : "";
										setRawInput(rawInput + sep + hint + " ");
										inputRef.current?.focus();
									},
									children: hint
								}, hint))
							}), /* @__PURE__ */ jsxs("span", { children: [
								/* @__PURE__ */ jsx("strong", { children: "Enter" }),
								" to save · ",
								/* @__PURE__ */ jsx("strong", { children: "Shift+Enter" }),
								" full form ·",
								" ",
								/* @__PURE__ */ jsx("strong", { children: "Esc" }),
								" cancel"
							] })]
						})
					]
				})
			]
		})]
	});
}
//#endregion
//#region src/App.jsx
var DELETE_CONFIRM_KEY = "tidyline:confirm-delete";
var OVERLOAD_HOURS_KEY = "tidyline:overload-hours";
function loadDeleteConfirmation() {
	return localStorage.getItem(DELETE_CONFIRM_KEY) !== "false";
}
function loadOverloadHours() {
	const value = Number(localStorage.getItem(OVERLOAD_HOURS_KEY));
	return Number.isFinite(value) && value >= 1 && value <= 24 ? value : 6;
}
/** The task under the caret or the pointer — what single-key actions act on. */
function activeTaskId() {
	const focused = document.activeElement?.closest?.("[data-task-id]");
	if (focused) return focused.dataset.taskId;
	return document.querySelector("[data-task-id]:hover")?.dataset.taskId ?? null;
}
function App() {
	const taskState = useTasks();
	const appearance = useTheme();
	const auth = useAuth();
	const profile = useProfile(auth.user);
	const bucketConfig = useBucketConfig();
	const templateState = useTemplates();
	const savedFilterState = useSavedFilters();
	const [location, navigate] = useLocation();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isPaletteOpen, setIsPaletteOpen] = useState(false);
	const [askBeforeDelete, setAskBeforeDelete] = useState(loadDeleteConfirmation);
	const [pendingDeleteId, setPendingDeleteId] = useState(null);
	const [taskAdded, setTaskAdded] = useState(null);
	const [overloadHours, setOverloadHours] = useState(loadOverloadHours);
	const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
	const [isShutdownOpen, setIsShutdownOpen] = useState(false);
	const { completeTask, toggleTask, deleteTask } = taskState;
	const createTask = useCallback((taskData) => {
		const task = taskState.addTask(taskData);
		setTaskAdded({
			id: task.id,
			title: task.title
		});
		return task;
	}, [taskState]);
	const dismissTaskAdded = useCallback(() => setTaskAdded(null), []);
	const editAddedTask = useCallback(() => {
		if (!taskAdded) return;
		navigate(`/board?expand=${encodeURIComponent(taskAdded.id)}`);
		setTaskAdded(null);
	}, [navigate, taskAdded]);
	const handleOpenFullForm = useCallback((parsed) => {
		const params = new URLSearchParams();
		params.set("add", "1");
		if (parsed.title) params.set("title", parsed.title);
		if (parsed.deadline) params.set("deadline", toDateStr(parsed.deadline));
		if (parsed.tags && parsed.tags.length > 0) params.set("tags", parsed.tags.join(", "));
		if (parsed.startDate) params.set("startDate", toDateStr(parsed.startDate));
		if (parsed.reminderMinutes) params.set("reminderMinutes", String(parsed.reminderMinutes));
		if (parsed.durationMinutes) params.set("durationMinutes", String(parsed.durationMinutes));
		if (parsed.recurrence) params.set("recurrence", JSON.stringify(parsed.recurrence));
		if (parsed.priority) params.set("priority", parsed.priority);
		if (parsed.energy) params.set("energy", parsed.energy);
		if (parsed.planForToday) params.set("planForToday", "true");
		navigate(`/board?${params.toString()}`);
	}, [navigate]);
	useEffect(() => {
		localStorage.setItem(DELETE_CONFIRM_KEY, String(askBeforeDelete));
	}, [askBeforeDelete]);
	useEffect(() => {
		localStorage.setItem(OVERLOAD_HOURS_KEY, String(overloadHours));
	}, [overloadHours]);
	const requestDelete = useCallback((taskId) => {
		setTaskAdded(null);
		if (askBeforeDelete) {
			setPendingDeleteId(taskId);
			return;
		}
		deleteTask(taskId);
	}, [askBeforeDelete, deleteTask]);
	const cancelDelete = useCallback(() => setPendingDeleteId(null), []);
	const confirmDelete = useCallback((dontAskAgain) => {
		if (!pendingDeleteId) return;
		if (dontAskAgain) setAskBeforeDelete(false);
		deleteTask(pendingDeleteId);
		setPendingDeleteId(null);
	}, [deleteTask, pendingDeleteId]);
	const onNotificationComplete = useCallback((taskId) => completeTask(taskId), [completeTask]);
	useReminderNotifications(taskState.tasks, { onComplete: onNotificationComplete });
	useEffect(() => {
		if (!isDrawerOpen) return;
		function handleKeyDown(event) {
			if (event.key === "Escape") setIsDrawerOpen(false);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDrawerOpen]);
	const focusSearch = useCallback(() => {
		const input = document.querySelector(".toolbar-search input");
		if (input) {
			input.focus();
			return;
		}
		navigate("/board");
		setTimeout(() => document.querySelector(".toolbar-search input")?.focus(), 80);
	}, [navigate]);
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
			id: "home",
			label: "Go to Home",
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
			id: "planner",
			label: "Go to Day planner",
			run: () => navigate("/planner")
		},
		{
			id: "someday",
			label: "Go to Someday / Maybe",
			run: () => navigate("/someday")
		},
		{
			id: "analytics",
			label: "Go to Analytics",
			run: () => navigate("/analytics")
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
		navigate,
		focusSearch,
		appearance
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
			toggleTask(id);
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
		toggleTask,
		requestDelete
	]));
	if (!profile.isSetUp && !auth.isAuthenticated) return /* @__PURE__ */ jsx(WelcomeDialog, {
		onImportTasks: taskState.importTasks,
		onComplete: profile.completeSetup,
		onGoogleSignIn: auth.isConfigured ? auth.signInWithGoogle : void 0
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
				onOpenShutdown: () => {
					setIsDrawerOpen(false);
					setIsShutdownOpen(true);
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
			/* @__PURE__ */ jsx("div", {
				className: "app-content",
				children: /* @__PURE__ */ jsx("div", {
					className: "route-view",
					children: /* @__PURE__ */ jsxs(Switch, { children: [
						/* @__PURE__ */ jsx(Route, {
							path: "/",
							children: /* @__PURE__ */ jsx(HomePage, {
								tasks: taskState.tasks,
								workspaceName: profile.name,
								auth
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/board",
							children: /* @__PURE__ */ jsx(BoardPage, {
								...taskState,
								addTask: createTask,
								deleteTask: requestDelete,
								bucketOrder: bucketConfig.bucketOrder,
								templates: templateState.templates,
								onSaveTemplate: templateState.saveTaskTemplate,
								savedFilters: savedFilterState.savedFilters,
								onSaveFilter: savedFilterState.saveFilter,
								onDeleteFilter: savedFilterState.deleteFilter
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/calendar",
							children: /* @__PURE__ */ jsx(CalendarPage, {
								tasks: taskState.tasks,
								addTask: createTask,
								setDeadline: taskState.setDeadline,
								templates: templateState.templates,
								overloadHours
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/planner",
							children: /* @__PURE__ */ jsx(PlannerPage, {
								tasks: taskState.tasks,
								setScheduledStart: taskState.setScheduledStart,
								updateTask: taskState.updateTask
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/someday",
							children: /* @__PURE__ */ jsx(SomedayPage, {
								...taskState,
								deleteTask: requestDelete
							})
						}),
						/* @__PURE__ */ jsx(Route, {
							path: "/analytics",
							children: /* @__PURE__ */ jsx(AnalyticsPage, {
								tasks: taskState.tasks,
								bucketOrder: bucketConfig.bucketOrder
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
								bucketOrder: bucketConfig.bucketOrder,
								onToggleBucket: bucketConfig.toggleBucket,
								onResetBuckets: bucketConfig.resetBuckets,
								templates: templateState.templates,
								onRenameTemplate: templateState.renameTemplate,
								onDeleteTemplate: templateState.deleteTemplate,
								overloadHours,
								onOverloadHoursChange: setOverloadHours,
								profile,
								auth
							})
						})
					] })
				}, location)
			}),
			isPaletteOpen && /* @__PURE__ */ jsx(CommandPalette, {
				commands,
				onClose: () => setIsPaletteOpen(false)
			}),
			isQuickAddOpen && /* @__PURE__ */ jsx(QuickAddModal, {
				isOpen: isQuickAddOpen,
				onClose: () => setIsQuickAddOpen(false),
				onAddTask: createTask,
				onOpenFullForm: handleOpenFullForm,
				tasks: taskState.tasks
			}),
			pendingDeleteId && /* @__PURE__ */ jsx(DeleteConfirmDialog, {
				taskTitle: taskState.tasks.find((task) => task.id === pendingDeleteId)?.title ?? "This task",
				onCancel: cancelDelete,
				onConfirm: confirmDelete
			}),
			taskAdded && /* @__PURE__ */ jsx(TaskAddedToast, {
				title: taskAdded.title,
				onEdit: editAddedTask,
				onDismiss: dismissTaskAdded
			}, taskAdded.id),
			isShutdownOpen && /* @__PURE__ */ jsx(ShutdownDialog, {
				tasks: taskState.tasks,
				setDeadline: taskState.setDeadline,
				archiveTask: taskState.archiveTask,
				onClose: () => setIsShutdownOpen(false)
			})
		]
	});
}
//#endregion
export { App as default };
