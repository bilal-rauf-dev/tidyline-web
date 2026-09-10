import { n as advanceRoutine, r as getRoutineStep } from "./routineIO-BFJIslfv.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
//#region src/pages/RoutinesPage.jsx
function stepLines(routine) {
	return routine.steps.map((step) => step.text).join("\n");
}
function RoutinesPage({ routines, dataError, onAdd, onUpdate, onDelete }) {
	const [activeRoutineId, setActiveRoutineId] = useState(null);
	const [stepIndex, setStepIndex] = useState(0);
	const [editorMode, setEditorMode] = useState(null);
	const [title, setTitle] = useState("");
	const [actions, setActions] = useState("");
	const [formError, setFormError] = useState("");
	const [notice, setNotice] = useState("");
	const advanceRef = useRef(null);
	const activeRoutine = routines.find((routine) => routine.id === activeRoutineId) ?? null;
	const currentStep = getRoutineStep(activeRoutine, stepIndex);
	useEffect(() => {
		if (currentStep) advanceRef.current?.focus();
	}, [currentStep]);
	function openCreate() {
		setEditorMode("new");
		setTitle("");
		setActions("");
		setFormError("");
	}
	function openEdit(routine) {
		setEditorMode(routine.id);
		setTitle(routine.title);
		setActions(stepLines(routine));
		setFormError("");
	}
	function closeEditor() {
		setEditorMode(null);
		setFormError("");
	}
	function saveRoutine(event) {
		event.preventDefault();
		const actionLines = actions.split(/\r?\n/).map((text) => text.trim()).filter(Boolean);
		if (!title.trim()) {
			setFormError("Give this routine a short name.");
			return;
		}
		if (!actionLines.length) {
			setFormError("Add at least one action, one per line.");
			return;
		}
		if (actionLines.length > 50) {
			setFormError("Keep this routine to 50 actions or fewer.");
			return;
		}
		const steps = actionLines.map((text) => ({ text }));
		if (editorMode === "new") onAdd({
			title,
			steps
		});
		else onUpdate(editorMode, {
			title,
			steps
		});
		setNotice(editorMode === "new" ? "Routine saved." : "Routine updated.");
		closeEditor();
	}
	function runRoutine(routine) {
		if (!routine.steps.length) return;
		setNotice("");
		setStepIndex(0);
		setActiveRoutineId(routine.id);
	}
	function finishStep() {
		const result = advanceRoutine(activeRoutine, stepIndex);
		if (result.complete) {
			setActiveRoutineId(null);
			setStepIndex(0);
			setNotice(`${activeRoutine.title} complete.`);
			return;
		}
		setStepIndex(result.stepIndex);
	}
	if (activeRoutine && currentStep) {
		const isLast = stepIndex === activeRoutine.steps.length - 1;
		return /* @__PURE__ */ jsxs("main", {
			className: "app-shell routine-runner-shell",
			children: [/* @__PURE__ */ jsxs("header", {
				className: "hero routine-runner-hero",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "welcome-kicker",
						children: "Routine running"
					}),
					/* @__PURE__ */ jsx("h1", { children: activeRoutine.title }),
					/* @__PURE__ */ jsx("p", {
						className: "hero-copy",
						children: "Only this action matters right now."
					})
				]
			}), /* @__PURE__ */ jsxs("section", {
				className: "entry-card routine-step-card",
				"aria-labelledby": "routine-step-title",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "home-feature-kicker",
						children: [
							"Step ",
							stepIndex + 1,
							" of ",
							activeRoutine.steps.length
						]
					}),
					/* @__PURE__ */ jsx("h2", {
						id: "routine-step-title",
						children: currentStep.text
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "routine-run-actions",
						children: [/* @__PURE__ */ jsx("button", {
							ref: advanceRef,
							type: "button",
							className: "primary",
							onClick: finishStep,
							children: isLast ? "Finish routine" : "Done — next action"
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "secondary",
							onClick: () => {
								setActiveRoutineId(null);
								setStepIndex(0);
							},
							children: "Stop routine"
						})]
					})
				]
			})]
		});
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell routines-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "hero routines-hero",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", { children: "Routines" }), /* @__PURE__ */ jsx("p", {
					className: "hero-copy",
					children: "Save a short sequence once, then follow one action at a time."
				})] }), !editorMode && /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "primary",
					onClick: openCreate,
					children: "New routine"
				})]
			}),
			dataError && /* @__PURE__ */ jsx("p", {
				className: "data-error",
				role: "alert",
				children: dataError
			}),
			/* @__PURE__ */ jsx("p", {
				className: "sr-only",
				role: "status",
				"aria-live": "polite",
				children: notice
			}),
			editorMode && /* @__PURE__ */ jsxs("section", {
				className: "entry-card routine-editor",
				"aria-labelledby": "routine-editor-title",
				children: [/* @__PURE__ */ jsx("h2", {
					id: "routine-editor-title",
					children: editorMode === "new" ? "New routine" : "Edit routine"
				}), /* @__PURE__ */ jsxs("form", {
					onSubmit: saveRoutine,
					children: [
						/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("span", { children: "Routine name" }), /* @__PURE__ */ jsx("input", {
							autoFocus: true,
							maxLength: "80",
							placeholder: "Leaving the house",
							value: title,
							onChange: (event) => setTitle(event.target.value)
						})] }),
						/* @__PURE__ */ jsxs("label", { children: [
							/* @__PURE__ */ jsx("span", { children: "Actions, in order" }),
							/* @__PURE__ */ jsx("textarea", {
								rows: "7",
								placeholder: "Pick up keys\nPut on shoes\nCheck the door",
								value: actions,
								onChange: (event) => setActions(event.target.value)
							}),
							/* @__PURE__ */ jsx("small", { children: "One concrete action per line. Up to 50 actions are kept." })
						] }),
						formError && /* @__PURE__ */ jsx("p", {
							className: "routine-form-error",
							role: "alert",
							children: formError
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "routine-editor-actions",
							children: [/* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "primary",
								children: "Save routine"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "secondary",
								onClick: closeEditor,
								children: "Cancel"
							})]
						})
					]
				})]
			}),
			!routines.length && !editorMode ? /* @__PURE__ */ jsxs("section", {
				className: "entry-card routines-empty",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "home-feature-kicker",
						children: "No setup required"
					}),
					/* @__PURE__ */ jsx("h2", { children: "Save only a sequence you repeat." }),
					/* @__PURE__ */ jsx("p", { children: "Good examples are leaving home, starting work, or closing down for the day." }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "primary",
						onClick: openCreate,
						children: "Create a routine"
					})
				]
			}) : /* @__PURE__ */ jsx("div", {
				className: "routine-grid",
				"aria-label": "Saved routines",
				children: routines.map((routine) => /* @__PURE__ */ jsxs("article", {
					className: "entry-card routine-card",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("span", {
						className: "home-feature-kicker",
						children: [
							routine.steps.length,
							" ",
							routine.steps.length === 1 ? "action" : "actions"
						]
					}), /* @__PURE__ */ jsx("h2", { children: routine.title })] }), /* @__PURE__ */ jsxs("div", {
						className: "routine-card-actions",
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "primary",
								disabled: !routine.steps.length,
								onClick: () => runRoutine(routine),
								children: "Run routine"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "secondary",
								onClick: () => openEdit(routine),
								children: "Edit"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "link-button",
								onClick: () => {
									if (window.confirm(`Delete “${routine.title}”?`)) onDelete(routine.id);
								},
								children: "Delete"
							})
						]
					})]
				}, routine.id))
			})
		]
	});
}
//#endregion
export { RoutinesPage as t };
