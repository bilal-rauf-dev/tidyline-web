import { jsx, jsxs } from "react/jsx-runtime";
//#region src/utils/tags.js
var TAG_TONES = [
	"lavender",
	"accent",
	"neutral"
];
function parseTags(input) {
	return [...new Set(input.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}
/**
* Deterministic tone per tag, drawn only from the existing palette.
* Same tag always gets the same tone across the app.
*/
function tagTone(tag) {
	let hash = 0;
	for (let i = 0; i < tag.length; i += 1) hash = hash * 31 + tag.charCodeAt(i) >>> 0;
	return TAG_TONES[hash % TAG_TONES.length];
}
function collectTags(tasks) {
	const all = /* @__PURE__ */ new Set();
	tasks.forEach((task) => {
		(task.tags ?? []).forEach((tag) => all.add(tag));
	});
	return [...all].sort();
}
//#endregion
//#region src/components/TagList.jsx
/**
* Flat left-bordered tag marks. Never pill-shaped — see design.md.
*/
function TagList({ tags, onRemove }) {
	if (!tags || tags.length === 0) return null;
	return /* @__PURE__ */ jsx("ul", {
		className: "tag-list",
		children: tags.map((tag) => /* @__PURE__ */ jsxs("li", {
			className: `tag tag-${tagTone(tag)}`,
			children: [/* @__PURE__ */ jsx("span", { children: tag }), onRemove && /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: () => onRemove(tag),
				"aria-label": `Remove tag ${tag}`,
				children: "×"
			})]
		}, tag))
	});
}
//#endregion
export { tagTone as i, collectTags as n, parseTags as r, TagList as t };
