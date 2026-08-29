import { n as estimateTaskDuration, r as formatMinutes, t as durationToMinutes } from "./calibration-qStEAgJC.js";
import { r as formatDate, t as daysUntil } from "./dates-DhUD90mg.js";
import { a as deriveStartBy, c as getTaskAttentionDate, l as getTaskTimingLabel, s as getFitAssessment, t as TagList } from "./TagList-B3Uu9qDt.js";
import { t as useTimeTick } from "./useFlipReparent-CYDJp-9R.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
//#region src/utils/nowSelection.js
function fitOrder(task, tasks, referenceDate) {
	return {
		"wont-fit": 0,
		tight: 1,
		comfortable: 2
	}[getFitAssessment(task, tasks, referenceDate)?.level] ?? 3;
}
function attentionOrder(task, tasks, referenceDate) {
	if (task.startedAt) return 0;
	const startBy = deriveStartBy(task, tasks, referenceDate);
	const attention = getTaskAttentionDate(task, tasks, referenceDate);
	if (startBy && daysUntil(startBy, referenceDate) < 0) return 1;
	if (attention && daysUntil(attention, referenceDate) <= 0) return 2;
	if (task.deadline && daysUntil(task.deadline, referenceDate) <= 0) return 3;
	if (attention) return 4;
	return 5;
}
function remainingMinutes(task, tasks) {
	return Math.max(0, estimateTaskDuration(task, tasks).minutes - (Number(task.actualMinutes) || 0));
}
function compareValues(a, b) {
	for (let index = 0; index < a.length; index += 1) {
		if (a[index] < b[index]) return -1;
		if (a[index] > b[index]) return 1;
	}
	return 0;
}
function rankNowTasks(tasks, referenceDate = /* @__PURE__ */ new Date()) {
	return [...tasks.filter((task) => !task.done && !task.archived)].sort((a, b) => compareValues([
		attentionOrder(a, tasks, referenceDate),
		getTaskAttentionDate(a, tasks, referenceDate) ?? "9999-12-31",
		a.deadline ?? "9999-12-31",
		fitOrder(a, tasks, referenceDate),
		remainingMinutes(a, tasks),
		a.createdAt,
		a.id
	], [
		attentionOrder(b, tasks, referenceDate),
		getTaskAttentionDate(b, tasks, referenceDate) ?? "9999-12-31",
		b.deadline ?? "9999-12-31",
		fitOrder(b, tasks, referenceDate),
		remainingMinutes(b, tasks),
		b.createdAt,
		b.id
	]));
}
function selectNowTask(tasks, referenceDate = /* @__PURE__ */ new Date(), excludedIds = []) {
	const ranked = rankNowTasks(tasks, referenceDate);
	const excluded = new Set(excludedIds);
	return ranked.find((task) => !excluded.has(task.id)) ?? ranked[0] ?? null;
}
function rotateNowExclusions(rankedTasks, currentId, excludedIds = []) {
	const skipped = /* @__PURE__ */ new Set([...excludedIds, currentId]);
	return rankedTasks.some((task) => !skipped.has(task.id)) ? [...skipped] : [currentId];
}
//#endregion
//#region src/pages/NowPage.jsx
var CONTINUATION_MS = 3e5;
function NowPage({ tasks, onComplete, onStart, onPause }) {
	const tick = useTimeTick();
	const referenceDate = useMemo(() => new Date(tick), [tick]);
	const [skippedIds, setSkippedIds] = useState([]);
	const [encouragement, setEncouragement] = useState(null);
	const continuationTimer = useRef(null);
	const primaryActionRef = useRef(null);
	const ranked = useMemo(() => rankNowTasks(tasks, referenceDate), [referenceDate, tasks]);
	const next = useMemo(() => selectNowTask(tasks, referenceDate, skippedIds), [
		referenceDate,
		skippedIds,
		tasks
	]);
	const fit = next ? getFitAssessment(next, tasks, referenceDate) : null;
	const expected = next ? estimateTaskDuration(next, tasks) : null;
	const estimateMinutes = next ? durationToMinutes(next.duration) : null;
	const firstStep = next?.checklist.find((item) => !item.done);
	useEffect(() => () => window.clearTimeout(continuationTimer.current), []);
	useEffect(() => {
		primaryActionRef.current?.focus();
	}, [next?.id]);
	function fiveMoreMinutes() {
		if (!next) return;
		if (!next.startedAt) onStart(next.id);
		window.clearTimeout(continuationTimer.current);
		setEncouragement({
			taskId: next.id,
			message: "Stay with this for five minutes. That is enough for now."
		});
		continuationTimer.current = window.setTimeout(() => {
			setEncouragement({
				taskId: next.id,
				message: "Five minutes done. Keep going, finish, or choose another task."
			});
		}, CONTINUATION_MS);
	}
	function chooseAnother() {
		if (!next || ranked.length <= 1) return;
		if (next.startedAt) onPause(next.id);
		window.clearTimeout(continuationTimer.current);
		setEncouragement(null);
		setSkippedIds((current) => rotateNowExclusions(ranked, next.id, current));
	}
	function completeCurrent() {
		if (!next) return;
		window.clearTimeout(continuationTimer.current);
		setEncouragement(null);
		onComplete(next.id);
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell now-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "hero now-hero",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "welcome-kicker",
						children: "Right now"
					}),
					/* @__PURE__ */ jsx("h1", { children: "Here’s what I’d do next." }),
					/* @__PURE__ */ jsx("p", {
						className: "hero-copy",
						children: "One task. No sorting required."
					})
				]
			}),
			next ? /* @__PURE__ */ jsxs("section", {
				className: next.startedAt ? "entry-card now-focus-card active" : "entry-card now-focus-card",
				"aria-labelledby": "now-task-title",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "now-focus-heading",
						children: /* @__PURE__ */ jsx("span", {
							className: "home-feature-kicker",
							children: next.startedAt ? "In progress" : "Start here"
						})
					}),
					/* @__PURE__ */ jsx("h2", {
						id: "now-task-title",
						children: next.title
					}),
					/* @__PURE__ */ jsx("p", {
						className: "now-timing",
						children: next.deadline ? `${getTaskTimingLabel(next, tasks, referenceDate)} · due ${formatDate(next.deadline)}` : getTaskTimingLabel(next, tasks, referenceDate)
					}),
					fit && /* @__PURE__ */ jsx("p", {
						className: `fit-label fit-${fit.level}`,
						children: fit.label
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "now-context",
						children: [
							/* @__PURE__ */ jsx("p", { children: estimateMinutes ? `Estimated ${formatMinutes(estimateMinutes)}${expected.source === "calibrated" ? ` · usually ~${formatMinutes(expected.minutes)}` : ""}` : `Allow about ${formatMinutes(expected.minutes)}` }),
							next.actualMinutes && /* @__PURE__ */ jsxs("p", { children: [formatMinutes(next.actualMinutes), " logged so far"] }),
							firstStep && /* @__PURE__ */ jsxs("p", { children: [
								/* @__PURE__ */ jsx("strong", { children: "First step:" }),
								" ",
								firstStep.text
							] })
						]
					}),
					/* @__PURE__ */ jsx(TagList, { tags: next.tags }),
					/* @__PURE__ */ jsxs("div", {
						className: "now-actions",
						role: "group",
						"aria-label": "Current task actions",
						children: [
							/* @__PURE__ */ jsx("button", {
								ref: primaryActionRef,
								type: "button",
								className: "primary now-five",
								onClick: fiveMoreMinutes,
								children: "5 more minutes"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "secondary",
								onClick: completeCurrent,
								children: "Done"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "secondary",
								onClick: chooseAnother,
								disabled: ranked.length <= 1,
								children: "Not this"
							})
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "now-encouragement",
						role: "status",
						"aria-live": "polite",
						children: encouragement?.taskId === next.id ? encouragement.message : ""
					}),
					/* @__PURE__ */ jsx(Link, {
						href: `/board?expand=${encodeURIComponent(next.id)}`,
						className: "link-button",
						children: "Open details"
					})
				]
			}) : /* @__PURE__ */ jsxs("section", {
				className: "entry-card now-focus-card now-empty",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "home-feature-kicker",
						children: "All clear"
					}),
					/* @__PURE__ */ jsx("h2", { children: "Nothing needs your attention." }),
					/* @__PURE__ */ jsx("p", { children: "Take the win. Add something only when it comes up." }),
					/* @__PURE__ */ jsx(Link, {
						ref: primaryActionRef,
						href: "/board?add=1",
						className: "primary",
						children: "Add a task"
					})
				]
			}),
			/* @__PURE__ */ jsx(Link, {
				href: "/board",
				className: "link-button now-board-link",
				children: "See the full board"
			})
		]
	});
}
//#endregion
export { NowPage as t };
