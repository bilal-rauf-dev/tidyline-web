import { E as SaveIcon, T as RepeatIcon, c as ChevronDownIcon, d as ClockIcon, f as CloseIcon, i as BellIcon, k as TagIcon, o as CalendarIcon, v as LinkIcon, w as PlusIcon, x as NotesIcon, y as MapPinIcon } from "./icons-BWrl8Kfc.js";
import { f as toDateStr, i as formatDateTime, n as deadlineMoment, r as formatDate } from "./dates-DhUD90mg.js";
import { r as parseTags, t as TagList } from "./TagList-B3Uu9qDt.js";
import { t as ensureNotificationPermission } from "./notifications-DxfYIWpl.js";
import { o as RECURRENCE_FREQUENCIES, r as describeReminder, s as WEEKDAY_NAMES } from "./reminders-3dk3K5ia.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
//#region src/utils/dayContext.js
var CLOSE_WINDOW_MINUTES = 120;
function eligible(task, excludeId) {
	return task.id !== excludeId && !task.archived;
}
function reminderDate(task, reminder) {
	if (typeof reminder === "string") return new Date(reminder);
	if (reminder?.kind === "absolute") return new Date(reminder.at);
	if (reminder?.kind === "relative" && task.deadline) return /* @__PURE__ */ new Date(deadlineMoment(task.deadline).getTime() - reminder.minutesBefore * 6e4);
	return /* @__PURE__ */ new Date(NaN);
}
function remindersOn(tasks, dateStr, excludeId) {
	const found = [];
	tasks.forEach((task) => {
		if (!eligible(task, excludeId)) return;
		task.reminders.forEach((reminder) => {
			const at = reminderDate(task, reminder);
			if (!Number.isNaN(at.getTime()) && toDateStr(at) === dateStr) found.push({
				key: `${task.id}:${reminder.id ?? at.toISOString()}`,
				title: task.title,
				at
			});
		});
	});
	return found;
}
/** Tasks already landing on a candidate deadline date. */
function getDeadlineContext(tasks, dateStr, excludeId) {
	if (!dateStr) return {
		deadlines: [],
		reminders: []
	};
	return {
		deadlines: tasks.filter((task) => eligible(task, excludeId) && task.deadline === dateStr),
		reminders: remindersOn(tasks, dateStr, excludeId)
	};
}
/** Reminders within a close time window of a candidate reminder datetime. */
function getReminderContext(tasks, datetimeStr, excludeId, windowMinutes = CLOSE_WINDOW_MINUTES) {
	if (!datetimeStr) return {
		nearby: [],
		deadlines: [],
		windowMinutes
	};
	const target = new Date(datetimeStr);
	if (Number.isNaN(target.getTime())) return {
		nearby: [],
		deadlines: [],
		windowMinutes
	};
	const dateStr = toDateStr(target);
	const nearby = [];
	tasks.forEach((task) => {
		if (!eligible(task, excludeId)) return;
		task.reminders.forEach((reminder) => {
			const at = reminderDate(task, reminder);
			if (Number.isNaN(at.getTime())) return;
			const minutesApart = Math.abs(at.getTime() - target.getTime()) / 6e4;
			if (minutesApart <= windowMinutes) nearby.push({
				key: `${task.id}:${reminder.id ?? at.toISOString()}`,
				title: task.title,
				at,
				minutesApart
			});
		});
	});
	nearby.sort((a, b) => a.minutesApart - b.minutesApart);
	return {
		nearby,
		deadlines: tasks.filter((task) => eligible(task, excludeId) && task.deadline === dateStr),
		windowMinutes
	};
}
//#endregion
//#region src/components/DayContext.jsx
/**
* Panel shown beneath a date/time field once a value is picked, surfacing
* anything already scheduled on that day (or near that time) so a clash is
* visible before committing. Renders nothing when the slot is clear.
*/
function DayContext({ mode, tasks, value, excludeId }) {
	if (!value) return null;
	if (mode === "reminder") {
		const { nearby, deadlines, windowMinutes } = getReminderContext(tasks, value, excludeId);
		if (nearby.length === 0 && deadlines.length === 0) return null;
		return /* @__PURE__ */ jsxs("div", {
			className: "day-context",
			children: [
				/* @__PURE__ */ jsxs("p", {
					className: "day-context-head",
					children: ["Around ", formatDateTime(value)]
				}),
				nearby.length > 0 && /* @__PURE__ */ jsx("ul", { children: nearby.map((entry) => /* @__PURE__ */ jsxs("li", { children: [
					/* @__PURE__ */ jsx("span", {
						className: "reminder-dot",
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ jsx("strong", { children: entry.title }),
					" reminder at ",
					formatDateTime(entry.at)
				] }, entry.key)) }),
				deadlines.length > 0 && /* @__PURE__ */ jsx("ul", { children: deadlines.map((task) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: task.title }), " is due that day"] }, task.id)) }),
				/* @__PURE__ */ jsxs("p", {
					className: "day-context-note",
					children: [
						"Within ",
						windowMinutes / 60,
						"h of your reminder."
					]
				})
			]
		});
	}
	const { deadlines, reminders } = getDeadlineContext(tasks, value, excludeId);
	if (deadlines.length === 0 && reminders.length === 0) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "day-context",
		children: [
			/* @__PURE__ */ jsxs("p", {
				className: "day-context-head",
				children: ["Already on ", formatDate(value)]
			}),
			deadlines.length > 0 && /* @__PURE__ */ jsx("ul", { children: deadlines.map((task) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: task.title }), " is due"] }, task.id)) }),
			reminders.length > 0 && /* @__PURE__ */ jsx("ul", { children: reminders.map((entry) => /* @__PURE__ */ jsxs("li", { children: [
				/* @__PURE__ */ jsx("span", {
					className: "reminder-dot",
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ jsx("strong", { children: entry.title }),
				" reminder at ",
				formatDateTime(entry.at)
			] }, entry.key)) })
		]
	});
}
//#endregion
//#region src/components/SelectMenu.jsx
function SelectMenu({ value, options, onChange, ariaLabel, className = "" }) {
	const [isOpen, setIsOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const rootRef = useRef(null);
	const closeTimerRef = useRef(null);
	const selected = options.find((option) => String(option.value) === String(value)) ?? options[0];
	const closeMenu = useCallback(() => {
		setIsOpen(false);
		window.clearTimeout(closeTimerRef.current);
		closeTimerRef.current = window.setTimeout(() => setIsMounted(false), 160);
	}, []);
	function toggleMenu() {
		if (isOpen) {
			closeMenu();
			return;
		}
		window.clearTimeout(closeTimerRef.current);
		setIsMounted(true);
		setIsOpen(true);
	}
	useEffect(() => {
		if (!isOpen) return;
		function handlePointerDown(event) {
			if (!rootRef.current?.contains(event.target)) closeMenu();
		}
		function handleKeyDown(event) {
			if (event.key === "Escape") closeMenu();
		}
		document.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [closeMenu, isOpen]);
	useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);
	return /* @__PURE__ */ jsxs("div", {
		ref: rootRef,
		className: ["select-menu-control", className].filter(Boolean).join(" "),
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "select-trigger",
			"aria-label": ariaLabel,
			"aria-haspopup": "listbox",
			"aria-expanded": isOpen,
			onClick: toggleMenu,
			children: [/* @__PURE__ */ jsx("span", { children: selected?.label ?? "" }), /* @__PURE__ */ jsx(ChevronDownIcon, {})]
		}), isMounted && /* @__PURE__ */ jsx("div", {
			className: isOpen ? "select-menu open" : "select-menu closing",
			role: "listbox",
			"aria-label": ariaLabel,
			children: options.map((option) => {
				const isSelected = String(option.value) === String(value);
				return /* @__PURE__ */ jsx("button", {
					type: "button",
					role: "option",
					"aria-selected": isSelected,
					className: isSelected ? "select-option selected" : "select-option",
					onClick: () => {
						onChange(option.value);
						closeMenu();
					},
					children: option.label
				}, option.value);
			})
		})]
	});
}
//#endregion
//#region src/components/RecurrencePicker.jsx
function RecurrencePicker({ recurrence, onChange }) {
	const freq = recurrence?.freq ?? "none";
	function setFreq(value) {
		if (value === "none") {
			onChange(null);
			return;
		}
		if (value === "weekly") {
			onChange({
				freq: "weekly",
				weekday: recurrence?.weekday ?? 1
			});
			return;
		}
		if (value === "everyNDays") {
			onChange({
				freq: "everyNDays",
				n: recurrence?.n ?? 2
			});
			return;
		}
		onChange({ freq: value });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "recurrence-picker",
		children: [/* @__PURE__ */ jsxs("span", {
			className: "field-icon-head",
			children: [/* @__PURE__ */ jsx(RepeatIcon, {}), "Repeat"]
		}), /* @__PURE__ */ jsxs("div", {
			className: "recurrence-row",
			children: [
				/* @__PURE__ */ jsx(SelectMenu, {
					value: freq,
					ariaLabel: "Repeat frequency",
					options: [{
						value: "none",
						label: "Does not repeat"
					}, ...RECURRENCE_FREQUENCIES],
					onChange: setFreq
				}),
				freq === "weekly" && /* @__PURE__ */ jsx(SelectMenu, {
					value: recurrence?.weekday ?? 1,
					ariaLabel: "Repeat weekday",
					options: WEEKDAY_NAMES.map((name, index) => ({
						value: index,
						label: name
					})),
					onChange: (value) => onChange({
						freq: "weekly",
						weekday: Number(value)
					})
				}),
				freq === "everyNDays" && /* @__PURE__ */ jsx("input", {
					type: "number",
					min: "1",
					max: "365",
					value: recurrence?.n ?? 2,
					"aria-label": "Repeat every N days",
					onChange: (event) => onChange({
						freq: "everyNDays",
						n: Math.max(1, Number(event.target.value) || 1)
					})
				})
			]
		})]
	});
}
//#endregion
//#region src/components/TaskDraftDetails.jsx
function LinkDraft({ draft, onChange }) {
	const [label, setLabel] = useState("");
	const [url, setUrl] = useState("");
	function add() {
		if (!label.trim() || !url.trim()) return;
		onChange({
			...draft,
			links: [...draft.links, {
				id: crypto.randomUUID(),
				label: label.trim(),
				url: url.trim()
			}]
		});
		setLabel("");
		setUrl("");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "detail-add-row",
		children: [
			/* @__PURE__ */ jsx("input", {
				value: label,
				placeholder: "Link label",
				"aria-label": "Link label",
				onChange: (event) => setLabel(event.target.value)
			}),
			/* @__PURE__ */ jsx("input", {
				type: "url",
				value: url,
				placeholder: "https://…",
				"aria-label": "Link URL",
				onChange: (event) => setUrl(event.target.value)
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "icon-action",
				onClick: add,
				"aria-label": "Add link",
				children: /* @__PURE__ */ jsx(PlusIcon, {})
			})
		]
	});
}
function TaskDraftDetails({ draft, deadline, onChange }) {
	function addChecklistItem() {
		const text = draft.checklistDraft.trim();
		if (!text) return;
		onChange({
			...draft,
			checklist: [...draft.checklist, {
				id: crypto.randomUUID(),
				text,
				done: false
			}],
			checklistDraft: ""
		});
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "task-draft-details",
		children: [
			/* @__PURE__ */ jsxs("label", {
				className: "field-icon",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "field-icon-head",
					children: [/* @__PURE__ */ jsx(NotesIcon, {}), "Notes"]
				}), /* @__PURE__ */ jsx("textarea", {
					rows: "3",
					value: draft.notes,
					placeholder: "Anything worth remembering",
					onChange: (event) => onChange({
						...draft,
						notes: event.target.value
					})
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-block",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "field-icon-head",
						children: "Checklist"
					}),
					draft.checklist.length > 0 && /* @__PURE__ */ jsx("ul", {
						className: "detail-list",
						children: draft.checklist.map((item) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("span", { children: item.text }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-mini",
							onClick: () => onChange({
								...draft,
								checklist: draft.checklist.filter((entry) => entry.id !== item.id)
							}),
							"aria-label": `Remove ${item.text}`,
							children: /* @__PURE__ */ jsx(CloseIcon, {})
						})] }, item.id))
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "detail-add-row draft-single-row",
						children: [/* @__PURE__ */ jsx("input", {
							value: draft.checklistDraft,
							placeholder: "Add a sub-item",
							"aria-label": "New checklist item",
							onChange: (event) => onChange({
								...draft,
								checklistDraft: event.target.value
							}),
							onKeyDown: (event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									addChecklistItem();
								}
							}
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-action",
							onClick: addChecklistItem,
							"aria-label": "Add checklist item",
							children: /* @__PURE__ */ jsx(PlusIcon, {})
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-block",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "field-icon-head",
					children: [/* @__PURE__ */ jsx(LinkIcon, {}), "Links"]
				}), /* @__PURE__ */ jsx(LinkDraft, {
					draft,
					onChange
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-grid",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(CalendarIcon, {}), "Bring back on"]
						}), /* @__PURE__ */ jsx("input", {
							type: "date",
							max: deadline || void 0,
							value: draft.resurfaceDate,
							onChange: (event) => onChange({
								...draft,
								resurfaceDate: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(MapPinIcon, {}), "Location"]
						}), /* @__PURE__ */ jsx("input", {
							value: draft.location,
							placeholder: "Room 4, or an address",
							onChange: (event) => onChange({
								...draft,
								location: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(ClockIcon, {}), "Estimate"]
						}), /* @__PURE__ */ jsxs("div", {
							className: "duration-row",
							children: [/* @__PURE__ */ jsx("input", {
								type: "number",
								min: "1",
								value: draft.durationValue,
								placeholder: "Minutes",
								"aria-label": "Estimated duration",
								onChange: (event) => onChange({
									...draft,
									durationValue: event.target.value
								})
							}), /* @__PURE__ */ jsx(SelectMenu, {
								value: draft.durationUnit,
								ariaLabel: "Duration unit",
								options: [{
									value: "min",
									label: "minutes"
								}, {
									value: "hr",
									label: "hours"
								}],
								onChange: (value) => onChange({
									...draft,
									durationUnit: value
								})
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsx(RecurrencePicker, {
				recurrence: draft.recurrence,
				onChange: (recurrence) => onChange({
					...draft,
					recurrence
				})
			})
		]
	});
}
//#endregion
//#region src/components/TaskForm.jsx
function emptyDetails() {
	return {
		notes: "",
		checklist: [],
		checklistDraft: "",
		links: [],
		location: "",
		durationValue: "",
		durationUnit: "min",
		recurrence: null,
		resurfaceDate: ""
	};
}
function TaskForm({ onAddTask, allTasks = [], initialDeadline = "", heading = "Add task", focusOnMount = false, initialTitle = "", initialTags = "", initialDetails = null, initialReminders = null }) {
	const titleInputRef = useRef(null);
	const [title, setTitle] = useState(initialTitle);
	const [deadline, setDeadline] = useState(initialDeadline);
	const [reminderInput, setReminderInput] = useState("");
	const [reminders, setReminders] = useState(initialReminders || []);
	const [tagInput, setTagInput] = useState(initialTags);
	const [detailsOpen, setDetailsOpen] = useState(Boolean(initialDetails));
	const [details, setDetails] = useState(() => ({
		...emptyDetails(),
		...initialDetails || {}
	}));
	useEffect(() => {
		if (focusOnMount) titleInputRef.current?.focus();
	}, [focusOnMount]);
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const keys = [
			"title",
			"deadline",
			"tags",
			"reminderMinutes",
			"durationMinutes",
			"recurrence"
		];
		let changed = false;
		keys.forEach((key) => {
			if (params.has(key)) {
				params.delete(key);
				changed = true;
			}
		});
		if (changed) {
			const search = params.toString();
			window.history.replaceState(null, "", window.location.pathname + (search ? `?${search}` : ""));
		}
	}, []);
	function addReminder() {
		if (!reminderInput) return;
		if (!reminders.includes(reminderInput)) {
			ensureNotificationPermission();
			setReminders((current) => [...current, reminderInput].sort());
		}
		setReminderInput("");
	}
	function reminderId(reminder) {
		return typeof reminder === "string" ? reminder : reminder.id;
	}
	function reminderLabel(reminder) {
		return typeof reminder === "string" ? formatDateTime(reminder) : describeReminder(reminder, { deadline });
	}
	function handleSubmit(event) {
		event.preventDefault();
		if (!title.trim() || !deadline) return;
		onAddTask({
			title: title.trim(),
			deadline,
			reminders,
			tags: parseTags(tagInput),
			recurrence: details.recurrence,
			resurfaceDate: details.resurfaceDate || null,
			notes: details.notes,
			checklist: details.checklist,
			links: details.links,
			location: details.location,
			duration: details.durationValue === "" ? null : {
				value: Number(details.durationValue),
				unit: details.durationUnit
			}
		});
		setTitle("");
		setDeadline("");
		setReminders([]);
		setReminderInput("");
		setTagInput("");
		setDetailsOpen(false);
		setDetails(emptyDetails());
	}
	const tags = parseTags(tagInput);
	return /* @__PURE__ */ jsxs("section", {
		className: "entry-card task-entry",
		"aria-label": "Add task",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "task-entry-heading",
			children: [/* @__PURE__ */ jsxs("h2", {
				className: "card-heading",
				children: [/* @__PURE__ */ jsx(PlusIcon, {}), heading]
			}), /* @__PURE__ */ jsx("button", {
				type: "button",
				className: detailsOpen ? "icon-mini task-entry-toggle open" : "icon-mini task-entry-toggle",
				onClick: () => setDetailsOpen((open) => !open),
				"aria-expanded": detailsOpen,
				"aria-controls": "task-entry-details",
				"aria-label": detailsOpen ? "Hide additional task details" : "Add notes and details",
				children: /* @__PURE__ */ jsx(ChevronDownIcon, {})
			})]
		}), /* @__PURE__ */ jsxs("form", {
			onSubmit: handleSubmit,
			className: "task-form",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "field-underline",
					children: /* @__PURE__ */ jsx("input", {
						ref: titleInputRef,
						className: "input-underline",
						placeholder: "What needs doing?",
						"aria-label": "Task name",
						value: title,
						onChange: (event) => setTitle(event.target.value),
						required: true
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "field-group",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(CalendarIcon, {}), "Due"]
						}), /* @__PURE__ */ jsx("input", {
							type: "date",
							value: deadline,
							onChange: (event) => setDeadline(event.target.value),
							required: true
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "field-reminder",
						children: [/* @__PURE__ */ jsxs("label", {
							className: "field-icon",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "field-icon-head",
								children: [/* @__PURE__ */ jsx(BellIcon, {}), "Remind"]
							}), /* @__PURE__ */ jsx("input", {
								type: "datetime-local",
								value: reminderInput,
								onChange: (event) => setReminderInput(event.target.value)
							})]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-action",
							onClick: addReminder,
							"aria-label": "Add reminder",
							children: /* @__PURE__ */ jsx(PlusIcon, {})
						})]
					})]
				}),
				/* @__PURE__ */ jsx("small", {
					className: "reminder-truth",
					children: "Alerts are checked only while TidyLine is open."
				}),
				/* @__PURE__ */ jsx(DayContext, {
					mode: "deadline",
					tasks: allTasks,
					value: deadline
				}),
				/* @__PURE__ */ jsx(DayContext, {
					mode: "reminder",
					tasks: allTasks,
					value: reminderInput
				}),
				reminders.length > 0 && /* @__PURE__ */ jsx("ul", {
					className: "reminder-strip",
					"aria-label": "Pending reminders",
					children: reminders.map((reminder) => /* @__PURE__ */ jsxs("li", { children: [
						/* @__PURE__ */ jsx("span", {
							className: "reminder-dot",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ jsx("span", { children: reminderLabel(reminder) }),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-mini",
							onClick: () => setReminders((current) => current.filter((entry) => reminderId(entry) !== reminderId(reminder))),
							"aria-label": `Remove reminder ${reminderLabel(reminder)}`,
							children: /* @__PURE__ */ jsx(CloseIcon, {})
						})
					] }, reminderId(reminder)))
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "field-icon",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(TagIcon, {}), "Tags"]
					}), /* @__PURE__ */ jsx("input", {
						placeholder: "design, university",
						value: tagInput,
						onChange: (event) => setTagInput(event.target.value)
					})]
				}),
				/* @__PURE__ */ jsx(TagList, { tags }),
				/* @__PURE__ */ jsx("div", {
					id: "task-entry-details",
					className: detailsOpen ? "task-entry-details open" : "task-entry-details",
					inert: detailsOpen ? void 0 : true,
					"aria-hidden": !detailsOpen,
					children: /* @__PURE__ */ jsx("div", {
						className: "task-entry-details-inner",
						children: /* @__PURE__ */ jsx(TaskDraftDetails, {
							draft: details,
							deadline,
							onChange: setDetails
						})
					})
				}),
				/* @__PURE__ */ jsx("div", {
					className: "form-footer",
					children: /* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "task-save-action",
						"aria-label": "Save task",
						title: "Save task",
						children: /* @__PURE__ */ jsx(SaveIcon, {})
					})
				})
			]
		})]
	});
}
//#endregion
export { DayContext as i, RecurrencePicker as n, SelectMenu as r, TaskForm as t };
