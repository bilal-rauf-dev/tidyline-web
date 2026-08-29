import { A as TrashIcon, C as PinIcon, D as SearchIcon, S as OpenDetailsIcon, T as RepeatIcon, c as ChevronDownIcon, d as ClockIcon, f as CloseIcon, g as GripIcon, h as EditIcon, i as BellIcon, k as TagIcon, m as CopyIcon, n as ArrowDownIcon, o as CalendarIcon, r as ArrowUpIcon, t as ArchiveIcon, v as LinkIcon, w as PlusIcon, x as NotesIcon, y as MapPinIcon } from "./icons-BWrl8Kfc.js";
import { n as estimateTaskDuration, r as formatMinutes, t as durationToMinutes } from "./calibration-qStEAgJC.js";
import { a as getDeadlineParts, f as toDateStr, r as formatDate, t as daysUntil } from "./dates-DhUD90mg.js";
import { a as deriveStartBy, c as getTaskAttentionDate, l as getTaskTimingLabel, r as parseTags, s as getFitAssessment, t as TagList } from "./TagList-B3Uu9qDt.js";
import { t as Checkbox } from "./Checkbox-DZRZTY-b.js";
import { t as useTimeTick } from "./useFlipReparent-CYDJp-9R.js";
import { t as ensureNotificationPermission } from "./notifications-DxfYIWpl.js";
import { i as DayContext, n as RecurrencePicker, r as SelectMenu, t as TaskForm } from "./TaskForm-BeQtsG2Z.js";
import { c as describeRecurrence, n as buildReminder, r as describeReminder, t as REMINDER_PRESETS } from "./reminders-3dk3K5ia.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { createPortal } from "react-dom";
//#region src/utils/filters.js
var DEFAULT_FILTERS = { query: "" };
function filterTasks(tasks, filters = DEFAULT_FILTERS) {
	const query = String(filters.query ?? "").trim().toLowerCase();
	if (!query) return tasks;
	return tasks.filter((task) => [
		task.title,
		task.notes,
		task.location,
		...task.tags ?? []
	].join(" ").toLowerCase().includes(query));
}
//#endregion
//#region src/utils/buckets.js
var BUCKET_ORDER = [
	"today",
	"week",
	"month",
	"later"
];
var BUCKET_LABELS = {
	today: "Today",
	week: "This Week",
	month: "This Month",
	later: "Later"
};
var BUCKET_END_DAYS = {
	today: 0,
	week: 7,
	month: 30,
	later: Number.POSITIVE_INFINITY
};
var BUCKET_START_DAYS = {
	today: 0,
	week: 1,
	month: 8,
	later: 31
};
function deadlineForBucket(bucketKey, referenceDate = /* @__PURE__ */ new Date()) {
	const offset = BUCKET_START_DAYS[bucketKey] ?? BUCKET_START_DAYS.later;
	const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + offset);
	return toDateStr(date);
}
function getTaskBucket(deadline, referenceDate = /* @__PURE__ */ new Date()) {
	if (!deadline) return "later";
	const distance = daysUntil(deadline, referenceDate);
	if (distance <= 0) return "today";
	if (distance <= BUCKET_END_DAYS.week) return "week";
	if (distance <= BUCKET_END_DAYS.month) return "month";
	return "later";
}
function getTaskBucketForTask(task, tasks, referenceDate = /* @__PURE__ */ new Date()) {
	return getTaskBucket(getTaskAttentionDate(task, tasks, referenceDate) ?? task.deadline, referenceDate);
}
var byDeadline = (a, b) => {
	if (!a.deadline && !b.deadline) return a.createdAt.localeCompare(b.createdAt);
	if (!a.deadline) return 1;
	if (!b.deadline) return -1;
	return a.deadline.localeCompare(b.deadline);
};
function groupTasksByBucket(tasks, referenceDate = /* @__PURE__ */ new Date(), allTasks = tasks) {
	const grouped = Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, []]));
	tasks.forEach((task) => {
		grouped[getTaskBucketForTask(task, allTasks, referenceDate)].push(task);
	});
	BUCKET_ORDER.forEach((bucket) => {
		grouped[bucket].sort((a, b) => {
			if (Boolean(a.pinned) !== Boolean(b.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
			if (a.done !== b.done) return Number(a.done) - Number(b.done);
			const aAttention = getTaskAttentionDate(a, allTasks, referenceDate);
			const bAttention = getTaskAttentionDate(b, allTasks, referenceDate);
			if (aAttention && bAttention && aAttention !== bAttention) return aAttention.localeCompare(bAttention);
			if (aAttention && !bAttention) return -1;
			if (!aAttention && bAttention) return 1;
			return byDeadline(a, b);
		});
	});
	return grouped;
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
			/* @__PURE__ */ jsx("small", {
				className: "reminder-truth",
				children: "Alerts are checked only while TidyLine is open."
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
function LinkRow({ onAdd }) {
	const [label, setLabel] = useState("");
	const [url, setUrl] = useState("");
	function submit() {
		if (!label.trim() || !url.trim()) return;
		onAdd({
			label: label.trim(),
			url: url.trim()
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
				onClick: submit,
				"aria-label": "Add link",
				children: /* @__PURE__ */ jsx(PlusIcon, {})
			})
		]
	});
}
function TaskDetails({ task, allTasks, referenceDate, handlers }) {
	const [checklistDraft, setChecklistDraft] = useState("");
	const expected = estimateTaskDuration(task, allTasks);
	const estimateMinutes = durationToMinutes(task.duration);
	const startBy = deriveStartBy(task, allTasks, referenceDate);
	const fit = getFitAssessment(task, allTasks, referenceDate);
	return /* @__PURE__ */ jsxs("div", {
		className: "task-details-panel",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "detail-block timing-block",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "field-icon-head",
						children: [/* @__PURE__ */ jsx(ClockIcon, {}), "Time"]
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "timing-summary",
						children: [
							estimateMinutes ? `Estimated ${formatMinutes(estimateMinutes)}` : "No estimate yet",
							estimateMinutes && expected.source === "calibrated" ? ` · usually ~${formatMinutes(expected.minutes)}` : "",
							task.actualMinutes ? ` · ${task.done ? "took" : "logged"} ${formatMinutes(task.actualMinutes)}` : ""
						]
					}),
					startBy && /* @__PURE__ */ jsxs("p", {
						className: "timing-summary",
						children: [
							"Start by ",
							formatDate(startBy),
							fit ? ` · ${fit.label}` : ""
						]
					}),
					!task.done && !task.archived && /* @__PURE__ */ jsx("button", {
						type: "button",
						className: task.startedAt ? "secondary timing-button active" : "primary timing-button",
						onClick: () => task.startedAt ? handlers.onPause(task.id) : handlers.onStart(task.id),
						children: task.startedAt ? "Pause" : task.actualMinutes ? "Resume" : "Start"
					})
				]
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
					/* @__PURE__ */ jsx(LinkRow, { onAdd: (link) => handlers.onAddLink(task.id, link) })
				]
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
							max: task.deadline || void 0,
							value: task.resurfaceDate ?? "",
							onChange: (event) => handlers.onUpdate(task.id, { resurfaceDate: event.target.value || null })
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(MapPinIcon, {}), "Location"]
						}), /* @__PURE__ */ jsx("input", {
							value: task.location,
							placeholder: "Room 4, or an address",
							onChange: (event) => handlers.onUpdate(task.id, { location: event.target.value })
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
								value: task.duration?.value ?? "",
								placeholder: "Minutes",
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
								onChange: (unit) => handlers.onUpdate(task.id, { duration: {
									value: task.duration?.value ?? 1,
									unit
								} })
							})]
						})]
					})
				]
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
			})
		]
	});
}
//#endregion
//#region src/components/TaskDetailDialog.jsx
var EXIT_MS = 160;
function TaskDetailDialog({ task, allTasks, referenceDate, handlers, onClose }) {
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
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					id: titleId,
					children: task.title
				}), /* @__PURE__ */ jsx("span", { children: task.deadline ? `Due ${formatDate(task.deadline)}` : "No deadline yet" })] }), /* @__PURE__ */ jsx("button", {
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
				allTasks,
				referenceDate,
				handlers
			})]
		})]
	}), document.body);
}
//#endregion
//#region src/components/TaskCard.jsx
function TaskCard({ task, allTasks = [], referenceDate = /* @__PURE__ */ new Date(), selectionMode, selected, onSelect, onToggle, onStart, onPause, onDelete, onUpdate, onTogglePin, onArchive, onUnarchive, onDuplicate, contextLabel, expandTaskId, ...detailHandlers }) {
	const [isEditing, setIsEditing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(() => expandTaskId === task.id);
	const [title, setTitle] = useState(task.title);
	const [deadline, setDeadline] = useState(task.deadline ?? "");
	const [tags, setTags] = useState((task.tags ?? []).join(", "));
	function startEditing() {
		setTitle(task.title);
		setDeadline(task.deadline ?? "");
		setTags((task.tags ?? []).join(", "));
		setIsEditing(true);
	}
	function saveEdit(event) {
		event.preventDefault();
		if (!title.trim()) return;
		onUpdate(task.id, {
			title: title.trim(),
			deadline: deadline || null,
			tags: parseTags(tags)
		});
		setIsEditing(false);
	}
	const deadlineParts = task.deadline ? getDeadlineParts(task.deadline) : null;
	const estimateMinutes = durationToMinutes(task.duration);
	const expected = task.duration ? estimateTaskDuration(task, allTasks) : null;
	const fit = getFitAssessment(task, allTasks, referenceDate);
	const checklistDone = task.checklist.filter((item) => item.done).length;
	const classNames = ["task"];
	if (task.done) classNames.push("done");
	if (task.pinned) classNames.push("pinned");
	if (selected) classNames.push("selected");
	return /* @__PURE__ */ jsxs("li", {
		className: classNames.join(" "),
		"data-task-id": task.id,
		tabIndex: 0,
		draggable: !selectionMode && !isEditing,
		onDragStart: (event) => {
			event.dataTransfer.setData("text/plain", task.id);
			event.dataTransfer.effectAllowed = "move";
		},
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
					!task.done && !task.archived && /* @__PURE__ */ jsx("button", {
						type: "button",
						className: task.startedAt ? "task-start active" : "task-start",
						onClick: () => task.startedAt ? onPause(task.id) : onStart(task.id),
						"aria-pressed": Boolean(task.startedAt),
						children: task.startedAt ? "Pause" : task.actualMinutes ? "Resume" : "Start"
					}),
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
							className: "input-underline",
							value: title,
							"aria-label": "Task name",
							onChange: (event) => setTitle(event.target.value),
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
							value: deadline,
							onChange: (event) => setDeadline(event.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ jsx(DayContext, {
						mode: "deadline",
						tasks: allTasks,
						value: deadline,
						excludeId: task.id
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "field-icon",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "field-icon-head",
							children: [/* @__PURE__ */ jsx(TagIcon, {}), "Tags"]
						}), /* @__PURE__ */ jsx("input", {
							value: tags,
							placeholder: "design, university",
							onChange: (event) => setTags(event.target.value)
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
				children: [deadlineParts ? /* @__PURE__ */ jsxs("div", {
					className: "deadline-stat",
					children: [/* @__PURE__ */ jsx("strong", { children: deadlineParts.day }), /* @__PURE__ */ jsx("span", { children: deadlineParts.month })]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "deadline-stat",
					children: [/* @__PURE__ */ jsx("strong", { children: "—" }), /* @__PURE__ */ jsx("span", { children: "No date" })]
				}), /* @__PURE__ */ jsxs("div", {
					className: "task-details",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "task-meta",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "countdown",
									children: getTaskTimingLabel(task, allTasks, referenceDate)
								}),
								fit && /* @__PURE__ */ jsx("span", {
									className: `fit-label fit-${fit.level}`,
									children: fit.label
								}),
								contextLabel && /* @__PURE__ */ jsx("span", {
									className: "task-context",
									children: contextLabel
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
								task.links.length > 0 && /* @__PURE__ */ jsx("span", {
									className: "task-flag",
									title: `${task.links.length} link(s)`,
									children: /* @__PURE__ */ jsx(LinkIcon, {})
								}),
								task.checklist.length > 0 && /* @__PURE__ */ jsxs("span", {
									className: "task-flag text",
									children: [
										checklistDone,
										"/",
										task.checklist.length
									]
								}),
								task.duration && /* @__PURE__ */ jsxs("span", {
									className: "task-flag text",
									title: "Estimated and calibrated duration",
									children: [formatMinutes(estimateMinutes), expected.source === "calibrated" ? ` · usually ~${formatMinutes(expected.minutes)}` : ""]
								}),
								task.startedAt && /* @__PURE__ */ jsx("span", {
									className: "task-flag text timing-active",
									children: "In progress"
								}),
								task.resurfaceDate && /* @__PURE__ */ jsxs("span", {
									className: "task-flag text",
									children: ["Back ", formatDate(task.resurfaceDate)]
								}),
								task.done && task.actualMinutes && /* @__PURE__ */ jsxs("span", {
									className: "task-flag text",
									children: ["Took ", formatMinutes(task.actualMinutes)]
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
									title: task.archived ? "Restore" : "Archive",
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
				allTasks,
				referenceDate,
				handlers: {
					...detailHandlers,
					onUpdate,
					onStart,
					onPause
				},
				onClose: () => setIsExpanded(false)
			})
		]
	});
}
//#endregion
//#region src/components/DistanceRail.jsx
function DistanceRail({ bucketKey }) {
	const index = BUCKET_ORDER.indexOf(bucketKey);
	return /* @__PURE__ */ jsx("div", {
		className: "distance-rail",
		style: { "--rail-stages": BUCKET_ORDER.length },
		"aria-hidden": "true",
		children: BUCKET_ORDER.map((key, position) => /* @__PURE__ */ jsx("span", { className: position <= index ? "passed" : void 0 }, key))
	});
}
//#endregion
//#region src/components/BucketColumn.jsx
function BucketColumn({ bucketKey, label, tasks, onMoveTask, collapsed = false, compact = false, onToggleCollapse, selectedIds = [], ...taskHandlers }) {
	const [isOver, setIsOver] = useState(false);
	const isToday = bucketKey === "today";
	const doneCount = tasks.filter((task) => task.done).length;
	const percent = tasks.length === 0 ? 0 : Math.round(doneCount / tasks.length * 100);
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
		"data-bucket-key": bucketKey,
		onDragOver: (event) => {
			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			setIsOver(true);
		},
		onDragLeave: (event) => {
			if (!event.currentTarget.contains(event.relatedTarget)) setIsOver(false);
		},
		onDrop: handleDrop,
		children: [
			/* @__PURE__ */ jsx(DistanceRail, { bucketKey }),
			/* @__PURE__ */ jsxs("div", {
				className: "bucket-header",
				children: [isToday ? /* @__PURE__ */ jsxs("div", {
					className: "bucket-stat",
					children: [/* @__PURE__ */ jsx("strong", { children: tasks.filter((task) => !task.done).length }), /* @__PURE__ */ jsx("span", { children: "need attention" })]
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
				"aria-label": `${label}: ${doneCount} of ${tasks.length} tasks done`,
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
						children: "Nothing here."
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
function BoardToolbar({ query, onChange }) {
	return /* @__PURE__ */ jsx("div", {
		className: "toolbar",
		children: /* @__PURE__ */ jsxs("div", {
			className: "toolbar-search",
			children: [/* @__PURE__ */ jsx(SearchIcon, {}), /* @__PURE__ */ jsx("input", {
				type: "search",
				placeholder: "Search tasks and tags",
				"aria-label": "Search tasks",
				value: query,
				onChange: (event) => onChange(event.target.value)
			})]
		})
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
//#region src/pages/BoardPage.jsx
function BoardPage({ tasks, addTask, moveTaskToBucket, bulkComplete, bulkArchive, bulkDelete, undoState, undo, dismissUndo, ...taskActions }) {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const focusForm = params.get("add") === "1";
	const expandTaskId = params.get("expand");
	const prefilledTitle = params.get("title") || "";
	const prefilledDeadline = params.get("deadline") || "";
	const prefilledTags = params.get("tags") || "";
	const prefilledDetails = (() => {
		const details = {};
		const durationMinutes = params.get("durationMinutes");
		if (durationMinutes) {
			details.durationValue = durationMinutes;
			details.durationUnit = "min";
		}
		const recurrence = params.get("recurrence");
		if (recurrence) try {
			details.recurrence = JSON.parse(recurrence);
		} catch {
			details.recurrence = null;
		}
		return Object.keys(details).length ? details : null;
	})();
	const prefilledReminders = (() => {
		const minutes = Number(params.get("reminderMinutes"));
		return minutes > 0 ? [{
			id: `rel:${minutes}`,
			kind: "relative",
			minutesBefore: minutes
		}] : null;
	})();
	const tick = useTimeTick();
	const now = useMemo(() => new Date(tick), [tick]);
	const [view, setView] = useState(params.get("view") === "archived" ? "archived" : "active");
	const [filters, setFilters] = useState(DEFAULT_FILTERS);
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);
	const [collapsedBuckets, setCollapsedBuckets] = useState([]);
	const visible = useMemo(() => {
		return filterTasks(tasks.filter((task) => view === "archived" ? task.archived : !task.archived), filters);
	}, [
		filters,
		tasks,
		view
	]);
	const buckets = useMemo(() => groupTasksByBucket(visible, now, tasks), [
		now,
		tasks,
		visible
	]);
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
	const taskHandlers = {
		allTasks: tasks,
		referenceDate: now,
		selectionMode,
		onSelect: toggleSelected,
		onToggle: taskActions.toggleTask,
		onStart: taskActions.startTask,
		onPause: taskActions.pauseTask,
		onDelete: taskActions.deleteTask,
		onUpdate: taskActions.updateTask,
		onTogglePin: taskActions.togglePin,
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
		expandTaskId
	};
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell board-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "hero",
				children: [/* @__PURE__ */ jsx("h1", { children: "Board" }), /* @__PURE__ */ jsx("p", {
					className: "hero-copy",
					children: "Four fixed horizons. Deadlines move tasks forward automatically."
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "board-entry-layout",
				children: /* @__PURE__ */ jsx(TaskForm, {
					onAddTask: addTask,
					allTasks: tasks,
					focusOnMount: focusForm,
					initialTitle: prefilledTitle,
					initialDeadline: prefilledDeadline,
					initialTags: prefilledTags,
					initialDetails: prefilledDetails,
					initialReminders: prefilledReminders
				}, `${focusForm}:${prefilledTitle}:${prefilledDeadline}:${prefilledTags}`)
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "board-utility-row",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "board-controls",
					children: [
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: view === "archived" ? "board-view-toggle archived" : "board-view-toggle",
							onClick: () => setView((current) => current === "active" ? "archived" : "active"),
							"aria-label": view === "active" ? "Show archived tasks" : "Show active tasks",
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
				}), /* @__PURE__ */ jsx(BoardToolbar, {
					query: filters.query,
					onChange: (query) => setFilters({ query })
				})]
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
			/* @__PURE__ */ jsx("section", {
				className: "buckets",
				"aria-label": "Task horizons",
				"data-bucket-count": BUCKET_ORDER.length,
				children: BUCKET_ORDER.map((bucket) => /* @__PURE__ */ jsx(BucketColumn, {
					bucketKey: bucket,
					label: BUCKET_LABELS[bucket],
					tasks: buckets[bucket],
					onMoveTask: moveTaskToBucket,
					collapsed: collapsedBuckets.includes(bucket),
					onToggleCollapse: (bucketKey) => setCollapsedBuckets((current) => current.includes(bucketKey) ? current.filter((entry) => entry !== bucketKey) : [...current, bucketKey]),
					selectedIds,
					...taskHandlers
				}, bucket))
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
export { filterTasks as i, deadlineForBucket as n, DEFAULT_FILTERS as r, BoardPage as t };
