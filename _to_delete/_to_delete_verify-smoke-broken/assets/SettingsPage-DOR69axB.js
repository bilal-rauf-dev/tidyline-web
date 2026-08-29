import { _ as GoogleIcon, l as ChevronDownIcon } from "./icons-98MzWrNh.js";
import { t as Checkbox } from "./Checkbox-BFHOKa4z.js";
import { n as BUCKET_ORDER, r as REQUIRED_BUCKETS, t as BUCKET_LABELS } from "./buckets-CeS2d1pg.js";
import { i as playChime, n as isSoundEnabled, o as setSoundEnabled } from "./notifications-DxfYIWpl.js";
import { n as serializeTasks, t as parseImportedTasks } from "./tasksIO-CwNEef1r.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from "react";
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
//#region src/components/BucketConfigMenu.jsx
function BucketConfigMenu({ bucketOrder, onToggleBucket, onReset }) {
	const [isOpen, setIsOpen] = useState(false);
	const rootRef = useRef(null);
	useEffect(() => {
		if (!isOpen) return;
		function handlePointerDown(event) {
			if (!rootRef.current?.contains(event.target)) setIsOpen(false);
		}
		function handleKeyDown(event) {
			if (event.key === "Escape") setIsOpen(false);
		}
		document.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);
	return /* @__PURE__ */ jsxs("div", {
		className: "bucket-config",
		ref: rootRef,
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "select-trigger bucket-config-trigger",
			"aria-expanded": isOpen,
			"aria-controls": "bucket-config-options",
			onClick: () => setIsOpen((open) => !open),
			children: [/* @__PURE__ */ jsxs("span", { children: [bucketOrder.length, " timeline stages"] }), /* @__PURE__ */ jsx(ChevronDownIcon, {})]
		}), /* @__PURE__ */ jsx("div", {
			id: "bucket-config-options",
			className: isOpen ? "bucket-config-panel open" : "bucket-config-panel",
			inert: isOpen ? void 0 : true,
			children: /* @__PURE__ */ jsxs("div", {
				className: "bucket-config-surface",
				children: [/* @__PURE__ */ jsx("div", {
					className: "bucket-config-list",
					role: "group",
					"aria-label": "Visible Board buckets",
					children: BUCKET_ORDER.map((bucket) => {
						const required = REQUIRED_BUCKETS.includes(bucket);
						return /* @__PURE__ */ jsxs("label", {
							className: "bucket-config-option",
							children: [/* @__PURE__ */ jsx(Checkbox, {
								checked: bucketOrder.includes(bucket),
								disabled: required,
								onChange: () => onToggleBucket(bucket)
							}), /* @__PURE__ */ jsxs("span", { children: [BUCKET_LABELS[bucket], required && /* @__PURE__ */ jsx("small", { children: "Required" })] })]
						}, bucket);
					})
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "secondary bucket-config-reset",
					onClick: onReset,
					children: "Show all stages"
				})]
			})
		})]
	});
}
//#endregion
//#region src/components/TemplateSettings.jsx
function TemplateRow({ template, onRename, onDelete }) {
	const [name, setName] = useState(template.name);
	return /* @__PURE__ */ jsxs("li", {
		className: "template-settings-row",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("input", {
				type: "text",
				value: name,
				"aria-label": `Rename ${template.name}`,
				onChange: (event) => setName(event.target.value)
			}), /* @__PURE__ */ jsxs("small", { children: [
				template.checklist.length,
				" checklist items · ",
				template.tags.length,
				" tags"
			] })] }),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "secondary",
				disabled: !name.trim() || name.trim() === template.name,
				onClick: () => onRename(template.id, name),
				children: "Rename"
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "secondary danger",
				onClick: () => onDelete(template.id),
				children: "Delete"
			})
		]
	});
}
function TemplateSettings({ templates, onRename, onDelete }) {
	if (templates.length === 0) return /* @__PURE__ */ jsx("p", {
		className: "empty",
		children: "No templates saved yet."
	});
	return /* @__PURE__ */ jsx("ul", {
		className: "template-settings-list",
		children: templates.map((template) => /* @__PURE__ */ jsx(TemplateRow, {
			template,
			onRename,
			onDelete
		}, template.id))
	});
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
function SettingsPage({ tasks, appearance, importTasks, clearCompleted, askBeforeDelete, onAskBeforeDeleteChange, bucketOrder = BUCKET_ORDER, onToggleBucket = () => {}, onResetBuckets = () => {}, templates = [], onRenameTemplate = () => {}, onDeleteTemplate = () => {}, overloadHours = 6, onOverloadHoursChange = () => {}, profile = null, auth = null }) {
	const fileInputRef = useRef(null);
	const [soundOn, setSoundOn] = useState(isSoundEnabled);
	const [workspaceName, setWorkspaceName] = useState(profile?.name ?? "");
	const completedCount = tasks.filter((task) => task.done).length;
	function handleExport() {
		const blob = new Blob([serializeTasks(tasks)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "tidyline-tasks.json";
		link.click();
		URL.revokeObjectURL(url);
	}
	function handleImportChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				importTasks(parseImportedTasks(String(reader.result)));
			} catch {
				window.alert("That file is not a valid TidyLine export.");
			}
		};
		reader.readAsText(file);
		event.target.value = "";
	}
	function handleClearCompleted() {
		if (completedCount === 0) return;
		if (window.confirm(`Remove ${completedCount} completed task(s)?`)) clearCompleted();
	}
	function toggleSound() {
		const next = !soundOn;
		setSoundEnabled(next);
		setSoundOn(next);
		if (next) playChime();
	}
	async function handleSignOut() {
		await auth.signOut();
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell settings-shell",
		children: [
			/* @__PURE__ */ jsx("header", {
				className: "hero",
				children: /* @__PURE__ */ jsx("h1", { children: "Settings" })
			}),
			profile && /* @__PURE__ */ jsx(SettingsSection, {
				title: "Local profile",
				description: "This device only",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row settings-profile-row",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "settings-profile-field",
						children: [/* @__PURE__ */ jsxs("span", { children: ["Workspace name", /* @__PURE__ */ jsx("small", {
							className: "settings-note",
							children: "Used to distinguish this local TidyLine workspace. No account is created."
						})] }), /* @__PURE__ */ jsx("input", {
							type: "text",
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
			auth && /* @__PURE__ */ jsx(SettingsSection, {
				title: "Account",
				description: auth.isAuthenticated ? "Signed in with Google (Supabase Auth)" : auth.isConfigured ? "Sign in with Google" : "Local mode (no backend configured)",
				initiallyOpen: true,
				children: auth.isAuthenticated ? /* @__PURE__ */ jsxs("div", {
					className: "settings-row settings-account-row",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "settings-account-info",
						children: [/* @__PURE__ */ jsx("div", {
							className: "settings-user-avatar-wrap",
							children: auth.avatarUrl ? /* @__PURE__ */ jsx("img", {
								src: auth.avatarUrl,
								alt: auth.displayName,
								className: "settings-user-avatar",
								referrerPolicy: "no-referrer"
							}) : /* @__PURE__ */ jsx("div", {
								className: "settings-user-avatar-fallback",
								children: auth.displayName.charAt(0).toUpperCase()
							})
						}), /* @__PURE__ */ jsxs("div", {
							className: "settings-user-meta",
							children: [/* @__PURE__ */ jsx("strong", { children: auth.displayName }), /* @__PURE__ */ jsx("small", { children: auth.email })]
						})]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: handleSignOut,
						children: "Sign out"
					})]
				}) : auth.isConfigured ? /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Supabase Authentication", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: "Sign in with your Google account via Supabase Auth."
					})] }), /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "secondary settings-google-btn",
						onClick: auth.signInWithGoogle,
						children: [/* @__PURE__ */ jsx(GoogleIcon, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Sign in with Google" })]
					})]
				}) : /* @__PURE__ */ jsx("div", {
					className: "settings-row",
					children: /* @__PURE__ */ jsxs("span", { children: ["Local mode", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: "No Supabase backend is configured, so tasks stay in this browser. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google sign-in."
					})] })
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
						children: [/* @__PURE__ */ jsxs("span", { children: ["Accent colour", /* @__PURE__ */ jsx("small", {
							className: "settings-note",
							children: "One hue plays the accent role — picking another swaps it."
						})] }), /* @__PURE__ */ jsx("div", {
							className: "accent-choices",
							role: "group",
							"aria-label": "Accent colour",
							children: ACCENT_OPTIONS.map((option) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: appearance.accent === option.value ? "accent-swatch active" : "accent-swatch",
								style: { background: option.value },
								onClick: () => appearance.setAccent(option.value),
								"aria-pressed": appearance.accent === option.value,
								"aria-label": option.label,
								title: option.label
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
				title: "Notifications",
				description: "Reminder preferences",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Reminder sound", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: "Plays a short chime when a reminder fires."
					})] }), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "secondary",
						onClick: toggleSound,
						children: soundOn ? "Mute" : "Unmute"
					})]
				})
			}),
			/* @__PURE__ */ jsx(SettingsSection, {
				title: "Board timeline",
				description: "Visible deadline buckets",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Visible buckets", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: "Today and Later stay visible; Overdue remains automatic and separate."
					})] }), /* @__PURE__ */ jsx(BucketConfigMenu, {
						bucketOrder,
						onToggleBucket,
						onReset: onResetBuckets
					})]
				})
			}),
			/* @__PURE__ */ jsx(SettingsSection, {
				title: "Calendar workload",
				description: "Overload threshold",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Flag overloaded days above", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: "Uses the total of task estimates; tasks without estimates remain visible but add no hours."
					})] }), /* @__PURE__ */ jsxs("label", {
						className: "settings-number",
						children: [/* @__PURE__ */ jsx("input", {
							type: "number",
							min: "1",
							max: "24",
							step: "0.5",
							value: overloadHours,
							onChange: (event) => {
								const value = Number(event.target.value);
								if (value >= 1 && value <= 24) onOverloadHoursChange(value);
							}
						}), "hours"]
					})]
				})
			}),
			/* @__PURE__ */ jsx(SettingsSection, {
				title: "Task actions",
				description: "Deletion confirmation",
				initiallyOpen: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "settings-row",
					children: [/* @__PURE__ */ jsxs("span", { children: ["Ask before deleting tasks", /* @__PURE__ */ jsx("small", {
						className: "settings-note",
						children: "Show a confirmation before a task is permanently removed."
					})] }), /* @__PURE__ */ jsx("label", {
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
				title: "Task templates",
				description: "Reusable task details",
				children: [/* @__PURE__ */ jsx("p", {
					className: "card-note",
					children: "Templates reuse task details while leaving the title and deadline blank."
				}), /* @__PURE__ */ jsx(TemplateSettings, {
					templates,
					onRename: onRenameTemplate,
					onDelete: onDeleteTemplate
				})]
			}),
			/* @__PURE__ */ jsxs(SettingsSection, {
				title: "Your data",
				description: "Import, export, and cleanup",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "settings-row",
						children: [/* @__PURE__ */ jsx("span", { children: "Export tasks" }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "secondary",
							onClick: handleExport,
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
								onChange: handleImportChange,
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
							onClick: handleClearCompleted,
							children: "Clear completed"
						})]
					})
				]
			})
		]
	});
}
//#endregion
export { useTheme as n, SettingsPage as t };
