import * as chrono from "chrono-node";
//#region src/utils/parseNaturalTask.js
/**
* Parse the small amount of structure that saves real typing:
* natural-language deadline, #tags, duration, reminder, and recurrence.
*/
function parseNaturalTask(input, referenceDate = /* @__PURE__ */ new Date()) {
	const matchedTokens = [];
	let workingText = String(input ?? "");
	function registerMatch(type, value, startIdx, length, text) {
		matchedTokens.push({
			type,
			value,
			text
		});
		workingText = workingText.slice(0, startIdx) + " ".repeat(length) + workingText.slice(startIdx + length);
	}
	let match;
	const tagRegex = /(?:^|\s)#(\w[\w-]*)\b/gi;
	while ((match = tagRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("tag", match[1].toLowerCase(), startIdx, text.length, text);
	}
	const durationRegex = /(?:^|\s)for\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/gi;
	while ((match = durationRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const amount = Number(match[1]);
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("duration", match[2].toLowerCase().startsWith("h") ? amount * 60 : amount, startIdx, text.length, text);
	}
	const reminderRegex = /(?:^|\s)remind\s+(?:me\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\s+before\b/gi;
	while ((match = reminderRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const amount = Number(match[1]);
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("reminder", match[2].toLowerCase().startsWith("h") ? amount * 60 : amount, startIdx, text.length, text);
	}
	const weekdays = {
		sunday: 0,
		sun: 0,
		monday: 1,
		mon: 1,
		tuesday: 2,
		tue: 2,
		tues: 2,
		wednesday: 3,
		wed: 3,
		thursday: 4,
		thu: 4,
		thur: 4,
		thurs: 4,
		friday: 5,
		fri: 5,
		saturday: 6,
		sat: 6
	};
	const recurrenceRegex = /(?:^|\s)every\s+(day|daily|weekday|weekdays|week|month|monthly|year|yearly|\d+\s+(?:days?|weeks?|months?)|(?:sun|mon|tue(?:s)?|wed|thu(?:rs?)?|fri|sat)(?:urday|nesday|rsday|urday)?(?:day)?)\b/gi;
	while ((match = recurrenceRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const raw = match[1].trim().toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		let recurrence = null;
		if (raw === "day" || raw === "daily") recurrence = { freq: "daily" };
		else if (raw === "weekday" || raw === "weekdays") recurrence = { freq: "weekdays" };
		else if (raw === "week") recurrence = {
			freq: "weekly",
			weekday: referenceDate.getDay()
		};
		else if (raw === "month" || raw === "monthly") recurrence = { freq: "monthly" };
		else if (raw === "year" || raw === "yearly") recurrence = { freq: "yearly" };
		else {
			const interval = /^(\d+)\s+(days?|weeks?|months?)$/.exec(raw);
			if (interval) {
				const amount = Number(interval[1]);
				const unit = interval[2].replace(/s$/, "");
				if (unit === "day") recurrence = {
					freq: "everyNDays",
					n: amount
				};
				if (unit === "week") recurrence = {
					freq: "everyNDays",
					n: amount * 7
				};
				if (unit === "month") recurrence = { freq: "monthly" };
			} else if (weekdays[raw] !== void 0) recurrence = {
				freq: "weekly",
				weekday: weekdays[raw]
			};
		}
		if (recurrence) registerMatch("recurrence", recurrence, startIdx, text.length, text);
	}
	const parsedDates = chrono.parse(workingText, referenceDate, { forwardDate: true });
	if (parsedDates.length > 0) {
		const dateMatch = parsedDates[0];
		let startIdx = dateMatch.index;
		let text = dateMatch.text;
		const preceding = workingText.slice(0, startIdx);
		const prepMatch = /\b(no\s+later\s+than|due\s+on|due|before|until|till|til|by)\s+$/i.exec(preceding);
		if (prepMatch) {
			startIdx -= prepMatch[0].length;
			text = workingText.slice(startIdx, dateMatch.index + dateMatch.text.length);
		}
		registerMatch("deadline", dateMatch.start.date(), startIdx, text.length, text);
	}
	return {
		title: workingText.replace(/\s+/g, " ").trim(),
		deadline: matchedTokens.find((token) => token.type === "deadline")?.value ?? null,
		reminderMinutes: matchedTokens.find((token) => token.type === "reminder")?.value ?? null,
		durationMinutes: matchedTokens.find((token) => token.type === "duration")?.value ?? null,
		recurrence: matchedTokens.find((token) => token.type === "recurrence")?.value ?? null,
		tags: matchedTokens.filter((token) => token.type === "tag").map((token) => token.value),
		matchedTokens
	};
}
//#endregion
//#region scripts/parser-tests.js
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
function toYMD(date) {
	if (!date) return null;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
var reference = new Date(2026, 7, 11);
var parsed = parseNaturalTask("Finish DB assignment tomorrow 8pm for 2h remind 30m before #university", reference);
assert(parsed.title === "Finish DB assignment", `Unexpected title: ${parsed.title}`);
assert(toYMD(parsed.deadline) === "2026-08-12", "Deadline parsing failed");
assert(parsed.durationMinutes === 120, "Duration parsing failed");
assert(parsed.reminderMinutes === 30, "Reminder parsing failed");
assert(parsed.tags.includes("university"), "Tag parsing failed");
assert(parseNaturalTask("Task for 90m", reference).durationMinutes === 90, "Minute duration failed");
assert(parseNaturalTask("Task remind 2hr before", reference).reminderMinutes === 120, "Hour reminder failed");
assert(parseNaturalTask("Water plants every weekday", reference).recurrence?.freq === "weekdays", "Weekday recurrence failed");
assert(parseNaturalTask("Review every 3 days", reference).recurrence?.n === 3, "Interval recurrence failed");
for (const phrase of [
	"before September",
	"until Friday",
	"till Monday",
	"til Friday",
	"no later than Friday",
	"by tomorrow",
	"due Monday",
	"due on Friday"
]) {
	const result = parseNaturalTask(`Finish report ${phrase}`, reference);
	assert(result.deadline, `Deadline missing for ${phrase}`);
	assert(!result.title.includes("Friday") && !result.title.includes("Monday"), `Date leaked into title for ${phrase}`);
}
var removedSyntax = parseNaturalTask("Study @deep !high plan today start Monday", reference);
assert(removedSyntax.title.includes("@deep") && removedSyntax.title.includes("!high"), "Removed tokens should remain ordinary title text");
assert(!("priority" in removedSyntax) && !("energy" in removedSyntax), "Removed parser fields survived");
assert(!("startDate" in removedSyntax) && !("planForToday" in removedSyntax), "Planning parser fields survived");
var empty = parseNaturalTask("", reference);
assert(empty.title === "" && empty.deadline === null && empty.tags.length === 0, "Empty input failed");
assert(parseNaturalTask("Call Ali on xyzzy", reference).title.length > 0, "Malformed phrase crashed");
console.log("ok    reduced natural-language task syntax");
//#endregion
export {};
