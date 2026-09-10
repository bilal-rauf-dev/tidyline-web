//#region src/utils/notifications.js
var SOUND_KEY = "tidyline:notificationSound";
var workerRegistration = null;
var audioContext = null;
function ensureNotificationPermission() {
	if (typeof Notification === "undefined") return;
	if (Notification.permission === "default") Notification.requestPermission();
}
function isSoundEnabled() {
	return localStorage.getItem(SOUND_KEY) !== "off";
}
function setSoundEnabled(enabled) {
	localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
}
/**
* Register the notification worker. Only needed so notifications can carry
* action buttons; failure is non-fatal and falls back to plain notifications.
*/
async function registerNotificationWorker() {
	if (!("serviceWorker" in navigator)) return null;
	try {
		workerRegistration = await navigator.serviceWorker.register("/sw.js");
		return workerRegistration;
	} catch {
		workerRegistration = null;
		return null;
	}
}
/** Short two-tone chime, synthesised so no audio asset ships with the app. */
function playChime() {
	if (!isSoundEnabled()) return;
	try {
		const Ctor = window.AudioContext || window.webkitAudioContext;
		if (!Ctor) return;
		audioContext = audioContext ?? new Ctor();
		if (audioContext.state === "suspended") audioContext.resume();
		const start = audioContext.currentTime;
		const gain = audioContext.createGain();
		gain.gain.setValueAtTime(1e-4, start);
		gain.gain.exponentialRampToValueAtTime(.12, start + .02);
		gain.gain.exponentialRampToValueAtTime(1e-4, start + .45);
		gain.connect(audioContext.destination);
		[880, 1320].forEach((frequency, index) => {
			const osc = audioContext.createOscillator();
			osc.type = "sine";
			osc.frequency.setValueAtTime(frequency, start + index * .14);
			osc.connect(gain);
			osc.start(start + index * .14);
			osc.stop(start + index * .14 + .2);
		});
	} catch {}
}
function notifyReminder({ title, body, taskId, reminderId }) {
	if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
	playChime();
	const payload = {
		body,
		tag: `${taskId}:${reminderId}`,
		data: {
			taskId,
			reminderId
		}
	};
	if (workerRegistration?.showNotification) {
		workerRegistration.showNotification(title, {
			...payload,
			actions: [{
				action: "complete",
				title: "Complete"
			}, {
				action: "snooze",
				title: "Snooze 10m"
			}]
		});
		return;
	}
	new Notification(title, payload);
}
//#endregion
export { registerNotificationWorker as a, playChime as i, isSoundEnabled as n, setSoundEnabled as o, notifyReminder as r, ensureNotificationPermission as t };
