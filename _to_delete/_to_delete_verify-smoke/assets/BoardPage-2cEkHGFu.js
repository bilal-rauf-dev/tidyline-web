import { D as PinIcon, E as PaperclipIcon, N as TagIcon, O as PlusIcon, P as TrashIcon, S as MapPinIcon, T as OpenDetailsIcon, a as BellIcon, b as LinkIcon, f as ClockIcon, g as EditIcon, h as CopyIcon, i as ArrowUpIcon, j as SearchIcon, k as RepeatIcon, l as ChevronDownIcon, n as ArchiveIcon, p as CloseIcon, r as ArrowDownIcon, s as CalendarIcon, v as GripIcon, w as NotesIcon } from "./icons-98MzWrNh.js";
import { a as getCountdownLabel, o as getDeadlineParts, p as toDateStr, r as formatDate } from "./dates-OcvPtNgq.js";
import { t as Checkbox } from "./Checkbox-BFHOKa4z.js";
import { a as isTaskUpcoming, d as validateStartDate, i as isTaskPlannedForToday, r as getPostponeSummary } from "./taskFields-B8eA_8sb.js";
import { a as groupTasksByBucket, n as BUCKET_ORDER, t as BUCKET_LABELS } from "./buckets-CeS2d1pg.js";
import { n as collectTags, r as parseTags, t as TagList } from "./TagList-QBt6i8xH.js";
import { n as isOverdue, r as overdueSeverity, t as groupOverdue } from "./overdue-B7EOC0S3.js";
import { t as ensureNotificationPermission } from "./notifications-DxfYIWpl.js";
import { a as RecurrencePicker, i as EnergyLevelControl, n as getDeadlineRisk, o as SelectMenu, r as TaskForm, s as DayContext } from "./risk-B_x6pGiR.js";
import { c as describeRecurrence, n as buildReminder, r as describeReminder, t as REMINDER_PRESETS } from "./reminders-Dz29wQZM.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { createPortal } from "react-dom";
//#region src/utils/filters.js
var DEFAULT_FILTERS = {
	query: "",
	tag: "all",
	status: "all",
	energyLevel: "all",
	durationMin: "",
	durationMax: "",
	pinnedOnly: false,
	dateFrom: "",
	dateTo: "",
	sortBy: "deadline",
	sortDir: "asc"
};
var STATUS_OPTIONS = [
	{
		value: "all",
		label: "All"
	},
	{
		value: "active",
		label: "Not done"
	},
	{
		value: "waiting",
		label: "Waiting"
	},
	{
		value: "completed",
		label: "Completed"
	},
	{
		value: "overdue",
		label: "Overdue"
	},
	{
		value: "upcoming",
		label: "Upcoming"
	}
];
var SORT_OPTIONS = [{
	value: "deadline",
	label: "Due date"
}, {
	value: "createdAt",
	label: "Created date"
}];
var ENERGY_FILTER_OPTIONS = [
	{
		value: "all",
		label: "Any energy"
	},
	{
		value: "low",
		label: "Tired-friendly · low"
	},
	{
		value: "normal",
		label: "Normal energy"
	},
	{
		value: "deep-focus",
		label: "Deep focus"
	},
	{
		value: "unset",
		label: "No energy set"
	}
];
function matchesStatus(task, status, todayStr) {
	switch (status) {
		case "active": return !task.done && task.status !== "waiting";
		case "waiting": return !task.done && task.status === "waiting";
		case "completed": return task.done;
		case "overdue": return !task.done && task.status !== "waiting" && task.deadline < todayStr && !(task.startDate && task.startDate > todayStr) && task.plannedDate !== todayStr;
		case "upcoming": return !task.done && Boolean(task.startDate && task.startDate > todayStr);
		default: return true;
	}
}
function filterTasks(tasks, filters) {
	const todayStr = toDateStr(/* @__PURE__ */ new Date());
	const query = filters.query.trim().toLowerCase();
	return tasks.filter((task) => {
		if (!matchesStatus(task, filters.status, todayStr)) return false;
		if (filters.tag !== "all" && !(task.tags ?? []).includes(filters.tag)) return false;
		if (filters.energyLevel !== "all" && (filters.energyLevel === "unset" ? Boolean(task.energyLevel) : task.energyLevel !== filters.energyLevel)) return false;
		if (filters.pinnedOnly && !task.pinned) return false;
		if (filters.dateFrom && task.deadline < filters.dateFrom) return false;
		if (filters.dateTo && task.deadline > filters.dateTo) return false;
		const durationMinutes = task.duration ? task.duration.unit === "hr" ? task.duration.value * 60 : task.duration.value : 0;
		if (filters.durationMin !== "" && durationMinutes < Number(filters.durationMin)) return false;
		if (filters.durationMax !== "" && durationMinutes > Number(filters.durationMax)) return false;
		if (!query) return true;
		return [
			task.title,
			task.waitingFor,
			...task.tags ?? []
		].join(" ").toLowerCase().includes(query);
	});
}
function buildComparator({ sortBy, sortDir }) {
	const direction = sortDir === "desc" ? -1 : 1;
	return (a, b) => {
		const left = sortBy === "createdAt" ? a.createdAt : a.deadline;
		const right = sortBy === "createdAt" ? b.createdAt : b.deadline;
		return left.localeCompare(right) * direction;
	};
}
//#endregion
//#region src/hooks/useFlipReparent.js
var RECHECK_MS = 6e4;
var MODULE_START = Date.now();
/**
* Drives the "living timeline": a periodic tick whose only purpose is to
* re-evaluate bucket assignment as wall-clock time advances. Also ticks when
* the tab regains visibility, so a laptop reopened the next morning
* re-shelves its tasks instead of showing yesterday's layout.
*/
function useTimeTick(intervalMs = RECHECK_MS) {
	const [tick, setTick] = useState(MODULE_START);
	useEffect(() => {
		const id = setInterval(() => setTick(Date.now()), intervalMs);
		function onVisible() {
			if (document.visibilityState === "visible") setTick(Date.now());
		}
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("focus", onVisible);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("focus", onVisible);
		};
	}, [intervalMs]);
	return tick;
}
/**
* FLIP: after a time-driven re-render, any task element that changed position
* is snapped back to where it was and animated to its new home, so a task
* crossing a bucket boundary visibly travels instead of teleporting.
*
* Only armed by `animationKey` changes (the time tick) — manual drags and
* filter changes re-render without animating.
*/
function useFlipReparent(containerRef, animationKey, { duration = 420 } = {}) {
	const previousRects = useRef(/* @__PURE__ */ new Map());
	const armed = useRef(false);
	const firstRun = useRef(true);
	useEffect(() => {
		if (firstRun.current) {
			firstRun.current = false;
			return;
		}
		armed.current = true;
	}, [animationKey]);
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const nodes = container.querySelectorAll("[data-task-id]");
		const nextRects = /* @__PURE__ */ new Map();
		nodes.forEach((node) => {
			nextRects.set(node.dataset.taskId, node.getBoundingClientRect());
		});
		if (armed.current) {
			armed.current = false;
			nextRects.forEach((rect, id) => {
				const previous = previousRects.current.get(id);
				if (!previous) return;
				const dx = previous.left - rect.left;
				const dy = previous.top - rect.top;
				if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
				container.querySelector(`[data-task-id="${CSS.escape(id)}"]`)?.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }], {
					duration,
					easing: "cubic-bezier(0.2, 0, 0, 1)"
				});
			});
		}
		previousRects.current = nextRects;
	});
}
//#endregion
//#region src/components/ReminderPicker.jsx
/**
* Preset-first reminder control. The raw datetime picker survives as the
* "custom" fallback rather than being the only way in.
*/
function ReminderPicker({ reminders, onAdd, onRemove, task }) {
	const [preset, setPreset] = useState(REMINDER_PRESETS[0].id);
	const [customAt, setCustomAt] = useState("");
	function submit() {
		const reminder = buildReminder(preset, { customAt });
		if (!reminder) return;
		ensureNotificationPermission();
		onAdd(reminder);
		setCustomAt("");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "reminder-picker",
		children: [
			/* @__PURE__ */ jsxs("span", {
				className: "field-icon-head",
				children: [/* @__PURE__ */ jsx(BellIcon, {}), "Reminders"]
			}),
			reminders.length > 0 && /* @__PURE__ */ jsx("ul", {
				className: "reminder-strip",
				children: reminders.map((reminder) => /* @__PURE__ */ jsxs("li", { children: [
					/* @__PURE__ */ jsx("span", {
						className: "reminder-dot",
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ jsx("span", { children: describeReminder(reminder, task) }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "icon-mini",
						onClick: () => onRemove(reminder.id),
						"aria-label": `Remove reminder ${describeReminder(reminder, task)}`,
						children: /* @__PURE__ */ jsx(CloseIcon, {})
					})
				] }, reminder.id))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "reminder-picker-row",
				children: [
					/* @__PURE__ */ jsx(SelectMenu, {
						value: preset,
						ariaLabel: "Reminder preset",
						options: [...REMINDER_PRESETS.map((entry) => ({
							value: entry.id,
							label: entry.label
						})), {
							value: "custom",
							label: "Custom date & time…"
						}],
						onChange: setPreset
					}),
					preset === "custom" && /* @__PURE__ */ jsx("input", {
						type: "datetime-local",
						value: customAt,
						"aria-label": "Custom reminder time",
						onChange: (event) => setCustomAt(event.target.value)
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "icon-action",
						onClick: submit,
						"aria-label": "Add reminder",
						title: "Add reminder",
						children: /* @__PURE__ */ jsx(PlusIcon, {})
					})
				]
			})
		]
	});
}
//#endregion
//#region src/utils/maps.js
/**
* Build a plain map-search URL from free text. No geolocation API, no
* coordinates, no permission prompt — it is just a link the user can click.
*/
function mapsSearchUrl(location) {
	return `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`;
}
//#endregion
//#region src/components/TaskDetails.jsx
function UrlRow({ label, placeholder, onAdd }) {
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	function submit() {
		if (!name.trim() || !url.trim()) return;
		onAdd({
			label: name.trim(),
			url: url.trim()
		});
		setName("");
		setUrl("");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "detail-add-row",
		children: [
			/* @__PURE__ */ jsx("input", {
				type: "text",
				value: name,
				placeholder: label,
				"aria-label": label,
				onChange: (event) => setName(event.target.value)
			}),
			/* @__PURE__ */ jsx("input", {
				type: "url",
				value: url,
				placeholder,
				"aria-label": `${label} URL`,
				onChange: (event) => setUrl(event.target.value)
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "icon-action",
				onClick: submit,
				"aria-label": `Add ${label}`,
				children: /* @__PURE__ */ jsx(PlusIcon, {})
			})
		]
	});
}
function TaskDetails({ task, handlers }) {
	const [checklistDraft, setChecklistDraft] = useState("");
	const [startDateDraft, setStartDateDraft] = useState(task.startDate ?? "");
	const [templateName, setTemplateName] = useState("");
	const [templateSaved, setTemplateSaved] = useState(false);
	const startDateError = validateStartDate(startDateDraft, task.deadline);
	const postpone = getPostponeSummary(task);
	return /* @__PURE__ */ jsxs("div", {
		className: "task-details-panel",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "detail-grid detail-foundations",
				children: [/* @__PURE__ */ jsxs("label", {
					className: "field-icon",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(CalendarIcon, {}), "Start date"]
						}),
						/* @__PURE__ */ jsx("input", {
							type: "date",
							value: startDateDraft,
							max: task.deadline,
							onChange: (event) => {
								const value = event.target.value;
								setStartDateDraft(value);
								if (!validateStartDate(value, task.deadline)) handlers.onUpdate(task.id, { startDate: value || null });
							}
						}),
						startDateError && /* @__PURE__ */ jsx("span", {
							className: "field-error",
							children: startDateError
						})
					]
				}), /* @__PURE__ */ jsx(EnergyLevelControl, {
					value: task.energyLevel ?? "",
					onChange: (energyLevel) => handlers.onUpdate(task.id, { energyLevel: energyLevel || null })
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
						className: task.status === "waiting" ? "segment" : "segment active",
						onClick: () => handlers.onUpdate(task.id, {
							status: "active",
							waitingFor: "",
							followUpDate: null
						}),
						children: "Actionable"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: task.status === "waiting" ? "segment active" : "segment",
						onClick: () => handlers.onUpdate(task.id, { status: "waiting" }),
						children: "Waiting"
					})]
				}), task.status === "waiting" && /* @__PURE__ */ jsxs("div", {
					className: "detail-grid waiting-fields",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Waiting for"
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							value: task.waitingFor,
							placeholder: "Name or response",
							onChange: (event) => handlers.onUpdate(task.id, { waitingFor: event.target.value })
						})]
					}), /* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Follow up"
						}), /* @__PURE__ */ jsx("input", {
							type: "date",
							min: toDateStr(/* @__PURE__ */ new Date()),
							value: task.followUpDate ?? "",
							onChange: (event) => handlers.onUpdate(task.id, { followUpDate: event.target.value || null })
						})]
					})]
				})]
			}),
			postpone.count > 0 && /* @__PURE__ */ jsxs("div", {
				className: "postpone-summary",
				children: [/* @__PURE__ */ jsxs("strong", { children: [
					"Postponed ",
					postpone.count,
					" ",
					postpone.count === 1 ? "time" : "times"
				] }), /* @__PURE__ */ jsxs("span", { children: ["Originally due ", formatDate(postpone.originalDeadline)] })]
			}),
			/* @__PURE__ */ jsxs("label", {
				className: "field-icon",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "field-icon-head",
					children: [/* @__PURE__ */ jsx(NotesIcon, {}), "Notes"]
				}), /* @__PURE__ */ jsx("textarea", {
					rows: "3",
					value: task.notes,
					placeholder: "Anything worth remembering",
					onChange: (event) => handlers.onUpdate(task.id, { notes: event.target.value })
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-block",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: ["Checklist", task.checklist.length > 0 && /* @__PURE__ */ jsxs("span", {
							className: "detail-count",
							children: [
								task.checklist.filter((item) => item.done).length,
								"/",
								task.checklist.length
							]
						})]
					}),
					task.checklist.length > 0 && /* @__PURE__ */ jsx("ul", {
						className: "checklist",
						children: task.checklist.map((item, index) => /* @__PURE__ */ jsxs("li", {
							className: item.done ? "done" : void 0,
							children: [
								/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx(Checkbox, {
									checked: item.done,
									onChange: () => handlers.onToggleChecklistItem(task.id, item.id)
								}), /* @__PURE__ */ jsx("span", { children: item.text })] }),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini",
									disabled: index === 0,
									onClick: () => handlers.onMoveChecklistItem(task.id, item.id, -1),
									"aria-label": `Move ${item.text} up`,
									children: /* @__PURE__ */ jsx(ArrowUpIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini",
									disabled: index === task.checklist.length - 1,
									onClick: () => handlers.onMoveChecklistItem(task.id, item.id, 1),
									"aria-label": `Move ${item.text} down`,
									children: /* @__PURE__ */ jsx(ArrowDownIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini",
									onClick: () => handlers.onRemoveChecklistItem(task.id, item.id),
									"aria-label": `Remove ${item.text}`,
									children: /* @__PURE__ */ jsx(CloseIcon, {})
								})
							]
						}, item.id))
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "detail-add-row",
						children: [/* @__PURE__ */ jsx("input", {
							type: "text",
							value: checklistDraft,
							placeholder: "Add a sub-item",
							"aria-label": "New checklist item",
							onChange: (event) => setChecklistDraft(event.target.value),
							onKeyDown: (event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									handlers.onAddChecklistItem(task.id, checklistDraft);
									setChecklistDraft("");
								}
							}
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-action",
							"aria-label": "Add checklist item",
							onClick: () => {
								handlers.onAddChecklistItem(task.id, checklistDraft);
								setChecklistDraft("");
							},
							children: /* @__PURE__ */ jsx(PlusIcon, {})
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-block",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(LinkIcon, {}), "Links"]
					}),
					task.links.length > 0 && /* @__PURE__ */ jsx("ul", {
						className: "detail-list",
						children: task.links.map((link) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("a", {
							href: link.url,
							target: "_blank",
							rel: "noreferrer noopener",
							children: link.label
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-mini",
							onClick: () => handlers.onRemoveLink(task.id, link.id),
							"aria-label": `Remove link ${link.label}`,
							children: /* @__PURE__ */ jsx(CloseIcon, {})
						})] }, link.id))
					}),
					/* @__PURE__ */ jsx(UrlRow, {
						label: "Link label",
						placeholder: "https://…",
						onAdd: (link) => handlers.onAddLink(task.id, link)
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "detail-block",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(PaperclipIcon, {}), "Attachments"]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "detail-note",
						children: "References to files hosted elsewhere — this app has no backend, so nothing is uploaded or stored locally."
					}),
					task.attachments.length > 0 && /* @__PURE__ */ jsx("ul", {
						className: "detail-list",
						children: task.attachments.map((attachment) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("a", {
							href: attachment.url,
							target: "_blank",
							rel: "noreferrer noopener",
							children: attachment.label
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-mini",
							onClick: () => handlers.onRemoveAttachment(task.id, attachment.id),
							"aria-label": `Remove attachment ${attachment.label}`,
							children: /* @__PURE__ */ jsx(CloseIcon, {})
						})] }, attachment.id))
					}),
					/* @__PURE__ */ jsx(UrlRow, {
						label: "File name",
						placeholder: "https://…",
						onAdd: (attachment) => handlers.onAddAttachment(task.id, attachment)
					})
				]
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
						value: task.location,
						placeholder: "Room 4, or an address",
						onChange: (event) => handlers.onUpdate(task.id, { location: event.target.value })
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
							value: task.duration?.value ?? "",
							placeholder: "0",
							"aria-label": "Estimated duration",
							onChange: (event) => {
								const value = event.target.value;
								handlers.onUpdate(task.id, { duration: value === "" ? null : {
									value: Number(value),
									unit: task.duration?.unit ?? "min"
								} });
							}
						}), /* @__PURE__ */ jsx(SelectMenu, {
							value: task.duration?.unit ?? "min",
							ariaLabel: "Duration unit",
							options: [{
								value: "min",
								label: "minutes"
							}, {
								value: "hr",
								label: "hours"
							}],
							onChange: (value) => handlers.onUpdate(task.id, { duration: {
								value: task.duration?.value ?? 0,
								unit: value
							} })
						})]
					})]
				})]
			}),
			task.location && /* @__PURE__ */ jsxs("a", {
				className: "link-button",
				href: mapsSearchUrl(task.location),
				target: "_blank",
				rel: "noreferrer noopener",
				children: [
					"Look up “",
					task.location,
					"” on a map"
				]
			}),
			/* @__PURE__ */ jsx(RecurrencePicker, {
				recurrence: task.recurrence,
				onChange: (recurrence) => handlers.onSetRecurrence(task.id, recurrence)
			}),
			/* @__PURE__ */ jsx(ReminderPicker, {
				task,
				reminders: task.reminders,
				onAdd: (reminder) => handlers.onAddReminder(task.id, reminder),
				onRemove: (reminderId) => handlers.onRemoveReminder(task.id, reminderId)
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "template-save",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Save as template"
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							value: templateName,
							placeholder: "Template name",
							onChange: (event) => {
								setTemplateName(event.target.value);
								setTemplateSaved(false);
							}
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						disabled: !templateName.trim(),
						onClick: () => {
							if (!handlers.onSaveTemplate?.(task, templateName)) return;
							setTemplateName("");
							setTemplateSaved(true);
						},
						children: "Save template"
					}),
					templateSaved && /* @__PURE__ */ jsx("span", {
						className: "template-saved",
						children: "Template saved"
					})
				]
			})
		]
	});
}
//#endregion
//#region src/components/TaskDetailDialog.jsx
var EXIT_MS = 160;
function TaskDetailDialog({ task, handlers, onClose }) {
	const titleId = useId();
	const closeRef = useRef(null);
	const timerRef = useRef(null);
	const closingRef = useRef(false);
	const onCloseRef = useRef(onClose);
	const [isClosing, setIsClosing] = useState(false);
	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);
	const requestClose = useCallback(() => {
		if (closingRef.current) return;
		closingRef.current = true;
		setIsClosing(true);
		timerRef.current = window.setTimeout(() => onCloseRef.current(), EXIT_MS);
	}, []);
	useEffect(() => {
		closeRef.current?.focus();
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		function handleKeyDown(event) {
			if (event.key === "Escape") requestClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.clearTimeout(timerRef.current);
			window.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [requestClose]);
	return createPortal(/* @__PURE__ */ jsxs("div", {
		className: isClosing ? "task-detail-layer closing" : "task-detail-layer",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": titleId,
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "task-detail-scrim",
			"aria-label": "Close task details",
			onClick: requestClose
		}), /* @__PURE__ */ jsxs("article", {
			className: "task-detail-dialog",
			children: [/* @__PURE__ */ jsxs("header", {
				className: "task-detail-heading",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("h2", {
						id: titleId,
						children: task.title
					}),
					/* @__PURE__ */ jsxs("span", { children: ["Due ", formatDate(task.deadline)] }),
					task.startDate && /* @__PURE__ */ jsxs("span", { children: ["Starts ", formatDate(task.startDate)] })
				] }), /* @__PURE__ */ jsx("button", {
					ref: closeRef,
					type: "button",
					className: "icon-mini",
					onClick: requestClose,
					"aria-label": "Close task details",
					title: "Close",
					children: /* @__PURE__ */ jsx(CloseIcon, {})
				})]
			}), /* @__PURE__ */ jsx(TaskDetails, {
				task,
				handlers
			})]
		})]
	}), document.body);
}
//#endregion
//#region src/components/TaskCard.jsx
var ENERGY_LABELS = {
	low: "Low energy",
	normal: "Normal energy",
	"deep-focus": "Deep focus"
};
function TaskCard({ task, allTasks = [], selectionMode = false, selected = false, onSelect, onToggle, onDelete, onUpdate, onTogglePin, onArchive, onUnarchive, onDuplicate, onTogglePlan, contextLabel, expandTaskId, ...detailHandlers }) {
	const taskRef = useRef(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [editTitle, setEditTitle] = useState(task.title);
	const [editDeadline, setEditDeadline] = useState(task.deadline);
	const [editTags, setEditTags] = useState((task.tags ?? []).join(", "));
	useEffect(() => {
		if (expandTaskId !== task.id) return;
		const expandFrame = requestAnimationFrame(() => {
			setIsExpanded(true);
		});
		return () => {
			cancelAnimationFrame(expandFrame);
		};
	}, [expandTaskId, task.id]);
	function startEditing() {
		setEditTitle(task.title);
		setEditDeadline(task.deadline);
		setEditTags((task.tags ?? []).join(", "));
		setIsEditing(true);
	}
	function saveEdit(event) {
		event.preventDefault();
		if (!editTitle.trim() || !editDeadline || validateStartDate(task.startDate, editDeadline)) return;
		onUpdate(task.id, {
			title: editTitle.trim(),
			deadline: editDeadline,
			tags: parseTags(editTags)
		});
		setIsEditing(false);
	}
	function handleDragStart(event) {
		event.dataTransfer.setData("text/plain", task.id);
		event.dataTransfer.effectAllowed = "move";
	}
	const { day, month } = getDeadlineParts(task.deadline);
	const severity = overdueSeverity(task);
	const checklistDone = task.checklist.filter((item) => item.done).length;
	const plannedForToday = isTaskPlannedForToday(task);
	const upcoming = isTaskUpcoming(task);
	const postpone = getPostponeSummary(task);
	const risk = getDeadlineRisk(task, allTasks);
	const classNames = ["task"];
	if (task.done) classNames.push("done");
	if (task.pinned) classNames.push("pinned");
	if (task.status === "waiting") classNames.push("waiting");
	if (selected) classNames.push("selected");
	if (severity > 0) classNames.push(`overdue-${severity}`);
	return /* @__PURE__ */ jsxs("li", {
		ref: taskRef,
		className: classNames.join(" "),
		"data-task-id": task.id,
		draggable: !selectionMode && !isEditing,
		onDragStart: handleDragStart,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "task-top",
				children: [
					selectionMode ? /* @__PURE__ */ jsx("label", {
						className: "task-select",
						children: /* @__PURE__ */ jsx(Checkbox, {
							checked: selected,
							onChange: () => onSelect(task.id),
							"aria-label": `Select ${task.title}`
						})
					}) : /* @__PURE__ */ jsx("span", {
						className: "task-grip",
						"aria-hidden": "true",
						children: /* @__PURE__ */ jsx(GripIcon, {})
					}),
					/* @__PURE__ */ jsx("strong", { children: task.title }),
					/* @__PURE__ */ jsxs("label", {
						className: "task-toggle",
						children: [/* @__PURE__ */ jsx(Checkbox, {
							checked: task.done,
							onChange: () => onToggle(task.id)
						}), "Done"]
					})
				]
			}),
			isEditing ? /* @__PURE__ */ jsxs("form", {
				className: "task-edit-form",
				onSubmit: saveEdit,
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "field-underline",
						children: /* @__PURE__ */ jsx("input", {
							type: "text",
							className: "input-underline",
							value: editTitle,
							"aria-label": "Task name",
							onChange: (event) => setEditTitle(event.target.value),
							required: true
						})
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(CalendarIcon, {}), "Due"]
						}), /* @__PURE__ */ jsx("input", {
							type: "date",
							value: editDeadline,
							min: task.startDate || void 0,
							onChange: (event) => setEditDeadline(event.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ jsx(DayContext, {
						mode: "deadline",
						tasks: allTasks,
						value: editDeadline,
						excludeId: task.id
					}),
					validateStartDate(task.startDate, editDeadline) && /* @__PURE__ */ jsx("p", {
						className: "field-error",
						role: "alert",
						children: "Move the start date on or before the new deadline first."
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(TagIcon, {}), "Tags"]
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							placeholder: "design, urgent",
							value: editTags,
							onChange: (event) => setEditTags(event.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "task-edit-actions",
						children: [/* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "primary",
							children: "Save"
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "secondary",
							onClick: () => setIsEditing(false),
							children: "Cancel"
						})]
					})
				]
			}) : /* @__PURE__ */ jsxs("div", {
				className: "task-body",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "deadline-stat",
					children: [/* @__PURE__ */ jsx("strong", { children: day }), /* @__PURE__ */ jsx("span", { children: month })]
				}), /* @__PURE__ */ jsxs("div", {
					className: "task-details",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "task-meta",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: severity > 0 ? "countdown overdue" : "countdown",
									children: getCountdownLabel(task.deadline)
								}),
								contextLabel && /* @__PURE__ */ jsx("span", {
									className: "task-context",
									children: contextLabel
								}),
								task.status === "waiting" && /* @__PURE__ */ jsxs("span", {
									className: "task-context waiting-label",
									children: [
										"Waiting",
										task.waitingFor ? ` for ${task.waitingFor}` : "",
										task.followUpDate ? ` · follow up ${formatDate(task.followUpDate)}` : ""
									]
								}),
								task.scheduledStart && /* @__PURE__ */ jsxs("span", {
									className: "task-context scheduled-label",
									children: [
										"Scheduled ",
										formatDate(task.scheduledStart.slice(0, 10)),
										" · ",
										task.scheduledStart.slice(11, 16)
									]
								}),
								plannedForToday && /* @__PURE__ */ jsxs("span", {
									className: "task-context planned",
									children: ["Planned today · due ", formatDate(task.deadline)]
								}),
								task.energyLevel && /* @__PURE__ */ jsxs("span", {
									className: `energy-mark energy-${task.energyLevel}`,
									children: [/* @__PURE__ */ jsx("span", {
										className: `energy-dot energy-${task.energyLevel}`,
										"aria-hidden": "true"
									}), ENERGY_LABELS[task.energyLevel]]
								}),
								postpone.count > 0 && /* @__PURE__ */ jsxs("span", {
									className: "task-flag text",
									children: [
										"Postponed ",
										postpone.count,
										"×"
									]
								}),
								risk && /* @__PURE__ */ jsx("span", {
									className: `risk-mark risk-${risk.level}`,
									title: `Computed deadline risk score ${risk.score} of 100`,
									children: risk.label
								}),
								task.recurrence && /* @__PURE__ */ jsx("span", {
									className: "task-flag",
									title: describeRecurrence(task.recurrence),
									children: /* @__PURE__ */ jsx(RepeatIcon, {})
								}),
								task.notes && /* @__PURE__ */ jsx("span", {
									className: "task-flag",
									title: "Has notes",
									children: /* @__PURE__ */ jsx(NotesIcon, {})
								}),
								(task.links.length > 0 || task.attachments.length > 0) && /* @__PURE__ */ jsx("span", {
									className: "task-flag",
									title: `${task.links.length + task.attachments.length} link(s)`,
									children: /* @__PURE__ */ jsx(LinkIcon, {})
								}),
								task.checklist.length > 0 && /* @__PURE__ */ jsxs("span", {
									className: "task-flag text",
									title: "Checklist progress",
									children: [
										checklistDone,
										"/",
										task.checklist.length
									]
								}),
								task.duration && /* @__PURE__ */ jsxs("span", {
									className: "task-flag text",
									title: "Estimated duration",
									children: [task.duration.value, task.duration.unit === "hr" ? "h" : "m"]
								})
							]
						}),
						/* @__PURE__ */ jsx(TagList, { tags: task.tags }),
						/* @__PURE__ */ jsxs("div", {
							className: "task-actions",
							children: [
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: isExpanded ? "icon-mini is-on" : "icon-mini",
									onClick: () => setIsExpanded((value) => !value),
									"aria-expanded": isExpanded,
									"aria-label": isExpanded ? `Close ${task.title} details` : `Open ${task.title} details`,
									title: "Details",
									children: /* @__PURE__ */ jsx(OpenDetailsIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: plannedForToday ? "icon-mini is-on" : "icon-mini",
									onClick: () => onTogglePlan(task.id),
									disabled: upcoming || task.status === "waiting",
									"aria-pressed": plannedForToday,
									"aria-label": plannedForToday ? `Remove ${task.title} from today's plan` : `Plan ${task.title} for today`,
									title: upcoming ? `Available ${formatDate(task.startDate)}` : task.status === "waiting" ? "Waiting tasks are not actionable" : plannedForToday ? "Remove from today" : "Plan for today",
									children: /* @__PURE__ */ jsx(CalendarIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: task.pinned ? "icon-mini is-on" : "icon-mini",
									onClick: () => onTogglePin(task.id),
									"aria-pressed": task.pinned,
									"aria-label": task.pinned ? `Unpin ${task.title}` : `Pin ${task.title}`,
									title: task.pinned ? "Unpin" : "Pin to top",
									children: /* @__PURE__ */ jsx(PinIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini",
									onClick: startEditing,
									"aria-label": `Edit ${task.title}`,
									title: "Edit",
									children: /* @__PURE__ */ jsx(EditIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini",
									onClick: () => onDuplicate(task.id),
									"aria-label": `Duplicate ${task.title}`,
									title: "Duplicate",
									children: /* @__PURE__ */ jsx(CopyIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini",
									onClick: () => task.archived ? onUnarchive(task.id) : onArchive(task.id),
									"aria-label": `${task.archived ? "Restore" : "Archive"} ${task.title}`,
									title: task.archived ? "Restore from archive" : "Archive",
									children: /* @__PURE__ */ jsx(ArchiveIcon, {})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "icon-mini danger",
									onClick: () => onDelete(task.id),
									"aria-label": `Delete ${task.title}`,
									title: "Delete permanently",
									children: /* @__PURE__ */ jsx(TrashIcon, {})
								})
							]
						})
					]
				})]
			}),
			isExpanded && /* @__PURE__ */ jsx(TaskDetailDialog, {
				task,
				handlers: {
					...detailHandlers,
					onUpdate
				},
				onClose: () => setIsExpanded(false)
			})
		]
	});
}
//#endregion
//#region src/components/DistanceRail.jsx
/**
* Positional glyph showing where a bucket sits on the Today → Later scale.
* Seven connected nodes make the ordered stages explicit without resembling
* the percentage bars used elsewhere. Earlier nodes are solid, the current
* node is enlarged and accented, and later nodes stay outlined.
* Reusable primitive — see design.md "Chart primitives".
*/
function DistanceRail({ bucketKey, bucketOrder = BUCKET_ORDER }) {
	const index = bucketOrder.indexOf(bucketKey);
	return /* @__PURE__ */ jsx("div", {
		className: "distance-rail",
		style: { "--rail-stages": bucketOrder.length },
		"aria-hidden": "true",
		children: bucketOrder.map((key, position) => {
			let state = "rail-node";
			if (position === index) state = "rail-node current";
			else if (position < index) state = "rail-node passed";
			return /* @__PURE__ */ jsx("span", { className: state }, key);
		})
	});
}
//#endregion
//#region src/components/BucketColumn.jsx
function BucketColumn({ bucketKey, label, tasks, onMoveTask, collapsed = false, compact = false, onToggleCollapse, selectedIds = [], bucketOrder, ...taskHandlers }) {
	const [isOver, setIsOver] = useState(false);
	const isToday = bucketKey === "today";
	const metricTasks = isToday ? tasks.filter((task) => task.status !== "waiting") : tasks;
	const doneCount = metricTasks.filter((task) => task.done).length;
	const percent = metricTasks.length === 0 ? 0 : Math.round(doneCount / metricTasks.length * 100);
	function handleDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		setIsOver(true);
	}
	function handleDragLeave(event) {
		if (!event.currentTarget.contains(event.relatedTarget)) setIsOver(false);
	}
	function handleDrop(event) {
		event.preventDefault();
		setIsOver(false);
		const id = event.dataTransfer.getData("text/plain");
		if (id) onMoveTask(id, bucketKey);
	}
	const classNames = ["bucket-column", `bucket-${bucketKey}`];
	if (isToday) classNames.push("dark", "bucket-sticky");
	if (isToday && compact) classNames.push("is-compact");
	if (isOver) classNames.push("drop-target");
	if (collapsed) classNames.push("collapsed");
	return /* @__PURE__ */ jsxs("article", {
		className: classNames.join(" "),
		onDragOver: handleDragOver,
		onDragLeave: handleDragLeave,
		onDrop: handleDrop,
		children: [
			/* @__PURE__ */ jsx(DistanceRail, {
				bucketKey,
				bucketOrder
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "bucket-header",
				children: [isToday ? /* @__PURE__ */ jsxs("div", {
					className: "bucket-stat",
					children: [/* @__PURE__ */ jsx("strong", { children: metricTasks.length }), /* @__PURE__ */ jsx("span", { children: "actionable today" })]
				}) : /* @__PURE__ */ jsx("h3", { children: label }), /* @__PURE__ */ jsxs("div", {
					className: "bucket-header-side",
					children: [!isToday && /* @__PURE__ */ jsx("span", {
						className: "count",
						children: tasks.length
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "icon-mini bucket-collapse",
						onClick: () => onToggleCollapse(bucketKey),
						"aria-expanded": !collapsed,
						"aria-label": `${collapsed ? "Expand" : "Collapse"} ${label}`,
						title: collapsed ? "Expand" : "Collapse",
						children: /* @__PURE__ */ jsx(ChevronDownIcon, {})
					})]
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "bucket-progress",
				role: "progressbar",
				"aria-valuenow": percent,
				"aria-valuemin": 0,
				"aria-valuemax": 100,
				"aria-label": `${label}: ${doneCount} of ${metricTasks.length} actionable tasks done`,
				children: /* @__PURE__ */ jsx("div", {
					className: "bucket-progress-fill",
					style: { width: `${percent}%` }
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: collapsed ? "bucket-content collapsed" : "bucket-content",
				inert: collapsed ? true : void 0,
				"aria-hidden": collapsed,
				children: /* @__PURE__ */ jsx("div", {
					className: "bucket-content-inner",
					children: tasks.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "empty",
						children: "No tasks yet."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "task-list",
						children: tasks.map((task) => /* @__PURE__ */ jsx(TaskCard, {
							task,
							selected: selectedIds.includes(task.id),
							...taskHandlers
						}, task.id))
					})
				})
			})
		]
	});
}
//#endregion
//#region src/components/BoardToolbar.jsx
function BoardToolbar({ filters, onChange, tags }) {
	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef(null);
	function set(key, value) {
		onChange({
			...filters,
			[key]: value
		});
	}
	useEffect(() => {
		function closeOnOutsidePress(event) {
			if (!popoverRef.current?.contains(event.target)) setIsOpen(false);
		}
		function closeOnEscape(event) {
			if (event.key === "Escape") setIsOpen(false);
		}
		document.addEventListener("pointerdown", closeOnOutsidePress);
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePress);
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, []);
	return /* @__PURE__ */ jsxs("div", {
		className: "toolbar",
		ref: popoverRef,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "toolbar-search",
				children: [/* @__PURE__ */ jsx(SearchIcon, {}), /* @__PURE__ */ jsx("input", {
					type: "search",
					placeholder: "Search tasks and tags",
					"aria-label": "Search tasks",
					value: filters.query,
					onChange: (event) => set("query", event.target.value)
				})]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: isOpen ? "toolbar-disclosure open" : "toolbar-disclosure",
				"aria-label": "Show task filters",
				"aria-expanded": isOpen,
				onClick: () => setIsOpen((open) => !open),
				title: "Filters",
				children: /* @__PURE__ */ jsx(ChevronDownIcon, {})
			}),
			isOpen && /* @__PURE__ */ jsxs("div", {
				className: "toolbar-filter-popover",
				"aria-label": "Task filters",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(TagIcon, {}), "Tag"]
						}), /* @__PURE__ */ jsx(SelectMenu, {
							value: filters.tag,
							ariaLabel: "Filter by tag",
							options: [{
								value: "all",
								label: "All tags"
							}, ...tags.map((tag) => ({
								value: tag,
								label: tag
							}))],
							onChange: (value) => set("tag", value)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Status"
						}), /* @__PURE__ */ jsx(SelectMenu, {
							value: filters.status,
							ariaLabel: "Filter by status",
							options: STATUS_OPTIONS,
							onChange: (value) => set("status", value)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Energy"
						}), /* @__PURE__ */ jsx(SelectMenu, {
							value: filters.energyLevel,
							ariaLabel: "Filter by energy level",
							options: ENERGY_FILTER_OPTIONS,
							onChange: (value) => set("energyLevel", value)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Sort by"
						}), /* @__PURE__ */ jsx(SelectMenu, {
							value: filters.sortBy,
							ariaLabel: "Sort tasks by",
							options: SORT_OPTIONS,
							onChange: (value) => set("sortBy", value)
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary toolbar-sort-direction",
						onClick: () => set("sortDir", filters.sortDir === "asc" ? "desc" : "asc"),
						children: filters.sortDir === "asc" ? "Ascending" : "Descending"
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Due from"
						}), /* @__PURE__ */ jsx("input", {
							type: "date",
							value: filters.dateFrom,
							onChange: (event) => set("dateFrom", event.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Due through"
						}), /* @__PURE__ */ jsx("input", {
							type: "date",
							value: filters.dateTo,
							onChange: (event) => set("dateTo", event.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Minimum minutes"
						}), /* @__PURE__ */ jsx("input", {
							type: "number",
							min: "0",
							value: filters.durationMin,
							onChange: (event) => set("durationMin", event.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "toolbar-field",
						children: [/* @__PURE__ */ jsx("span", {
							className: "field-icon-head",
							children: "Maximum minutes"
						}), /* @__PURE__ */ jsx("input", {
							type: "number",
							min: "0",
							value: filters.durationMax,
							onChange: (event) => set("durationMax", event.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "toolbar-pinned",
						children: [/* @__PURE__ */ jsx(Checkbox, {
							checked: filters.pinnedOnly,
							onChange: (event) => set("pinnedOnly", event.target.checked)
						}), "Pinned only"]
					})
				]
			})
		]
	});
}
//#endregion
//#region src/components/OverdueSection.jsx
/**
* Overdue work is pulled out of Today into its own section so a missed
* deadline never sits silently beside on-time work. Tiers are ordered worst
* first and gain prominence via border weight + accent intensity only.
*/
function OverdueSection({ groups, selectedIds = [], ...taskHandlers }) {
	if (groups.length === 0) return null;
	const total = groups.reduce((sum, group) => sum + group.tasks.length, 0);
	return /* @__PURE__ */ jsxs("section", {
		className: "overdue-section",
		"aria-label": "Overdue tasks",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "overdue-head",
			children: [/* @__PURE__ */ jsx("h2", { children: "Overdue" }), /* @__PURE__ */ jsx("span", {
				className: "overdue-total",
				children: total
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "overdue-groups",
			children: groups.map((group) => /* @__PURE__ */ jsxs("article", {
				className: `overdue-group severity-${group.severity}`,
				children: [/* @__PURE__ */ jsxs("div", {
					className: "overdue-group-head",
					children: [/* @__PURE__ */ jsx("h3", { children: group.label }), /* @__PURE__ */ jsx("span", { children: group.tasks.length })]
				}), /* @__PURE__ */ jsx("ul", {
					className: "task-list",
					children: group.tasks.map((task) => /* @__PURE__ */ jsx(TaskCard, {
						task,
						selected: selectedIds.includes(task.id),
						...taskHandlers
					}, task.id))
				})]
			}, group.key))
		})]
	});
}
//#endregion
//#region src/components/UndoToast.jsx
function UndoToast({ message, onUndo, onDismiss }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "undo-toast",
		role: "status",
		"aria-live": "polite",
		children: [
			/* @__PURE__ */ jsx("span", { children: message }),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "undo-action",
				onClick: onUndo,
				children: "Undo"
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "icon-mini",
				onClick: onDismiss,
				"aria-label": "Dismiss notification",
				children: /* @__PURE__ */ jsx(CloseIcon, {})
			})
		]
	});
}
//#endregion
//#region src/components/UpcomingSection.jsx
function UpcomingSection({ tasks, selectedIds = [], ...taskHandlers }) {
	if (tasks.length === 0) return null;
	return /* @__PURE__ */ jsxs("section", {
		className: "upcoming-section",
		"aria-label": "Tasks waiting for their start date",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "upcoming-section-head",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", { children: "Upcoming" }), /* @__PURE__ */ jsx("p", { children: "Waiting for their start date" })] }), /* @__PURE__ */ jsx("span", { children: tasks.length })]
		}), /* @__PURE__ */ jsx("ul", {
			className: "task-list upcoming-task-list",
			children: tasks.map((task) => /* @__PURE__ */ jsx(TaskCard, {
				task,
				selected: selectedIds.includes(task.id),
				contextLabel: `Starts ${formatDate(task.startDate)}`,
				...taskHandlers
			}, task.id))
		})]
	});
}
//#endregion
//#region src/components/SavedFilterBar.jsx
function SavedFilterBar({ savedFilters, onApply, onSave, onDelete }) {
	const [name, setName] = useState("");
	const [selectedId, setSelectedId] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef(null);
	const selected = savedFilters.find((entry) => entry.id === selectedId);
	useEffect(() => {
		function closeOnOutsidePress(event) {
			if (!popoverRef.current?.contains(event.target)) setIsOpen(false);
		}
		function closeOnEscape(event) {
			if (event.key === "Escape") setIsOpen(false);
		}
		document.addEventListener("pointerdown", closeOnOutsidePress);
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePress);
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, []);
	function save() {
		const saved = onSave(name);
		if (!saved) return;
		setSelectedId(saved.id);
		setName("");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "saved-filter-bar",
		ref: popoverRef,
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			className: isOpen ? "saved-filter-trigger open" : "saved-filter-trigger",
			"aria-expanded": isOpen,
			onClick: () => setIsOpen((open) => !open),
			children: [/* @__PURE__ */ jsx("span", { children: "Views" }), /* @__PURE__ */ jsx(ChevronDownIcon, {})]
		}), isOpen && /* @__PURE__ */ jsxs("div", {
			className: "saved-filter-popover",
			"aria-label": "Saved views",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "saved-filter-picker",
					children: [/* @__PURE__ */ jsx("span", {
						className: "field-icon-head",
						children: "Saved views"
					}), /* @__PURE__ */ jsx(SelectMenu, {
						value: selectedId,
						ariaLabel: "Choose a saved filter view",
						options: [{
							value: "",
							label: "Choose a view"
						}, ...savedFilters.map((entry) => ({
							value: entry.id,
							label: entry.name
						}))],
						onChange: (id) => {
							setSelectedId(id);
							const entry = savedFilters.find((item) => item.id === id);
							if (entry) onApply(entry.filters);
						}
					})]
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "saved-filter-name",
					children: [/* @__PURE__ */ jsx("span", {
						className: "field-icon-head",
						children: "Save current filters"
					}), /* @__PURE__ */ jsx("input", {
						type: "text",
						value: name,
						placeholder: "Name this view",
						onChange: (event) => setName(event.target.value)
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "saved-filter-actions",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						disabled: !name.trim(),
						onClick: save,
						children: "Save view"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary danger",
						disabled: !selected,
						onClick: () => {
							if (!selected) return;
							onDelete(selected.id);
							setSelectedId("");
						},
						children: "Delete view"
					})]
				})
			]
		})]
	});
}
//#endregion
//#region src/pages/BoardPage.jsx
function BoardPage({ tasks, addTask, moveTaskToBucket, bulkComplete, bulkArchive, bulkDelete, undoState, undo, dismissUndo, bucketOrder = BUCKET_ORDER, templates = [], onSaveTemplate = () => null, savedFilters = [], onSaveFilter = () => null, onDeleteFilter = () => {}, ...taskActions }) {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const focusForm = params.get("add") === "1";
	const expandTaskId = params.get("expand");
	const prefilledTitle = params.get("title") || "";
	const prefilledDeadline = params.get("deadline") || "";
	const prefilledTags = params.get("tags") || "";
	const prefilledDetails = useMemo(() => {
		const localParams = new URLSearchParams(search);
		const details = {};
		const startDate = localParams.get("startDate");
		if (startDate) details.startDate = startDate;
		const durationMinutes = localParams.get("durationMinutes");
		if (durationMinutes) {
			details.durationValue = durationMinutes;
			details.durationUnit = "min";
		}
		const recurrence = localParams.get("recurrence");
		if (recurrence) try {
			details.recurrence = JSON.parse(recurrence);
		} catch (error) {
			console.warn("Invalid recurrence format:", error);
		}
		const energy = localParams.get("energy");
		if (energy) details.energyLevel = energy === "deep" ? "deep-focus" : energy;
		if (localParams.get("planForToday") === "true") details.plannedDate = toDateStr(/* @__PURE__ */ new Date());
		return Object.keys(details).length > 0 ? details : null;
	}, [search]);
	const prefilledReminders = useMemo(() => {
		const minutes = new URLSearchParams(search).get("reminderMinutes");
		if (minutes) return [{
			kind: "relative",
			minutesBefore: Number(minutes)
		}];
		return null;
	}, [search]);
	const boardRef = useRef(null);
	const todayCollapseMarkerRef = useRef(null);
	const todayExpandMarkerRef = useRef(null);
	const todayCompactRef = useRef(false);
	const tick = useTimeTick();
	const now = useMemo(() => new Date(tick), [tick]);
	const [view, setView] = useState(params.get("view") === "archived" ? "archived" : "active");
	const [filters, setFilters] = useState(DEFAULT_FILTERS);
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);
	const [collapsedBuckets, setCollapsedBuckets] = useState([]);
	const [isTodayCompact, setIsTodayCompact] = useState(false);
	useEffect(() => {
		function updateCompact(nextCompact) {
			if (nextCompact === todayCompactRef.current) return;
			todayCompactRef.current = nextCompact;
			setIsTodayCompact(nextCompact);
		}
		const collapseMarker = todayCollapseMarkerRef.current;
		const expandMarker = todayExpandMarkerRef.current;
		if (!collapseMarker || !expandMarker) return;
		if (typeof IntersectionObserver === "undefined") {
			function syncFallback() {
				const collapseTop = collapseMarker.getBoundingClientRect().top;
				const expandTop = expandMarker.getBoundingClientRect().top;
				if (!todayCompactRef.current && collapseTop <= 0) updateCompact(true);
				else if (todayCompactRef.current && expandTop >= 0) updateCompact(false);
			}
			syncFallback();
			window.addEventListener("scroll", syncFallback, { passive: true });
			window.addEventListener("resize", syncFallback);
			return () => {
				window.removeEventListener("scroll", syncFallback);
				window.removeEventListener("resize", syncFallback);
			};
		}
		const collapseObserver = new IntersectionObserver(([entry]) => {
			if (!entry.isIntersecting && entry.boundingClientRect.top < 0) updateCompact(true);
		});
		const expandObserver = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting || entry.boundingClientRect.top >= 0) updateCompact(false);
		});
		collapseObserver.observe(collapseMarker);
		expandObserver.observe(expandMarker);
		return () => {
			collapseObserver.disconnect();
			expandObserver.disconnect();
		};
	}, []);
	const tags = useMemo(() => collectTags(tasks), [tasks]);
	const visible = useMemo(() => {
		return filterTasks(tasks.filter((task) => task.deadline && (view === "archived" ? task.archived : !task.archived)), filters);
	}, [
		tasks,
		view,
		filters
	]);
	const overdueGroups = useMemo(() => view === "archived" ? [] : groupOverdue(visible, now), [
		visible,
		view,
		now
	]);
	const upcomingTasks = useMemo(() => view === "archived" ? [] : visible.filter((task) => isTaskUpcoming(task, now)).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.deadline.localeCompare(b.deadline)), [
		visible,
		view,
		now
	]);
	const bucketed = useMemo(() => visible.filter((task) => view === "archived" || !isTaskUpcoming(task, now) && !isOverdue(task, now)), [
		visible,
		view,
		now
	]);
	const buckets = useMemo(() => groupTasksByBucket(bucketed, now, buildComparator(filters), bucketOrder, { includeUpcoming: view === "archived" }), [
		bucketed,
		filters,
		now,
		bucketOrder,
		view
	]);
	useFlipReparent(boardRef, tick);
	function toggleSelected(id) {
		setSelectedIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
	}
	function exitSelection() {
		setSelectionMode(false);
		setSelectedIds([]);
	}
	function runBulk(action) {
		if (selectedIds.length === 0) return;
		action(selectedIds);
		exitSelection();
	}
	function toggleBucketCollapse(bucketKey) {
		setCollapsedBuckets((current) => current.includes(bucketKey) ? current.filter((entry) => entry !== bucketKey) : [...current, bucketKey]);
	}
	const taskHandlers = {
		allTasks: tasks,
		selectionMode,
		onSelect: toggleSelected,
		onToggle: taskActions.toggleTask,
		onDelete: taskActions.deleteTask,
		onUpdate: taskActions.updateTask,
		onTogglePin: taskActions.togglePin,
		onTogglePlan: taskActions.togglePlanForToday,
		onArchive: taskActions.archiveTask,
		onUnarchive: taskActions.unarchiveTask,
		onDuplicate: taskActions.duplicateTask,
		onSetRecurrence: taskActions.setRecurrence,
		onAddReminder: taskActions.addReminder,
		onRemoveReminder: taskActions.removeReminder,
		onAddChecklistItem: taskActions.addChecklistItem,
		onToggleChecklistItem: taskActions.toggleChecklistItem,
		onRemoveChecklistItem: taskActions.removeChecklistItem,
		onMoveChecklistItem: taskActions.moveChecklistItem,
		onAddLink: taskActions.addLink,
		onRemoveLink: taskActions.removeLink,
		onAddAttachment: taskActions.addAttachment,
		onRemoveAttachment: taskActions.removeAttachment,
		onSaveTemplate,
		expandTaskId
	};
	function moveToVisibleBucket(taskId, bucketKey) {
		moveTaskToBucket(taskId, bucketKey, bucketOrder);
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell board-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "hero",
				children: [/* @__PURE__ */ jsx("h1", { children: "Board" }), /* @__PURE__ */ jsx("p", {
					className: "hero-copy",
					children: "Add a task, set its due date, attach one or more reminders, and it lands automatically in the right time bucket."
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "board-entry-layout",
				children: [/* @__PURE__ */ jsx(TaskForm, {
					onAddTask: addTask,
					allTasks: tasks,
					focusOnMount: focusForm,
					templates,
					initialTitle: prefilledTitle,
					initialDeadline: prefilledDeadline,
					initialTags: prefilledTags,
					initialDetails: prefilledDetails,
					initialReminders: prefilledReminders
				}, `${focusForm}:${prefilledTitle}:${prefilledDeadline}:${prefilledTags}`), /* @__PURE__ */ jsxs(Link, {
					href: "/someday",
					className: "board-someday-prompt",
					"aria-labelledby": "board-someday-prompt-title",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "board-someday-prompt-kicker",
							children: "No deadline yet?"
						}),
						/* @__PURE__ */ jsx("h2", {
							id: "board-someday-prompt-title",
							children: "Give the idea some room."
						}),
						/* @__PURE__ */ jsx("p", { children: "Not sure when to have it done? Keep it in Someday / Maybe until the right date becomes clear." }),
						/* @__PURE__ */ jsx("span", {
							className: "board-someday-arrow",
							"aria-hidden": "true",
							children: "→"
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "board-utility-row",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "board-controls",
						children: [
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: view === "archived" ? "board-view-toggle archived" : "board-view-toggle",
								onClick: () => setView((current) => current === "active" ? "archived" : "active"),
								"aria-label": view === "active" ? "Show archived tasks" : "Show active tasks",
								title: view === "active" ? "Show archived tasks" : "Show active tasks",
								children: [/* @__PURE__ */ jsx(ArchiveIcon, {}), /* @__PURE__ */ jsx("span", { children: view === "active" ? "Active" : "Archived" })]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: selectionMode ? "board-select-toggle active" : "board-select-toggle",
								onClick: () => selectionMode ? exitSelection() : setSelectionMode(true),
								children: selectionMode ? "Done" : "Select"
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "match-count",
								children: [
									visible.length,
									" ",
									visible.length === 1 ? "task" : "tasks"
								]
							})
						]
					}),
					/* @__PURE__ */ jsx(SavedFilterBar, {
						savedFilters,
						onApply: setFilters,
						onSave: (name) => onSaveFilter(name, filters),
						onDelete: onDeleteFilter
					}),
					/* @__PURE__ */ jsx(BoardToolbar, {
						filters,
						onChange: setFilters,
						tags
					})
				]
			}),
			selectionMode && /* @__PURE__ */ jsxs("div", {
				className: "bulk-bar",
				role: "group",
				"aria-label": "Bulk actions",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "bulk-count",
						children: [selectedIds.length, " selected"]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: () => runBulk(bulkComplete),
						children: "Complete"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: () => runBulk(bulkArchive),
						children: "Archive"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary danger",
						onClick: () => runBulk(bulkDelete),
						children: "Delete"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				ref: boardRef,
				children: [
					/* @__PURE__ */ jsx(UpcomingSection, {
						tasks: upcomingTasks,
						selectedIds,
						...taskHandlers
					}),
					/* @__PURE__ */ jsx(OverdueSection, {
						groups: overdueGroups,
						selectedIds,
						...taskHandlers
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "today-sticky-sentinel",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ jsx("span", {
							ref: todayExpandMarkerRef,
							className: "today-expand-marker"
						}), /* @__PURE__ */ jsx("span", {
							ref: todayCollapseMarkerRef,
							className: "today-collapse-marker"
						})]
					}),
					/* @__PURE__ */ jsx("section", {
						className: "buckets",
						"aria-label": "Task buckets",
						"data-bucket-count": bucketOrder.length,
						children: bucketOrder.map((bucket) => /* @__PURE__ */ jsx(BucketColumn, {
							bucketKey: bucket,
							label: BUCKET_LABELS[bucket],
							tasks: buckets[bucket],
							onMoveTask: moveToVisibleBucket,
							bucketOrder,
							collapsed: collapsedBuckets.includes(bucket),
							onToggleCollapse: toggleBucketCollapse,
							compact: bucket === "today" && isTodayCompact,
							selectedIds,
							...taskHandlers
						}, bucket))
					})
				]
			}),
			undoState && /* @__PURE__ */ jsx(UndoToast, {
				message: undoState.message,
				onUndo: undo,
				onDismiss: dismissUndo
			})
		]
	});
}
//#endregion
export { DEFAULT_FILTERS as n, filterTasks as r, BoardPage as t };
