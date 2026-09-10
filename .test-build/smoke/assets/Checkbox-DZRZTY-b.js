import { s as CheckIcon } from "./icons-BWrl8Kfc.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/Checkbox.jsx
function Checkbox({ className = "", ...props }) {
	const classes = ["custom-checkbox", className].filter(Boolean).join(" ");
	return /* @__PURE__ */ jsxs("span", {
		className: classes,
		children: [/* @__PURE__ */ jsx("input", {
			type: "checkbox",
			...props
		}), /* @__PURE__ */ jsx("span", {
			className: "custom-checkbox-mark",
			"aria-hidden": "true",
			children: /* @__PURE__ */ jsx(CheckIcon, {})
		})]
	});
}
//#endregion
export { Checkbox as t };
