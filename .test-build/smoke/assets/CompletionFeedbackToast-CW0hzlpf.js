import { f as CloseIcon } from "./icons-BWrl8Kfc.js";
import { r as formatMinutes } from "./calibration-qStEAgJC.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
//#region src/components/CompletionFeedbackToast.jsx
var TOAST_MS = 7e3;
function CompletionFeedbackToast({ feedback, onDismiss }) {
	useEffect(() => {
		const timer = window.setTimeout(onDismiss, TOAST_MS);
		return () => window.clearTimeout(timer);
	}, [onDismiss]);
	return /* @__PURE__ */ jsxs("div", {
		className: "undo-toast completion-feedback-toast",
		role: "status",
		"aria-live": "polite",
		children: [/* @__PURE__ */ jsxs("span", {
			className: "toast-message",
			children: [/* @__PURE__ */ jsx("strong", { children: feedback.title }), /* @__PURE__ */ jsxs("span", { children: [
				"Estimated ",
				formatMinutes(feedback.estimateMinutes),
				" · took ",
				formatMinutes(feedback.actualMinutes),
				"."
			] })]
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			className: "icon-mini",
			onClick: onDismiss,
			"aria-label": "Dismiss completion comparison",
			children: /* @__PURE__ */ jsx(CloseIcon, {})
		})]
	});
}
//#endregion
export { CompletionFeedbackToast as t };
