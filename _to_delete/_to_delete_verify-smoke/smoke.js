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
	dispatchEvent() {
		return true;
	}
};
var documentStub = {
	...noopEvents,
	documentElement: {
		dataset: {},
		style: { setProperty() {} }
	},
	visibilityState: "visible",
	activeElement: null,
	body: {},
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
	})
};
var { renderToString } = await import("react-dom/server");
var { default: App } = await import("./assets/App-De8QqNcu.js");
var { WelcomeDialog } = await import("./assets/WelcomeDialog-CEbGh1LP.js");
var { HomePage } = await import("./assets/HomePage-BA5iAQFc.js");
var { BoardPage } = await import("./assets/BoardPage-COX5I3rC.js");
var { CalendarPage } = await import("./assets/CalendarPage-Zuh4OOMt.js");
var { AnalyticsPage } = await import("./assets/AnalyticsPage-Bw-vTaAV.js");
var { SettingsPage } = await import("./assets/SettingsPage-ENXCmsUE.js");
var { PlannerPage } = await import("./assets/PlannerPage-DX-duTHz.js");
var { SomedayPage } = await import("./assets/SomedayPage-BNCrOYEO.js");
var { normalizeTask } = await import("./assets/useTasks-CSRtAXqk.js");
globalThis.localStorage.setItem("tidyline:profile", JSON.stringify({
	isSetUp: true,
	name: "Guest",
	isGuest: true
}));
var today = /* @__PURE__ */ new Date();
var iso = (offsetDays) => {
	const date = new Date(today);
	date.setDate(date.getDate() + offsetDays);
	return date.toISOString().slice(0, 10);
};
var tasks = [
	normalizeTask({
		id: "a",
		title: "Recurring weekly report",
		deadline: iso(3),
		reminders: ["2026-01-01T09:00"],
		tags: ["work", "urgent"],
		recurrence: {
			freq: "weekly",
			weekday: 1
		},
		notes: "draft first",
		location: "Room 4",
		duration: {
			value: 90,
			unit: "min"
		},
		checklist: [{
			id: "c1",
			text: "gather",
			done: true
		}, {
			id: "c2",
			text: "write",
			done: false
		}],
		links: [{
			id: "l1",
			label: "Spec",
			url: "https://example.com"
		}],
		attachments: [{
			id: "f1",
			label: "Deck",
			url: "https://example.com/deck"
		}],
		createdAt: (/* @__PURE__ */ new Date(today.getTime() - 1728e6)).toISOString()
	}),
	normalizeTask({
		id: "b",
		title: "Overdue by a day",
		deadline: iso(-1)
	}),
	normalizeTask({
		id: "c",
		title: "Overdue by a week",
		deadline: iso(-9)
	}),
	normalizeTask({
		id: "d",
		title: "Done today",
		deadline: iso(0),
		done: true,
		completedAt: (/* @__PURE__ */ new Date()).toISOString()
	}),
	normalizeTask({
		id: "e",
		title: "Archived item",
		deadline: iso(5),
		archived: true
	}),
	normalizeTask({
		id: "f",
		title: "Far future",
		deadline: iso(400)
	}),
	normalizeTask({
		id: "g",
		title: "Scheduled focus block",
		deadline: iso(2),
		scheduledStart: `${iso(0)}T10:00`,
		duration: {
			value: 45,
			unit: "min"
		}
	}),
	normalizeTask({
		id: "h",
		title: "Maybe learn pottery",
		deadline: null,
		notes: "Find a class"
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
			"Open navigation",
			"TidyLine",
			"app-layout"
		]
	],
	[
		"WelcomeDialog",
		/* @__PURE__ */ jsx(WelcomeDialog, {
			onImportTasks: noop,
			onComplete: noop,
			onGoogleSignIn: noop
		}),
		[
			"Make this space yours",
			"Sign in with Google",
			"Start as guest",
			"Import JSON"
		]
	],
	[
		"HomePage",
		/* @__PURE__ */ jsx(HomePage, { tasks }),
		[
			"Today at a glance",
			"overdue",
			"completed today",
			"milestone-track",
			"activity-dot"
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
			undoState: { message: "Task deleted" },
			undo: noop,
			dismissUndo: noop,
			...taskActions
		}),
		[
			"Overdue",
			"A week or more",
			"countdown",
			"distance-rail",
			"bucket-progress",
			"days overdue",
			"undo-toast",
			"data-task-id"
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
			"calendar-grid",
			"calendar-day",
			"calendar-day-workload"
		]
	],
	[
		"AnalyticsPage",
		/* @__PURE__ */ jsx(AnalyticsPage, { tasks }),
		[
			"milestone-track",
			"ring-tile",
			"trend-col",
			"sparkline",
			"activity-dot",
			"Postpone patterns"
		]
	],
	[
		"PlannerPage",
		/* @__PURE__ */ jsx(PlannerPage, {
			tasks,
			setScheduledStart: noop,
			updateTask: noop
		}),
		[
			"Day planner",
			"Board tasks",
			"planner-timeline",
			"Scheduled focus block"
		]
	],
	[
		"SomedayPage",
		/* @__PURE__ */ jsx(SomedayPage, {
			tasks,
			addSomedayTask: noop,
			promoteSomeday: noop,
			deleteTask: noop,
			updateTask: noop
		}),
		[
			"Someday / Maybe",
			"Holding area",
			"Maybe learn pottery"
		]
	],
	[
		"SettingsPage",
		/* @__PURE__ */ jsx(SettingsPage, {
			tasks,
			appearance,
			importTasks: noop,
			clearCompleted: noop
		}),
		[
			"Accent colour",
			"accent-swatch",
			"Density",
			"Reminder sound"
		]
	]
];
var failures = 0;
for (const [name, element, markers = []] of cases) try {
	const html = renderToString(element);
	if (!html || html.length < 80) {
		console.error(`FAIL  ${name} — rendered ${html.length} chars (suspiciously empty)`);
		failures += 1;
		continue;
	}
	const missing = markers.filter((marker) => !html.includes(marker));
	if (missing.length > 0) {
		console.error(`FAIL  ${name} — missing markers: ${missing.join(", ")}`);
		failures += 1;
		continue;
	}
	console.log(`ok    ${name} — ${html.length} chars, ${markers.length} markers`);
} catch (error) {
	console.error(`FAIL  ${name} — ${error.message}`);
	failures += 1;
}
if (failures > 0) {
	console.error(`\n${failures} smoke failure(s)`);
	process.exit(1);
}
console.log("\nAll pages mounted without throwing.");
process.exit(0);
//#endregion
export {};
