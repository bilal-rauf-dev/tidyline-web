import { r as parseTags, t as TagList } from "./TagList-QBt6i8xH.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region src/pages/SomedayPage.jsx
function SomedayCard({ task, onPromote, onDelete, onUpdate }) {
	const [deadline, setDeadline] = useState("");
	return /* @__PURE__ */ jsxs("li", {
		className: "someday-card",
		"data-task-id": task.id,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "someday-card-head",
				children: [/* @__PURE__ */ jsx("strong", { children: task.title }), /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "secondary danger",
					onClick: () => onDelete(task.id),
					children: "Delete"
				})]
			}),
			/* @__PURE__ */ jsx("textarea", {
				rows: "3",
				value: task.notes,
				placeholder: "Shape the idea when it becomes clearer",
				onChange: (event) => onUpdate(task.id, { notes: event.target.value })
			}),
			/* @__PURE__ */ jsx(TagList, { tags: task.tags }),
			/* @__PURE__ */ jsxs("div", {
				className: "someday-promote",
				children: [/* @__PURE__ */ jsxs("label", {
					className: "field-icon",
					children: [/* @__PURE__ */ jsx("span", {
						className: "field-icon-head",
						children: "Promote with deadline"
					}), /* @__PURE__ */ jsx("input", {
						type: "date",
						value: deadline,
						onChange: (event) => setDeadline(event.target.value)
					})]
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "primary",
					disabled: !deadline,
					onClick: () => onPromote(task.id, deadline),
					children: "Move to Board"
				})]
			})
		]
	});
}
function SomedayPage({ tasks, addSomedayTask, promoteSomeday, deleteTask, updateTask }) {
	const [title, setTitle] = useState("");
	const [notes, setNotes] = useState("");
	const [tags, setTags] = useState("");
	const ideas = tasks.filter((task) => !task.deadline && !task.archived);
	function submit(event) {
		event.preventDefault();
		if (!title.trim()) return;
		addSomedayTask({
			title: title.trim(),
			notes,
			tags: parseTags(tags)
		});
		setTitle("");
		setNotes("");
		setTags("");
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell someday-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "hero",
				children: [/* @__PURE__ */ jsx("h1", { children: "Someday / Maybe" }), /* @__PURE__ */ jsx("p", {
					className: "hero-copy",
					children: "Keep ideas without inventing a deadline. Promote one when it becomes real work."
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "entry-card someday-entry",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "someday-entry-head",
					children: [/* @__PURE__ */ jsx("h2", { children: "Capture an idea" }), /* @__PURE__ */ jsx("p", { children: "Give it a name now. The details can stay loose until it is ready." })]
				}), /* @__PURE__ */ jsxs("form", {
					onSubmit: submit,
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "field-underline",
							children: [/* @__PURE__ */ jsx("label", {
								className: "sr-only",
								htmlFor: "someday-title",
								children: "Idea title"
							}), /* @__PURE__ */ jsx("input", {
								id: "someday-title",
								type: "text",
								className: "input-underline",
								value: title,
								placeholder: "Something worth revisiting",
								onChange: (event) => setTitle(event.target.value),
								required: true
							})]
						}),
						/* @__PURE__ */ jsxs("label", {
							className: "someday-field",
							children: [/* @__PURE__ */ jsx("span", { children: "Notes" }), /* @__PURE__ */ jsx("textarea", {
								rows: "4",
								value: notes,
								placeholder: "What would make this worth returning to?",
								onChange: (event) => setNotes(event.target.value)
							})]
						}),
						/* @__PURE__ */ jsxs("label", {
							className: "field-icon",
							children: [/* @__PURE__ */ jsx("span", {
								className: "field-icon-head",
								children: "Tags"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								value: tags,
								placeholder: "idea, reading",
								onChange: (event) => setTags(event.target.value)
							})]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "primary",
							children: "Save idea"
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "someday-list-section",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "someday-list-head",
					children: [/* @__PURE__ */ jsx("h2", { children: "Holding area" }), /* @__PURE__ */ jsx("span", { children: ideas.length })]
				}), ideas.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "empty",
					children: "No ideas parked here."
				}) : /* @__PURE__ */ jsx("ul", {
					className: "someday-list",
					children: ideas.map((task) => /* @__PURE__ */ jsx(SomedayCard, {
						task,
						onPromote: promoteSomeday,
						onDelete: deleteTask,
						onUpdate: updateTask
					}, task.id))
				})]
			})
		]
	});
}
//#endregion
export { SomedayPage as t };
