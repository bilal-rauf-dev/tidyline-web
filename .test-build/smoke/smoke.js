import { jsx } from "react/jsx-runtime";
//#region scripts/smoke.jsx
function makeStorage() {
	const map = /* @__PURE__ */ new Map();
	return {
		getItem: (key) => map.has(key) ? map.get(key) : null,
		setItem: (key, value) => map.set(key, String(value)),
		removeItem: (key) => map.delete(key),
		clear: () => map.clear()
	};
}
var noopEvents = {
	addEventListener() {},
	removeEventListener() {},
	dispatchEvent: () => true
};
var documentStub = {
	...noopEvents,
	documentElement: {
		dataset: {},
		style: { setProperty() {} }
	},
	visibilityState: "visible",
	activeElement: null,
	body: { style: {} },
	querySelector: () => null,
	querySelectorAll: () => [],
	createElement: () => ({
		style: {},
		click() {},
		setAttribute() {}
	})
};
var locationStub = {
	pathname: "/",
	search: "",
	hash: "",
	href: "http://localhost/"
};
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();
globalThis.localStorage.setItem("tidyline:profile", JSON.stringify({
	isSetUp: true,
	name: "TidyLine",
	isGuest: false
}));
globalThis.document = documentStub;
globalThis.location = locationStub;
globalThis.history = {
	pushState() {},
	replaceState() {},
	state: null,
	length: 1
};
globalThis.window = {
	...noopEvents,
	document: documentStub,
	location: locationStub,
	history: globalThis.history,
	localStorage: globalThis.localStorage,
	navigator: globalThis.navigator,
	matchMedia: () => ({
		matches: false,
		...noopEvents
	}),
	confirm: () => true,
	alert() {},
	setTimeout
};
var { renderToString } = await import("react-dom/server");
var { default: App } = await import("./assets/App-B0vpe9dB.js");
var { NowPage } = await import("./assets/NowPage-2NO52LGD.js");
var { BoardPage } = await import("./assets/BoardPage-hl8tH2XA.js");
var { CalendarPage } = await import("./assets/CalendarPage-D-rEALT6.js");
var { SettingsPage } = await import("./assets/SettingsPage-ek9tSJg8.js");
var { RoutinesPage } = await import("./assets/RoutinesPage-C2OnVQV5.js");
var { CompletionFeedbackToast } = await import("./assets/CompletionFeedbackToast-CWvWcG82.js");
var { normalizeTask } = await import("./assets/taskMigration-CNYqs6Hb.js");
var today = /* @__PURE__ */ new Date();
var iso = (offset) => {
	const date = new Date(today);
	date.setDate(date.getDate() + offset);
	return date.toISOString().slice(0, 10);
};
var tasks = [
	normalizeTask({
		id: "a",
		title: "Recurring report",
		deadline: iso(3),
		tags: ["work"],
		recurrence: {
			freq: "weekly",
			weekday: 1
		},
		duration: {
			value: 45,
			unit: "min"
		},
		checklist: [{
			id: "c1",
			text: "Draft",
			done: false
		}],
		attachments: [{
			id: "old",
			label: "Legacy brief",
			url: "https://example.com/brief"
		}]
	}),
	normalizeTask({
		id: "b",
		title: "Today item",
		deadline: iso(0),
		pinned: true
	}),
	normalizeTask({
		id: "c",
		title: "No deadline",
		deadline: null
	}),
	normalizeTask({
		id: "d",
		title: "Done",
		deadline: iso(0),
		done: true
	})
];
var noop = () => {};
var taskActions = new Proxy({}, { get: () => noop });
var appearance = {
	theme: "light",
	toggleTheme: noop,
	accent: "#ff5a36",
	setAccent: noop,
	density: "comfortable",
	setDensity: noop
};
var cases = [
	[
		"App shell",
		/* @__PURE__ */ jsx(App, {}),
		[
			"TidyLine",
			"Now",
			"Board",
			"Calendar",
			"Routines",
			"nav-indicator"
		]
	],
	[
		"NowPage",
		/* @__PURE__ */ jsx(NowPage, {
			tasks,
			onComplete: noop,
			onStart: noop,
			onPause: noop
		}),
		[
			"Here’s what I’d do next",
			"Start here",
			"Today item",
			"5 more minutes",
			"Done",
			"Not this"
		]
	],
	[
		"BoardPage",
		/* @__PURE__ */ jsx(BoardPage, {
			tasks,
			addTask: noop,
			moveTaskToBucket: noop,
			bulkComplete: noop,
			bulkArchive: noop,
			bulkDelete: noop,
			undoState: { message: "Task changed" },
			undo: noop,
			dismissUndo: noop,
			...taskActions
		}),
		[
			"Today",
			"This Week",
			"This Month",
			"Later",
			"distance-rail",
			"data-task-id",
			"undo-toast"
		]
	],
	[
		"CalendarPage",
		/* @__PURE__ */ jsx(CalendarPage, {
			tasks,
			addTask: noop,
			setDeadline: noop
		}),
		[
			"Calendar",
			"Export calendar",
			"device timezone",
			"Time ahead",
			"time-ribbon",
			"calendar-grid",
			"calendar-day"
		]
	],
	[
		"SettingsPage",
		/* @__PURE__ */ jsx(SettingsPage, {
			tasks,
			appearance,
			importTasks: noop,
			importRoutines: noop,
			routines: [],
			clearCompleted: noop,
			askBeforeDelete: true,
			onAskBeforeDeleteChange: noop,
			profile: {
				name: "TidyLine",
				setName: noop
			}
		}),
		[
			"Accent colour",
			"accent-swatch",
			"Density",
			"Reminder sound",
			"checked only while TidyLine is open",
			"Personal estimate multiplier",
			"Export workspace"
		]
	],
	[
		"RoutinesPage",
		/* @__PURE__ */ jsx(RoutinesPage, {
			routines: [{
				id: "leave",
				title: "Leaving home",
				steps: [{
					id: "keys",
					text: "Pick up keys"
				}]
			}],
			dataError: "",
			onAdd: noop,
			onUpdate: noop,
			onDelete: noop
		}),
		[
			"Routines",
			"Leaving home",
			"Run routine",
			"New routine",
			"Edit",
			"Delete"
		]
	],
	[
		"Completion feedback",
		/* @__PURE__ */ jsx(CompletionFeedbackToast, {
			feedback: {
				title: "Timed task",
				estimateMinutes: 30,
				actualMinutes: 70
			},
			onDismiss: noop
		}),
		[
			"completion-feedback-toast",
			"Timed task",
			"Estimated",
			"took"
		]
	]
];
var failures = 0;
for (const [name, element, markers] of cases) try {
	const html = renderToString(element);
	const missing = markers.filter((marker) => !html.includes(marker));
	if (!html || missing.length) throw new Error(`missing markers: ${missing.join(", ")}`);
	console.log(`ok    ${name} — ${html.length} chars`);
} catch (error) {
	console.error(`FAIL  ${name} — ${error.message}`);
	failures += 1;
}
if (failures) process.exit(1);
console.log("\nAll active surfaces mounted without throwing.");
//#endregion
export {};
