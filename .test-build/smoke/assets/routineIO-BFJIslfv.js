var ROUTINE_STORAGE_KEY = "tidyline:routines";
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
//#endregion
export { normalizeRoutine as a, migrateRoutineData as i, advanceRoutine as n, parseImportedRoutines as o, getRoutineStep as r, routineEnvelope as s, ROUTINE_STORAGE_KEY as t };
