import { _ as GoogleIcon } from "./icons-98MzWrNh.js";
import { t as parseImportedTasks } from "./tasksIO-CwNEef1r.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
//#region src/components/BrandMonogram.jsx
function BrandMonogram({ size = 22 }) {
	const width = Math.round(size * (600 / 490));
	return /* @__PURE__ */ jsxs("svg", {
		width,
		height: size,
		viewBox: "210 120 600 490",
		fill: "none",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("path", {
				d: "M260 170 H560 M410 170 V560",
				stroke: "currentColor",
				strokeWidth: "56"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M560 250 V560 H760",
				stroke: "currentColor",
				strokeWidth: "56"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M640 280 H760",
				stroke: "currentColor",
				strokeWidth: "24",
				opacity: "0.5"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M640 360 H760",
				stroke: "currentColor",
				strokeWidth: "24",
				opacity: "0.5"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M640 440 H760",
				stroke: "currentColor",
				strokeWidth: "24",
				opacity: "0.5"
			})
		]
	});
}
//#endregion
//#region src/components/WelcomeDialog.jsx
function WelcomeDialog({ onImportTasks, onComplete, onGoogleSignIn }) {
	const fileInputRef = useRef(null);
	const [importMessage, setImportMessage] = useState("");
	function finishAsGuest() {
		onComplete?.("", true);
	}
	function handleImport(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const tasks = parseImportedTasks(String(reader.result));
				onImportTasks(tasks);
				setImportMessage(`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} imported.`);
			} catch {
				setImportMessage("That file is not a valid TidyLine export.");
			}
		};
		reader.readAsText(file);
		event.target.value = "";
	}
	return /* @__PURE__ */ jsx("main", {
		className: "welcome-screen",
		children: /* @__PURE__ */ jsxs("section", {
			className: "welcome-card",
			"aria-labelledby": "welcome-title",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "welcome-brand",
					children: [/* @__PURE__ */ jsx(BrandMonogram, { size: 30 }), /* @__PURE__ */ jsx("span", { children: "TidyLine" })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "welcome-copy",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "welcome-kicker",
							children: "Welcome to TidyLine"
						}),
						/* @__PURE__ */ jsx("h1", {
							id: "welcome-title",
							children: "Make this space yours."
						}),
						/* @__PURE__ */ jsx("p", { children: "Sign in with Google to sync your tasks across devices, or start immediately as a guest." })
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "welcome-content",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "welcome-import",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: "Already have TidyLine data?" }), /* @__PURE__ */ jsx("span", { children: "Import a previous JSON export before you start." })] }),
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
									onChange: handleImport,
									hidden: true
								})
							]
						}),
						importMessage && /* @__PURE__ */ jsx("p", {
							className: "welcome-import-message",
							role: "status",
							children: importMessage
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "welcome-actions",
							children: [onGoogleSignIn && /* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "primary welcome-google-btn",
								onClick: onGoogleSignIn,
								children: [/* @__PURE__ */ jsx(GoogleIcon, { size: 18 }), /* @__PURE__ */ jsx("span", { children: "Sign in with Google" })]
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "secondary welcome-guest-btn",
								onClick: finishAsGuest,
								children: "Start as guest"
							})]
						})
					]
				})
			]
		})
	});
}
//#endregion
export { BrandMonogram as n, WelcomeDialog as t };
