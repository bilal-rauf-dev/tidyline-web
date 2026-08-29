//#region src/utils/tasksIO.js
function serializeTasks(tasks) {
	return JSON.stringify(tasks, null, 2);
}
function parseImportedTasks(json) {
	const parsed = JSON.parse(json);
	if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of tasks");
	return parsed.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && (typeof item.deadline === "string" || item.deadline === null)).map((item) => ({ ...item }));
}
//#endregion
export { serializeTasks as n, parseImportedTasks as t };
