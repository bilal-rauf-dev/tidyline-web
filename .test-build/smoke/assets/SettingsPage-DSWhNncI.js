import { c as ChevronDownIcon } from "./icons-BWrl8Kfc.js";
import { i as getCalibration } from "./calibration-qStEAgJC.js";
import { t as Checkbox } from "./Checkbox-DZRZTY-b.js";
import { i as playChime, n as isSoundEnabled, o as setSoundEnabled } from "./notifications-DxfYIWpl.js";
import { o as parseImportedRoutines } from "./routineIO-BFJIslfv.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from "react";
var REMOVED_PREFERENCE_KEYS = [
	"tidyline:bucket-order",
	"tidyline:task-templates",
	"tidyline:saved-filters",
	"tidyline:overload-hours"
];
function taskEnvelope(tasks) {
	return {
		schemaVersion: 4,
		tasks
	};
}
function migrateTaskData(value) {
	if (Array.isArray(value)) return {
		schemaVersion: 4,
		tasks: value,
		migratedFrom: 1
	};
	if (value && typeof value === "object" && Array.isArray(value.tasks)) {
		if (Number.isInteger(value.schemaVersion) && value.schemaVersion > 4) throw new TypeError(`Unsupported future task schema: ${value.schemaVersion}`);
		return {
			schemaVersion: 4,
			tasks: value.tasks,
			migratedFrom: Number.isInteger(value.schemaVersion) ? value.schemaVersion : null
		};
	}
	throw new TypeError("Expected a TidyLine task array or task envelope");
}
function cleanupLegacyPreferences(storage) {
	REMOVED_PREFERENCE_KEYS.forEach((key) => storage.removeItem(key));
}
function serializeTasks(tasks, routines = null) {
	const envelope = taskEnvelope(tasks);
	if (Array.isArray(routines)) {
		envelope.routines = routines;
		envelope.routineSchemaVersion = 1;
	}
	return JSON.stringify(envelope, null, 2);
}
function parseImportedTasks(json) {
	return migrateTaskData(JSON.parse(json)).tasks.filter((item) => item && typeof item === "object" && typeof item.title === "string");
}
//#endregion
//#region src/hooks/useTheme.js
var THEME_KEY = "tidyline:theme";
var ACCENT_KEY = "tidyline:accent";
var DENSITY_KEY = "tidyline:density";
/**
* The accent is a user-selectable token: exactly one hue plays the accent
* role at a time. Picking a different one swaps that role — it never adds a
* second simultaneous accent. Every option is dark enough for white text.
*/
var ACCENT_OPTIONS = [
	{
		value: "#ff5a36",
		label: "Coral"
	},
	{
		value: "#6d5ae6",
		label: "Violet"
	},
	{
		value: "#0f7d68",
		label: "Teal"
	},
	{
		value: "#a85f07",
		label: "Amber"
	},
	{
		value: "#37507a",
		label: "Indigo"
	}
];
var DENSITY_OPTIONS = [{
	value: "comfortable",
	label: "Comfortable"
}, {
	value: "compact",
	label: "Compact"
}];
function readStored(key, allowed, fallback) {
	const stored = localStorage.getItem(key);
	return allowed.includes(stored) ? stored : fallback;
}
function loadTheme() {
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === "light" || stored === "dark") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function useTheme() {
	const [theme, setTheme] = useState(loadTheme);
	const [accent, setAccentState] = useState(() => readStored(ACCENT_KEY, ACCENT_OPTIONS.map((option) => option.value), ACCENT_OPTIONS[0].value));
	const [density, setDensityState] = useState(() => readStored(DENSITY_KEY, ["comfortable", "compact"], "comfortable"));
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		localStorage.setItem(THEME_KEY, theme);
	}, [theme]);
	useEffect(() => {
		document.documentElement.style.setProperty("--accent", accent);
		localStorage.setItem(ACCENT_KEY, accent);
	}, [accent]);
	useEffect(() => {
		document.documentElement.dataset.density = density;
		localStorage.setItem(DENSITY_KEY, density);
	}, [density]);
	return {
		theme,
		toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
		accent,
		setAccent: setAccentState,
		density,
		setDensity: setDensityState
	};
}
//#endregion
//#region src/pages/SettingsPage.jsx
function SettingsSection({ title, description, initiallyOpen = false, children }) {
	const [isOpen, setIsOpen] = useState(initiallyOpen);
	const contentId = useId();
	return /* @__PURE__ */ jsxs("section", {
		className: isOpen ? "entry-card settings-section expanded" : "entry-card settings-section",
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "settings-section-toggle",
			"aria-expanded": isOpen,
			"aria-controls": contentId,
			onClick: () => setIsOpen((open) => !open),
			children: [/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: title }), description && /* @__PURE__ */ jsx("small", { children: description })] }), /* @__PURE__ */ jsx(ChevronDownIcon, {})]
		}), /* @__PURE__ */ jsx("div", {
			id: contentId,
			className: "settings-section-content",
			hidden: !isOpen,
			children
		})]
	});
}
function SettingsPage({ tasks, appearance, importTasks, clearCompleted, askBeforeDelete, onAskBeforeDeleteChange, profile, routines = [], importRoutines }) {
	const fileInputRef = useRef(null);
	const [soundOn, setSoundOn] = useState(isSoundEnabled);
	const [workspaceName, setWorkspaceName] = useState(profile?.name ?? "");
	const completedCount = tasks.filter((task) => task.done).length;
	const calibration = getCalibration(tasks);
	function exportTasks() {
		const url = URL.createObjectURL(new Blob([serializeTasks(tasks, routines)], { type: "application/json" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "tidyline-tasks.json";
		link.click();
		URL.revokeObjectURL(url);
	}
	function importFile(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const raw = String(reader.result);
				importTasks(parseImportedTasks(raw));
				const importedRoutines = parseImportedRoutines(raw);
				if (importedRoutines && importRoutines) importRoutines(importedRoutines);
			} catch {
				window.alert("That file is not a valid TidyLine export.");
			}
		};
		reader.readAsText(file);
		event.target.value = "";
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell settings-shell",
		children: [
			/* @__PURE__ */ jsx("header", {
				className: "hero",
				children: /* @__PURE__ */ jsx("h1", { children: "Settings" })
			}),
			/* @__PURE__ */ jsx(SettingsSection, {
				title: "Local profile",
				description: "This device only",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row settings-profile-row",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "settings-profile-field",
						children: [/* @__PURE__ */ jsxs("span", { children: ["Workspace name", /* @__PURE__ */ jsx("small", {
							className: "settings-note",
							children: "No account is created."
						})] }), /* @__PURE__ */ jsx("input", {
							maxLength: "48",
							value: workspaceName,
							onChange: (event) => setWorkspaceName(event.target.value),
							"aria-label": "Workspace name"
						})]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: () => profile.setName(workspaceName),
						children: "Save name"
					})]
				})
			}),
			/* @__PURE__ */ jsxs(SettingsSection, {
				title: "Appearance",
				description: "Theme, accent, and density",
				initiallyOpen: true,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "settings-row",
						children: [/* @__PURE__ */ jsx("span", { children: "Theme" }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "secondary",
							onClick: appearance.toggleTheme,
							children: appearance.theme === "dark" ? "Switch to light" : "Switch to dark"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "settings-row",
						children: [/* @__PURE__ */ jsx("span", { children: "Accent colour" }), /* @__PURE__ */ jsx("div", {
							className: "accent-choices",
							role: "group",
							"aria-label": "Accent colour",
							children: ACCENT_OPTIONS.map((option) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: appearance.accent === option.value ? "accent-swatch active" : "accent-swatch",
								style: { background: option.value },
								onClick: () => appearance.setAccent(option.value),
								"aria-pressed": appearance.accent === option.value,
								"aria-label": option.label
							}, option.value))
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "settings-row",
						children: [/* @__PURE__ */ jsx("span", { children: "Density" }), /* @__PURE__ */ jsx("div", {
							className: "segmented",
							role: "group",
							"aria-label": "Density",
							children: DENSITY_OPTIONS.map((option) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: appearance.density === option.value ? "segment active" : "segment",
								onClick: () => appearance.setDensity(option.value),
								children: option.label
							}, option.value))
						})]
					})
				]
			}),
			/* @__PURE__ */ jsx(SettingsSection, {
				title: "Reminders",
				description: "Browser behavior",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Reminder sound", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: "Alerts are checked only while TidyLine is open in a browser tab. Closing it stops reminder delivery."
					})] }), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: () => {
							const next = !soundOn;
							setSoundEnabled(next);
							setSoundOn(next);
							if (next) playChime();
						},
						children: soundOn ? "Mute" : "Unmute"
					})]
				})
			}),
			/* @__PURE__ */ jsx(SettingsSection, {
				title: "Calibration",
				description: "Learned from completed timed tasks",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Personal estimate multiplier", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: calibration.calibrated ? `Your timed tasks usually take about ${calibration.multiplier.toFixed(1)}× your estimate, based on ${calibration.sampleCount} tasks.` : `Time ${3 - calibration.sampleCount} more estimated task${3 - calibration.sampleCount === 1 ? "" : "s"} to calibrate this automatically.`
					})] }), /* @__PURE__ */ jsx("strong", { children: calibration.calibrated ? `${calibration.multiplier.toFixed(1)}×` : "Learning" })]
				})
			}),
			/* @__PURE__ */ jsx(SettingsSection, {
				title: "Task actions",
				description: "Deletion confirmation",
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsx("span", { children: "Ask before deleting tasks" }), /* @__PURE__ */ jsx("label", {
						className: "settings-check",
						children: /* @__PURE__ */ jsx(Checkbox, {
							checked: askBeforeDelete,
							onChange: (event) => onAskBeforeDeleteChange(event.target.checked),
							"aria-label": "Ask before deleting tasks"
						})
					})]
				})
			}),
			/* @__PURE__ */ jsxs(SettingsSection, {
				title: "Your data",
				description: "Import, export, and cleanup",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "settings-row",
						children: [/* @__PURE__ */ jsx("span", { children: "Export workspace" }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "secondary",
							onClick: exportTasks,
							children: "Export JSON"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "settings-row",
						children: [
							/* @__PURE__ */ jsx("span", { children: "Import tasks" }),
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
								onChange: importFile,
								hidden: true
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "settings-row",
						children: [/* @__PURE__ */ jsxs("span", { children: [
							"Clear completed tasks (",
							completedCount,
							")"
						] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "secondary",
							disabled: completedCount === 0,
							onClick: () => {
								if (completedCount && window.confirm(`Remove ${completedCount} completed task(s)?`)) clearCompleted();
							},
							children: "Clear completed"
						})]
					})
				]
			})
		]
	});
}
//#endregion
export { migrateTaskData as a, cleanupLegacyPreferences as i, ACCENT_OPTIONS as n, parseImportedTasks as o, useTheme as r, taskEnvelope as s, SettingsPage as t };
