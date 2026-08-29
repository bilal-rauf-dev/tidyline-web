var MIN_MULTIPLIER = .5;
function durationToMinutes(duration) {
	const value = Number(duration?.value);
	if (!Number.isFinite(value) || value <= 0) return null;
	return value * (duration?.unit === "hr" ? 60 : 1);
}
function median(values) {
	const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
	if (!sorted.length) return null;
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function validActual(task) {
	const value = Number(task.actualMinutes);
	return task.done && Number.isFinite(value) && value > 0 && value <= 10080 ? value : null;
}
function getCalibration(tasks, minimumSamples = 3) {
	const ratios = tasks.flatMap((task) => {
		const estimate = durationToMinutes(task.duration);
		const actual = validActual(task);
		return estimate && actual ? [actual / estimate] : [];
	});
	const rawMultiplier = median(ratios);
	const calibrated = ratios.length >= minimumSamples && rawMultiplier !== null;
	return {
		multiplier: calibrated ? Math.min(4, Math.max(MIN_MULTIPLIER, rawMultiplier)) : 1,
		sampleCount: ratios.length,
		calibrated
	};
}
function roundedMinutes(value) {
	return Math.max(5, Math.round(value / 5) * 5);
}
function estimateTaskDuration(task, tasks) {
	const explicit = durationToMinutes(task.duration);
	const calibration = getCalibration(tasks);
	if (explicit) return {
		minutes: roundedMinutes(explicit * calibration.multiplier),
		source: calibration.calibrated ? "calibrated" : "estimate",
		estimateMinutes: explicit,
		...calibration
	};
	const historical = median(tasks.map(validActual).filter((value) => value !== null));
	if (historical !== null) return {
		minutes: roundedMinutes(historical),
		source: "history",
		estimateMinutes: null,
		...calibration
	};
	return {
		minutes: 45,
		source: "fallback",
		estimateMinutes: null,
		...calibration
	};
}
function formatMinutes(minutes) {
	const total = Math.max(0, Math.round(Number(minutes) || 0));
	const hours = Math.floor(total / 60);
	const remainder = total % 60;
	if (!hours) return `${remainder}m`;
	if (!remainder) return `${hours}h`;
	return `${hours}h ${remainder}m`;
}
//#endregion
export { getCalibration as i, estimateTaskDuration as n, formatMinutes as r, durationToMinutes as t };
