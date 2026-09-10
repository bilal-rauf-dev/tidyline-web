var BOOT_TIME = (/* @__PURE__ */ new Date()).toISOString();
var MAX_STEPS = 50;
function normalizeStep(value) {
	const text = typeof value === "string" ? value : value?.text;
	if (typeof text !== "string" || !text.trim()) return null;
	return {
		id: typeof value?.id === "string" && value.id ? value.id : crypto.randomUUID(),
		text: text.trim()
	};
}
function normalizeRoutine(value) {
	const routine = value && typeof value === "object" ? value : {};
	return {
		id: typeof routine.id === "string" && routine.id ? routine.id : crypto.randomUUID(),
		title: typeof routine.title === "string" && routine.title.trim() ? routine.title.trim() : "Untitled routine",
		steps: (Array.isArray(routine.steps) ? routine.steps : []).map(normalizeStep).filter(Boolean).slice(0, MAX_STEPS),
		createdAt: typeof routine.createdAt === "string" ? routine.createdAt : BOOT_TIME
	};
}
function routineEnvelope(routines) {
	return {
		schemaVersion: 1,
		routines
	};
}
function migrateRoutineData(value) {
	if (Array.isArray(value)) return {
		schemaVersion: 1,
		routines: value,
		migratedFrom: 0
	};
	if (value && typeof value === "object" && Array.isArray(value.routines)) {
		if (Number.isInteger(value.schemaVersion) && value.schemaVersion > 1) throw new TypeError(`Unsupported future routine schema: ${value.schemaVersion}`);
		return {
			schemaVersion: 1,
			routines: value.routines,
			migratedFrom: Number.isInteger(value.schemaVersion) ? value.schemaVersion : null
		};
	}
	throw new TypeError("Expected a TidyLine routine array or routine envelope");
}
function serializeRoutines(routines) {
	return JSON.stringify(routineEnvelope(routines), null, 2);
}
function parseImportedRoutines(json) {
	const value = JSON.parse(json);
	if (!value || typeof value !== "object" || !Array.isArray(value.routines)) return null;
	return migrateRoutineData({
		schemaVersion: value.routineSchemaVersion,
		routines: value.routines
	}).routines;
}
function getRoutineStep(routine, stepIndex) {
	if (!routine || !Number.isInteger(stepIndex) || stepIndex < 0) return null;
	return routine.steps[stepIndex] ?? null;
}
function advanceRoutine(routine, stepIndex) {
	const nextIndex = stepIndex + 1;
	return nextIndex >= (routine?.steps.length ?? 0) ? {
		complete: true,
		stepIndex: 0
	} : {
		complete: false,
		stepIndex: nextIndex
	};
}
function taskEnvelope(tasks) {
	return {
		schemaVersion: 4,
		tasks
	};
}
function serializeTasks(tasks, routines = null) {
	const envelope = taskEnvelope(tasks);
	if (Array.isArray(routines)) {
		envelope.routines = routines;
		envelope.routineSchemaVersion = 1;
	}
	return JSON.stringify(envelope, null, 2);
}
//#endregion
//#region scripts/phase7-smoke.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
var routine = normalizeRoutine({
	id: "leave",
	title: "  Leaving the house  ",
	steps: [
		{
			id: "keys",
			text: "  Pick up keys  ",
			done: true,
			deadline: "2026-08-22"
		},
		"Put on shoes",
		null,
		{ nope: true }
	],
	recurrence: { freq: "daily" },
	templateId: "old-template",
	createdAt: "2026-08-20T09:00:00.000Z"
});
assert(routine.title === "Leaving the house", "Routine title was not normalized");
assert(routine.steps.length === 2 && routine.steps[0].text === "Pick up keys", "Routine steps were not normalized");
assert(Object.keys(routine).join(",") === "id,title,steps,createdAt", "Task/template concepts leaked into routines");
assert(Object.keys(routine.steps[0]).join(",") === "id,text", "Routine progress was persisted on a step");
var legacy = migrateRoutineData([routine]);
assert(legacy.schemaVersion === 1 && legacy.migratedFrom === 0, "Routine array migration failed");
var envelope = JSON.parse(serializeRoutines([routine]));
assert(envelope.schemaVersion === 1 && envelope.routines.length === 1, "Routine envelope failed");
var workspace = JSON.parse(serializeTasks([], [routine]));
assert(workspace.schemaVersion === 4 && workspace.routineSchemaVersion === 1, "Workspace backup did not include routines");
assert(parseImportedRoutines(JSON.stringify(workspace))?.[0].title === "Leaving the house", "Routine backup import failed");
assert(getRoutineStep(routine, 0)?.id === "keys", "Routine did not begin with its first action");
assert(getRoutineStep(routine, 1)?.text === "Put on shoes", "Routine order changed");
assert(getRoutineStep(routine, 2) === null, "Routine invented an action");
assert(advanceRoutine(routine, 0).stepIndex === 1, "Routine did not advance once");
assert(advanceRoutine(routine, 1).complete, "Routine did not finish after its final action");
assert(advanceRoutine(normalizeRoutine({ title: "Empty" }), 0).complete, "Empty routine did not finish safely");
var rejectedInvalid = false;
try {
	migrateRoutineData({ items: [routine] });
} catch {
	rejectedInvalid = true;
}
assert(rejectedInvalid, "Unknown routine storage would be silently replaced");
var rejectedFuture = false;
try {
	migrateRoutineData({
		schemaVersion: 2,
		routines: [routine]
	});
} catch {
	rejectedFuture = true;
}
assert(rejectedFuture, "Future routine schema would be destructively downgraded");
console.log("ok    isolated routine migration, normalization, and ordered progression");
//#endregion
export {};
