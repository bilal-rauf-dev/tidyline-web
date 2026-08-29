import { A as SaveIcon, E as PaperclipIcon, N as TagIcon, O as PlusIcon, S as MapPinIcon, a as BellIcon, b as LinkIcon, f as ClockIcon, k as RepeatIcon, l as ChevronDownIcon, n as ArchiveIcon, p as CloseIcon, s as CalendarIcon, w as NotesIcon } from "./icons-98MzWrNh.js";
import { i as formatDateTime, p as toDateStr, r as formatDate, t as daysUntil } from "./dates-OcvPtNgq.js";
import { d as validateStartDate, t as ENERGY_LEVEL_OPTIONS } from "./taskFields-B8eA_8sb.js";
import { r as parseTags, t as TagList } from "./TagList-QBt6i8xH.js";
import { t as ensureNotificationPermission } from "./notifications-DxfYIWpl.js";
import { o as RECURRENCE_FREQUENCIES, r as describeReminder, s as WEEKDAY_NAMES } from "./reminders-Dz29wQZM.js";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
//#region src/utils/dayContext.js
var CLOSE_WINDOW_MINUTES = 120;
function eligible(task, excludeId) {
	return task.id !== excludeId && !task.archived;
}
function remindersOn(tasks, dateStr, excludeId) {
	const found = [];
	tasks.forEach((task) => {
		if (!eligible(task, excludeId)) return;
		task.reminders.forEach((reminder) => {
			const at = new Date(reminder);
			if (!Number.isNaN(at.getTime()) && toDateStr(at) === dateStr) found.push({
				key: `${task.id}:${reminder}`,
				title: task.title,
				reminder
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
			const at = new Date(reminder);
			if (Number.isNaN(at.getTime())) return;
			const minutesApart = Math.abs(at.getTime() - target.getTime()) / 6e4;
			if (minutesApart <= windowMinutes) nearby.push({
				key: `${task.id}:${reminder}`,
				title: task.title,
				reminder,
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
					formatDateTime(entry.reminder)
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
				formatDateTime(entry.reminder)
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
//#region src/components/EnergyLevelControl.jsx
function EnergyLevelControl({ value = "", onChange, label = "Energy" }) {
	return /* @__PURE__ */ jsxs("fieldset", {
		className: "energy-control",
		children: [/* @__PURE__ */ jsx("legend", { children: label }), /* @__PURE__ */ jsx("div", {
			className: "energy-options",
			children: ENERGY_LEVEL_OPTIONS.map((option) => /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: value === option.value ? "energy-option active" : "energy-option",
				"aria-pressed": value === option.value,
				onClick: () => onChange(option.value),
				children: [option.value && /* @__PURE__ */ jsx("span", {
					className: `energy-dot energy-${option.value}`,
					"aria-hidden": "true"
				}), option.label]
			}, option.value || "unset"))
		})]
	});
}
//#endregion
//#region src/components/TaskDraftDetails.jsx
function addNamedUrl(draft, onChange, type) {
	const labelKey = type === "links" ? "linkLabel" : "attachmentLabel";
	const urlKey = type === "links" ? "linkUrl" : "attachmentUrl";
	const label = draft[labelKey].trim();
	const url = draft[urlKey].trim();
	if (!label || !url) return;
	onChange({
		...draft,
		[type]: [...draft[type], {
			id: crypto.randomUUID(),
			label,
			url
		}],
		[labelKey]: "",
		[urlKey]: ""
	});
}
function UrlDraft({ draft, onChange, type, label, urlLabel }) {
	const labelKey = type === "links" ? "linkLabel" : "attachmentLabel";
	const urlKey = type === "links" ? "linkUrl" : "attachmentUrl";
	return /* @__PURE__ */ jsxs(Fragment, { children: [draft[type].length > 0 && /* @__PURE__ */ jsx("ul", {
		className: "detail-list",
		children: draft[type].map((entry) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("span", { children: entry.label }), /* @__PURE__ */ jsx("button", {
			type: "button",
			className: "icon-mini",
			onClick: () => onChange({
				...draft,
				[type]: draft[type].filter((item) => item.id !== entry.id)
			}),
			"aria-label": `Remove ${entry.label}`,
			children: /* @__PURE__ */ jsx(CloseIcon, {})
		})] }, entry.id))
	}), /* @__PURE__ */ jsxs("div", {
		className: "detail-add-row",
		children: [
			/* @__PURE__ */ jsx("input", {
				type: "text",
				value: draft[labelKey],
				placeholder: label,
				"aria-label": label,
				onChange: (event) => onChange({
					...draft,
					[labelKey]: event.target.value
				})
			}),
			/* @__PURE__ */ jsx("input", {
				type: "url",
				value: draft[urlKey],
				placeholder: "https://…",
				"aria-label": urlLabel,
				onChange: (event) => onChange({
					...draft,
					[urlKey]: event.target.value
				})
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "icon-action",
				onClick: () => addNamedUrl(draft, onChange, type),
				"aria-label": `Add ${label.toLowerCase()}`,
				children: /* @__PURE__ */ jsx(PlusIcon, {})
			})
		]
	})] });
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
			/* @__PURE__ */ jsxs("div", {
				className: "detail-grid detail-foundations",
				children: [/* @__PURE__ */ jsxs("label", {
					className: "field-icon",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(CalendarIcon, {}), "Start date"]
					}), /* @__PURE__ */ jsx("input", {
						type: "date",
						value: draft.startDate,
						max: deadline || void 0,
						onChange: (event) => onChange({
							...draft,
							startDate: event.target.value
						})
					})]
				}), /* @__PURE__ */ jsx(EnergyLevelControl, {
					value: draft.energyLevel,
					onChange: (energyLevel) => onChange({
						...draft,
						energyLevel
					})
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "waiting-control",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "segmented",
					role: "group",
					"aria-label": "Task status",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: draft.status === "active" ? "segment active" : "segment",
						onClick: () => onChange({
							...draft,
							status: "active",
							waitingFor: "",
							followUpDate: ""
						}),
						children: "Actionable"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: draft.status === "waiting" ? "segment active" : "segment",
						onClick: () => onChange({
							...draft,
							status: "waiting"
						}),
						children: "Waiting"
					})]
				}), draft.status === "waiting" && /* @__PURE__ */ jsxs("div", {
					className: "detail-grid waiting-fields",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Waiting for"
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							value: draft.waitingFor,
							placeholder: "Name or response",
							onChange: (event) => onChange({
								...draft,
								waitingFor: event.target.value
							})
						})]
					}), /* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Follow up"
						}), /* @__PURE__ */ jsx("input", {
							type: "date",
							min: toDateStr(/* @__PURE__ */ new Date()),
							value: draft.followUpDate,
							onChange: (event) => onChange({
								...draft,
								followUpDate: event.target.value
							})
						})]
					})]
				})]
			}),
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
							type: "text",
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
				}), /* @__PURE__ */ jsx(UrlDraft, {
					draft,
					onChange,
					type: "links",
					label: "Link label",
					urlLabel: "Link URL"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-block",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "field-icon-head",
					children: [/* @__PURE__ */ jsx(PaperclipIcon, {}), "Attachments"]
				}), /* @__PURE__ */ jsx(UrlDraft, {
					draft,
					onChange,
					type: "attachments",
					label: "File name",
					urlLabel: "Attachment URL"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-grid",
				children: [/* @__PURE__ */ jsxs("label", {
					className: "field-icon",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(MapPinIcon, {}), "Location"]
					}), /* @__PURE__ */ jsx("input", {
						type: "text",
						value: draft.location,
						placeholder: "Room 4, or an address",
						onChange: (event) => onChange({
							...draft,
							location: event.target.value
						})
					})]
				}), /* @__PURE__ */ jsxs("label", {
					className: "field-icon",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(ClockIcon, {}), "Estimate"]
					}), /* @__PURE__ */ jsxs("div", {
						className: "duration-row",
						children: [/* @__PURE__ */ jsx("input", {
							type: "number",
							min: "0",
							value: draft.durationValue,
							placeholder: "0",
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
				})]
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
function createEmptyDetails() {
	return {
		notes: "",
		checklist: [],
		checklistDraft: "",
		links: [],
		linkLabel: "",
		linkUrl: "",
		attachments: [],
		attachmentLabel: "",
		attachmentUrl: "",
		location: "",
		durationValue: "",
		durationUnit: "min",
		recurrence: null,
		startDate: "",
		energyLevel: "",
		status: "active",
		waitingFor: "",
		followUpDate: ""
	};
}
function TaskForm({ onAddTask, allTasks = [], initialDeadline = "", heading = "Add task", focusOnMount = false, templates = [], initialTitle = "", initialTags = "", initialDetails = null, initialReminders = null }) {
	const titleInputRef = useRef(null);
	const [title, setTitle] = useState(initialTitle);
	const [deadline, setDeadline] = useState(initialDeadline);
	const [reminderInput, setReminderInput] = useState("");
	const [remindersDraft, setRemindersDraft] = useState(initialReminders || []);
	const [tagInput, setTagInput] = useState(initialTags);
	const [detailsOpen, setDetailsOpen] = useState(Boolean(initialDetails));
	const [details, setDetails] = useState(() => ({
		...createEmptyDetails(),
		...initialDetails || {}
	}));
	const [selectedTemplateId, setSelectedTemplateId] = useState("");
	useEffect(() => {
		if (focusOnMount) titleInputRef.current?.focus();
	}, [focusOnMount]);
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		let changed = false;
		[
			"title",
			"deadline",
			"tags",
			"startDate",
			"reminderMinutes",
			"durationMinutes",
			"recurrence",
			"priority",
			"energy",
			"planForToday"
		].forEach((key) => {
			if (params.has(key)) {
				params.delete(key);
				changed = true;
			}
		});
		if (changed) {
			const newSearch = params.toString();
			const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
			window.history.replaceState(null, "", newUrl);
		}
	}, []);
	function addReminder() {
		if (!reminderInput) return;
		if (remindersDraft.includes(reminderInput)) {
			setReminderInput("");
			return;
		}
		ensureNotificationPermission();
		setRemindersDraft((current) => [...current, reminderInput].sort());
		setReminderInput("");
	}
	function reminderIdentity(reminder) {
		return typeof reminder === "string" ? reminder : reminder.id;
	}
	function reminderDescription(reminder) {
		return typeof reminder === "string" ? formatDateTime(reminder) : describeReminder(reminder, { deadline });
	}
	function removeReminder(reminder) {
		const identity = reminderIdentity(reminder);
		setRemindersDraft((current) => current.filter((entry) => reminderIdentity(entry) !== identity));
	}
	function applyTemplate(id) {
		setSelectedTemplateId(id);
		const template = templates.find((entry) => entry.id === id);
		if (!template) return;
		setTagInput(template.tags.join(", "));
		setRemindersDraft(template.reminders.map((reminder) => typeof reminder === "string" ? reminder : { ...reminder }));
		setDetails((current) => ({
			...current,
			notes: template.notes,
			checklist: template.checklist.map((item) => ({
				id: crypto.randomUUID(),
				text: item.text,
				done: false
			})),
			durationValue: template.duration?.value ?? "",
			durationUnit: template.duration?.unit ?? "min",
			recurrence: template.recurrence
		}));
		setDetailsOpen(true);
	}
	function handleSubmit(event) {
		event.preventDefault();
		const destination = event.nativeEvent.submitter?.value ?? "active";
		if (!title.trim() || !deadline || validateStartDate(details.startDate, deadline) || details.status === "waiting" && (!details.waitingFor.trim() || !details.followUpDate)) return;
		onAddTask({
			title: title.trim(),
			deadline,
			reminders: remindersDraft,
			tags: parseTags(tagInput),
			recurrence: details.recurrence,
			notes: details.notes,
			checklist: details.checklist,
			links: details.links,
			attachments: details.attachments,
			location: details.location,
			duration: details.durationValue === "" ? null : {
				value: Number(details.durationValue),
				unit: details.durationUnit
			},
			startDate: details.startDate || null,
			energyLevel: details.energyLevel || null,
			status: details.status,
			archived: destination === "archive",
			waitingFor: details.status === "waiting" ? details.waitingFor.trim() : "",
			followUpDate: details.status === "waiting" ? details.followUpDate : null
		});
		setTitle("");
		setDeadline("");
		setRemindersDraft([]);
		setReminderInput("");
		setTagInput("");
		setDetailsOpen(false);
		setDetails(createEmptyDetails());
		setSelectedTemplateId("");
	}
	const draftTags = parseTags(tagInput);
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
				title: detailsOpen ? "Hide details" : "Add notes and details",
				children: /* @__PURE__ */ jsx(ChevronDownIcon, {})
			})]
		}), /* @__PURE__ */ jsxs("form", {
			onSubmit: handleSubmit,
			className: "task-form",
			children: [
				templates.length > 0 && /* @__PURE__ */ jsxs("label", {
					className: "template-picker",
					children: [/* @__PURE__ */ jsx("span", {
						className: "field-icon-head",
						children: "Start from template"
					}), /* @__PURE__ */ jsx(SelectMenu, {
						value: selectedTemplateId,
						ariaLabel: "Start task from template",
						options: [{
							value: "",
							label: "Blank task"
						}, ...templates.map((template) => ({
							value: template.id,
							label: template.name
						}))],
						onChange: applyTemplate
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "field-underline",
					children: /* @__PURE__ */ jsx("input", {
						ref: titleInputRef,
						type: "text",
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
							title: "Add reminder",
							children: /* @__PURE__ */ jsx(PlusIcon, {})
						})]
					})]
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
				remindersDraft.length > 0 && /* @__PURE__ */ jsx("ul", {
					className: "reminder-strip",
					"aria-label": "Pending reminders",
					children: remindersDraft.map((reminder) => /* @__PURE__ */ jsxs("li", { children: [
						/* @__PURE__ */ jsx("span", {
							className: "reminder-dot",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ jsx("span", { children: reminderDescription(reminder) }),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-mini",
							onClick: () => removeReminder(reminder),
							"aria-label": `Remove reminder ${reminderDescription(reminder)}`,
							children: /* @__PURE__ */ jsx(CloseIcon, {})
						})
					] }, reminderIdentity(reminder)))
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "field-icon",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(TagIcon, {}), "Tags"]
					}), /* @__PURE__ */ jsx("input", {
						type: "text",
						placeholder: "design, urgent",
						value: tagInput,
						onChange: (event) => setTagInput(event.target.value)
					})]
				}),
				/* @__PURE__ */ jsx(TagList, { tags: draftTags }),
				/* @__PURE__ */ jsx("div", {
					id: "task-entry-details",
					className: detailsOpen ? "task-entry-details open" : "task-entry-details",
					inert: detailsOpen ? void 0 : true,
					"aria-hidden": !detailsOpen,
					children: /* @__PURE__ */ jsxs("div", {
						className: "task-entry-details-inner",
						children: [
							/* @__PURE__ */ jsx(TaskDraftDetails, {
								draft: details,
								deadline,
								onChange: setDetails
							}),
							validateStartDate(details.startDate, deadline) && /* @__PURE__ */ jsx("p", {
								className: "field-error",
								role: "alert",
								children: validateStartDate(details.startDate, deadline)
							}),
							details.status === "waiting" && (!details.waitingFor.trim() || !details.followUpDate) && /* @__PURE__ */ jsx("p", {
								className: "field-error",
								role: "alert",
								children: "Add who or what you are waiting for and a follow-up date."
							})
						]
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "form-footer",
					children: [/* @__PURE__ */ jsxs("button", {
						type: "submit",
						value: "archive",
						className: "task-archive-action",
						children: [/* @__PURE__ */ jsx(ArchiveIcon, {}), "Add to archive"]
					}), /* @__PURE__ */ jsx("button", {
						type: "submit",
						value: "active",
						className: "task-save-action",
						"aria-label": "Save task",
						title: "Save task",
						children: /* @__PURE__ */ jsx(SaveIcon, {})
					})]
				})
			]
		})]
	});
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
//#endregion
export { RecurrencePicker as a, EnergyLevelControl as i, getDeadlineRisk as n, SelectMenu as o, TaskForm as r, DayContext as s, durationToMinutes as t };
