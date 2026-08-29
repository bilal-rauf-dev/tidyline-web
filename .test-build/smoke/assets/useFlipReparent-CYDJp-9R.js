import { useEffect, useState } from "react";
//#region src/hooks/useFlipReparent.js
var RECHECK_MS = 6e4;
var MODULE_START = Date.now();
function useTimeTick(intervalMs = RECHECK_MS) {
	const [tick, setTick] = useState(MODULE_START);
	useEffect(() => {
		const id = window.setInterval(() => setTick(Date.now()), intervalMs);
		function refreshWhenVisible() {
			if (document.visibilityState === "visible") setTick(Date.now());
		}
		document.addEventListener("visibilitychange", refreshWhenVisible);
		window.addEventListener("focus", refreshWhenVisible);
		return () => {
			window.clearInterval(id);
			document.removeEventListener("visibilitychange", refreshWhenVisible);
			window.removeEventListener("focus", refreshWhenVisible);
		};
	}, [intervalMs]);
	return tick;
}
//#endregion
export { useTimeTick as t };
