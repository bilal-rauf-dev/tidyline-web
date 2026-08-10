import * as chrono from "chrono-node";
//#region src/utils/parseNaturalTask.js
/**
* Parses natural language input to extract task metadata.
* Phases 1, 2 & 3:
*
* Supported syntax (order shown is the stripping order, which prevents cross-match):
*
*  Tags            #tagname
*  Priority        !high / !medium / !low  or  p1 / p2 / p3
*  Energy          @low / @normal / @deep / @deep-focus
*  Duration        for 2h / for 45 minutes / for 45m
*  Reminder        remind me 2h before / remind 30m before
*  Recurrence      every day / every weekday / every Monday / every 2 weeks / every week
*  Start date      start Monday / start Friday / start next week
*  Plan today      plan today  (explicit 2-word form; standalone "today" is left for deadline)
*  Deadline        parsed by chrono-node from whatever text remains after the above
*  Prepositions    "due on / due / by" are absorbed into the deadline span
*
* @param {string} input
* @param {Date} [referenceDate]
* @returns {ParsedTask}
*/
function parseNaturalTask(input, referenceDate = /* @__PURE__ */ new Date()) {
	const matchedTokens = [];
	let workingText = input;
	function registerMatch(type, value, startIdx, length, text) {
		matchedTokens.push({
			type,
			value,
			text
		});
		workingText = workingText.slice(0, startIdx) + " ".repeat(length) + workingText.slice(startIdx + length);
	}
	const tagRegex = /(?:^|\s)#(\w[\w-]*)\b/gi;
	let match;
	while ((match = tagRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("tag", match[1].toLowerCase(), startIdx, text.length, text);
	}
	const bangPriorityRegex = /(?:^|\s)!(high|medium|low)\b/gi;
	while ((match = bangPriorityRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("priority", match[1].toLowerCase(), startIdx, text.length, text);
	}
	if (!matchedTokens.some((t) => t.type === "priority")) {
		const pMap = {
			p1: "high",
			p2: "medium",
			p3: "low"
		};
		const pRegex = /(?:^|\s)\b(p1|p2|p3)\b/gi;
		while ((match = pRegex.exec(workingText)) !== null) {
			const text = match[0].trim();
			const startIdx = match.index + (match[0].length - match[0].trimStart().length);
			registerMatch("priority", pMap[match[1].toLowerCase()], startIdx, text.length, text);
		}
	}
	const energyRegex = /(?:^|\s)@(low|normal|deep-focus|deep)\b/gi;
	while ((match = energyRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("energy", match[1].toLowerCase() === "deep" ? "deep-focus" : match[1].toLowerCase(), startIdx, text.length, text);
	}
	const durationRegex = /(?:^|\s)for\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/gi;
	while ((match = durationRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const num = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("duration", unit.startsWith("h") ? num * 60 : num, startIdx, text.length, text);
	}
	const reminderRegex = /(?:^|\s)remind\s+(?:me\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\s+before\b/gi;
	while ((match = reminderRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const num = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		registerMatch("reminder", unit.startsWith("h") ? num * 60 : num, startIdx, text.length, text);
	}
	const WEEKDAY_MAP = {
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
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		const raw = match[1].trim().toLowerCase();
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
			const nMatch = /^(\d+)\s+(days?|weeks?|months?)$/.exec(raw);
			if (nMatch) {
				const n = parseInt(nMatch[1], 10);
				const unit = nMatch[2].replace(/s$/, "");
				if (unit === "day") recurrence = {
					freq: "everyNDays",
					n
				};
				else if (unit === "week") recurrence = n === 1 ? {
					freq: "weekly",
					weekday: referenceDate.getDay()
				} : {
					freq: "everyNDays",
					n: n * 7
				};
				else if (unit === "month") recurrence = { freq: "monthly" };
			} else {
				const wdKey = raw.toLowerCase();
				if (WEEKDAY_MAP[wdKey] !== void 0) recurrence = {
					freq: "weekly",
					weekday: WEEKDAY_MAP[wdKey]
				};
			}
		}
		if (recurrence) registerMatch("recurrence", recurrence, startIdx, text.length, text);
	}
	const startDateRegex = new RegExp(`(?:^|\\s)start\\s+(next\\s+\\w+|this\\s+\\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|tomorrow|today|weekend)`, "gi");
	while ((match = startDateRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		const startIdx = match.index + (match[0].length - match[0].trimStart().length);
		const datePart = match[1].trim();
		const parsedStart = chrono.parse(datePart, referenceDate, { forwardDate: true });
		if (parsedStart.length > 0) registerMatch("startDate", parsedStart[0].start.date(), startIdx, text.length, text);
	}
	const planTodayRegex = /(?:^|\s)(plan today)\b/gi;
	while ((match = planTodayRegex.exec(workingText)) !== null) {
		const text = match[0].trim();
		registerMatch("planForToday", true, match.index + (match[0].length - match[0].trimStart().length), text.length, text);
	}
	const parsedDates = chrono.parse(workingText, referenceDate, { forwardDate: true });
	if (parsedDates.length > 0) {
		const dateMatch = parsedDates[0];
		let startIdx = dateMatch.index;
		let text = dateMatch.text;
		const preceding = workingText.slice(0, startIdx);
		const prepMatch = /\b(due\s+on|due|by)\s+$/i.exec(preceding);
		if (prepMatch) {
			const prepLen = prepMatch[0].length;
			startIdx -= prepLen;
			text = workingText.slice(startIdx, startIdx + prepLen + text.length);
		}
		registerMatch("deadline", dateMatch.start.date(), startIdx, text.length, text);
	}
	return {
		title: workingText.replace(/\s+/g, " ").trim(),
		deadline: matchedTokens.find((t) => t.type === "deadline")?.value ?? null,
		startDate: matchedTokens.find((t) => t.type === "startDate")?.value ?? null,
		reminderMinutes: matchedTokens.find((t) => t.type === "reminder")?.value ?? null,
		durationMinutes: matchedTokens.find((t) => t.type === "duration")?.value ?? null,
		recurrence: matchedTokens.find((t) => t.type === "recurrence")?.value ?? null,
		priority: matchedTokens.find((t) => t.type === "priority")?.value ?? null,
		energy: matchedTokens.find((t) => t.type === "energy")?.value ?? null,
		tags: matchedTokens.filter((t) => t.type === "tag").map((t) => t.value),
		planForToday: matchedTokens.some((t) => t.type === "planForToday"),
		matchedTokens
	};
}
//#endregion
//#region scripts/parser-tests.js
/**
* Parser unit tests for parseNaturalTask.
* Covers the required scenarios from the spec plus edge/failure cases.
* Run via: npm run parser-tests
*/
function assert(condition, message) {
	if (!condition) throw new Error(message);
}
function toYMD(date) {
	if (!date) return null;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
var REF = new Date(2026, 7, 11);
var passed = 0;
var failed = 0;
function test(description, fn) {
	try {
		fn();
		console.log(`ok    ${description}`);
		passed++;
	} catch (err) {
		console.error(`FAIL  ${description} — ${err.message}`);
		failed++;
	}
}
test("Submit report tomorrow at 5pm", () => {
	const r = parseNaturalTask("Submit report tomorrow at 5pm", REF);
	assert(r.title === "Submit report", `title: ${JSON.stringify(r.title)}`);
	assert(r.deadline !== null, "deadline should be parsed");
	assert(toYMD(r.deadline) === "2026-08-12", `deadline: ${toYMD(r.deadline)}`);
	assert(r.tags.length === 0, "no tags expected");
});
test("Gym every weekday at 7am — title clean, no deadline", () => {
	const r = parseNaturalTask("Gym every weekday at 7am", REF);
	assert(typeof r.title === "string" && r.title.length > 0, "title non-empty");
	assert(r.priority === null, "no priority");
	assert(r.energy === null, "no energy");
});
test("Call Talha Friday remind 2h before", () => {
	const r = parseNaturalTask("Call Talha Friday remind 2h before", REF);
	assert(r.title.includes("Call Talha"), `title: ${JSON.stringify(r.title)}`);
	assert(r.deadline !== null, "deadline should be parsed");
	assert(toYMD(r.deadline) === "2026-08-14", `deadline: ${toYMD(r.deadline)}`);
	assert(r.reminderMinutes === 120, `reminderMinutes: ${r.reminderMinutes}`);
});
test("Study OS for 90m #university @deep", () => {
	const r = parseNaturalTask("Study OS for 90m #university @deep", REF);
	assert(r.title.includes("Study OS"), `title: ${JSON.stringify(r.title)}`);
	assert(r.durationMinutes === 90, `durationMinutes: ${r.durationMinutes}`);
	assert(r.tags.includes("university"), `tags: ${JSON.stringify(r.tags)}`);
	assert(r.energy === "deep-focus", `energy: ${r.energy}`);
});
test("Pay bill every month on the 5th — recurrence parsed monthly", () => {
	const r = parseNaturalTask("Pay bill every month on the 5th", REF);
	assert(typeof r.title === "string" && r.title.length > 0, `title: ${JSON.stringify(r.title)}`);
	assert(r.recurrence?.freq === "monthly", `recurrence: ${JSON.stringify(r.recurrence)}`);
});
test("Start project Monday due next Friday — start regex skips plain noun, chrono picks Monday", () => {
	const r = parseNaturalTask("Start project Monday due next Friday", REF);
	assert(typeof r.title === "string", "title present");
	assert(r.deadline !== null, "deadline parsed");
	assert(toYMD(r.deadline) === "2026-08-17", `deadline: ${toYMD(r.deadline)}`);
});
test("Priority !high stripped from title", () => {
	const r = parseNaturalTask("Fix bug tomorrow !high", REF);
	assert(r.priority === "high", `priority: ${r.priority}`);
	assert(!r.title.includes("!high"), `title still contains !high: ${r.title}`);
	assert(r.deadline !== null, "deadline parsed alongside priority");
});
test("Priority p1 mapped to high", () => {
	const r = parseNaturalTask("Urgent task p1 tomorrow", REF);
	assert(r.priority === "high", `priority: ${r.priority}`);
});
test("Priority !medium and !low", () => {
	assert(parseNaturalTask("Task !medium", REF).priority === "medium", "!medium");
	assert(parseNaturalTask("Task !low", REF).priority === "low", "!low");
	assert(parseNaturalTask("Task p2", REF).priority === "medium", "p2");
	assert(parseNaturalTask("Task p3", REF).priority === "low", "p3");
});
test("Energy @deep maps to deep-focus", () => {
	assert(parseNaturalTask("Task @deep", REF).energy === "deep-focus", "@deep → deep-focus");
	assert(parseNaturalTask("Task @deep-focus", REF).energy === "deep-focus", "@deep-focus");
	assert(parseNaturalTask("Task @normal", REF).energy === "normal", "@normal");
	assert(parseNaturalTask("Task @low", REF).energy === "low", "@low");
});
test("tomorrow !high — deadline boundary not confused by priority", () => {
	const r = parseNaturalTask("Finish work tomorrow !high", REF);
	assert(toYMD(r.deadline) === "2026-08-12", `deadline: ${toYMD(r.deadline)}`);
	assert(r.priority === "high", `priority: ${r.priority}`);
	assert(r.title === "Finish work", `title: ${JSON.stringify(r.title)}`);
});
test("for 2h remind 30m before — no cross-match", () => {
	const r = parseNaturalTask("Write essay for 2h remind 30m before", REF);
	assert(r.durationMinutes === 120, `duration: ${r.durationMinutes}`);
	assert(r.reminderMinutes === 30, `reminder: ${r.reminderMinutes}`);
	assert(r.durationMinutes !== 30, "duration should be 120 not 30");
	assert(r.reminderMinutes !== 120, "reminder should be 30 not 120");
});
test("Full complex: Finish DB assignment tomorrow 8pm for 2h remind 30m before !high @deep #university", () => {
	const r = parseNaturalTask("Finish DB assignment tomorrow 8pm for 2h remind 30m before !high @deep #university", REF);
	assert(r.title === "Finish DB assignment", `title: ${JSON.stringify(r.title)}`);
	assert(toYMD(r.deadline) === "2026-08-12", `deadline: ${toYMD(r.deadline)}`);
	assert(r.durationMinutes === 120, `duration: ${r.durationMinutes}`);
	assert(r.reminderMinutes === 30, `reminder: ${r.reminderMinutes}`);
	assert(r.priority === "high", `priority: ${r.priority}`);
	assert(r.energy === "deep-focus", `energy: ${r.energy}`);
	assert(r.tags.includes("university"), `tags: ${JSON.stringify(r.tags)}`);
});
test("\"plan today\" explicit form sets planForToday", () => {
	const r = parseNaturalTask("Check emails plan today", REF);
	assert(r.planForToday === true, `planForToday: ${r.planForToday}`);
	assert(!r.title.includes("plan today"), `title still contains plan today: ${r.title}`);
	assert(r.deadline === null, "plan today does not set a deadline");
});
test("\"today\" alone acts as a deadline (not planForToday)", () => {
	const r = parseNaturalTask("Call doctor today", REF);
	assert(r.deadline !== null, "standalone today should set deadline");
	assert(r.planForToday === false, "standalone today should not set planForToday");
});
test("Empty input — no crash, empty title, all fields null/empty", () => {
	const r = parseNaturalTask("", REF);
	assert(r.title === "", `title: ${JSON.stringify(r.title)}`);
	assert(r.deadline === null, "no deadline");
	assert(r.tags.length === 0, "no tags");
	assert(r.priority === null, "no priority");
	assert(r.energy === null, "no energy");
	assert(r.durationMinutes === null, "no duration");
	assert(r.reminderMinutes === null, "no reminder");
});
test("Malformed date phrase — no crash", () => {
	assert(typeof parseNaturalTask("Call Ali on xyzzy", REF).title === "string", "title is string");
});
test("Conflicting priority tokens — first one wins, no crash", () => {
	const r = parseNaturalTask("Task !high !low", REF);
	assert(r.priority !== null, "some priority parsed");
	assert(r.priority === "high", `expected high, got: ${r.priority}`);
});
test("Reminder without deadline — parsed correctly, no crash", () => {
	const r = parseNaturalTask("Check in remind 1h before", REF);
	assert(r.reminderMinutes === 60, `reminderMinutes: ${r.reminderMinutes}`);
	assert(r.deadline === null, "no deadline in this input");
});
test("Duration of zero — parsed as 0, not null", () => {
	const r = parseNaturalTask("Task for 0m", REF);
	assert(r.durationMinutes === 0, `durationMinutes: ${r.durationMinutes}`);
});
test("Incomplete \"remind\" phrase — stays in title, no crash", () => {
	const r = parseNaturalTask("remind", REF);
	assert(r.reminderMinutes === null, "incomplete remind phrase → null");
	assert(r.title.includes("remind"), "incomplete phrase stays in title");
});
test("Duration unit variants (h, hr, hrs, hour, hours)", () => {
	assert(parseNaturalTask("Task for 1h", REF).durationMinutes === 60, "h");
	assert(parseNaturalTask("Task for 1hr", REF).durationMinutes === 60, "hr");
	assert(parseNaturalTask("Task for 1hrs", REF).durationMinutes === 60, "hrs");
	assert(parseNaturalTask("Task for 1hour", REF).durationMinutes === 60, "hour");
	assert(parseNaturalTask("Task for 1hours", REF).durationMinutes === 60, "hours");
});
test("Duration unit variants (m, min, mins, minutes)", () => {
	assert(parseNaturalTask("Task for 30m", REF).durationMinutes === 30, "m");
	assert(parseNaturalTask("Task for 30min", REF).durationMinutes === 30, "min");
	assert(parseNaturalTask("Task for 30mins", REF).durationMinutes === 30, "mins");
	assert(parseNaturalTask("Task for 30minutes", REF).durationMinutes === 30, "minutes");
});
test("Reminder unit variants (m, min, h, hr)", () => {
	assert(parseNaturalTask("Task remind 30m before", REF).reminderMinutes === 30, "m");
	assert(parseNaturalTask("Task remind 30min before", REF).reminderMinutes === 30, "min");
	assert(parseNaturalTask("Task remind 1h before", REF).reminderMinutes === 60, "h");
	assert(parseNaturalTask("Task remind 2hr before", REF).reminderMinutes === 120, "hr");
});
test("every day → daily", () => {
	assert(parseNaturalTask("Water plants every day", REF).recurrence?.freq === "daily", "daily");
});
test("every weekday → weekdays", () => {
	const r = parseNaturalTask("Stand-up every weekday", REF);
	assert(r.recurrence?.freq === "weekdays", `freq: ${r.recurrence?.freq}`);
	assert(!r.title.includes("every weekday"), `title: ${r.title}`);
});
test("every Monday → weekly weekday 1", () => {
	const r = parseNaturalTask("Team meeting every Monday", REF);
	assert(r.recurrence?.freq === "weekly", `freq: ${r.recurrence?.freq}`);
	assert(r.recurrence?.weekday === 1, `weekday: ${r.recurrence?.weekday}`);
});
test("every 2 weeks → everyNDays 14", () => {
	const r = parseNaturalTask("Review budget every 2 weeks", REF);
	assert(r.recurrence?.freq === "everyNDays", `freq: ${r.recurrence?.freq}`);
	assert(r.recurrence?.n === 14, `n: ${r.recurrence?.n}`);
});
test("every month → monthly", () => {
	const r = parseNaturalTask("Pay rent every month", REF);
	assert(r.recurrence?.freq === "monthly", `freq: ${r.recurrence?.freq}`);
});
test("every 3 days → everyNDays 3", () => {
	const r = parseNaturalTask("Water cactus every 3 days", REF);
	assert(r.recurrence?.freq === "everyNDays", `freq: ${r.recurrence?.freq}`);
	assert(r.recurrence?.n === 3, `n: ${r.recurrence?.n}`);
});
test("recurrence stripped from title", () => {
	const r = parseNaturalTask("Check email every weekday", REF);
	assert(r.title === "Check email", `title: ${JSON.stringify(r.title)}`);
});
test("recurrence + deadline coexist cleanly", () => {
	const r = parseNaturalTask("Gym every Monday by next Friday", REF);
	assert(r.recurrence?.freq === "weekly", "recurrence parsed");
	assert(r.deadline !== null, "deadline parsed");
	assert(r.title === "Gym", `title: ${JSON.stringify(r.title)}`);
});
test("start Monday → startDate next Monday", () => {
	const r = parseNaturalTask("Project start Monday", REF);
	assert(r.startDate !== null, "startDate parsed");
	assert(toYMD(r.startDate) === "2026-08-17", `startDate: ${toYMD(r.startDate)}`);
	assert(r.title === "Project", `title: ${JSON.stringify(r.title)}`);
});
test("start Friday → startDate next Friday", () => {
	const r = parseNaturalTask("Start project start Friday", REF);
	assert(r.startDate !== null, "startDate parsed");
	assert(toYMD(r.startDate) === "2026-08-14", `startDate: ${toYMD(r.startDate)}`);
});
test("startDate stripped from title", () => {
	const r = parseNaturalTask("Task start Monday due next Friday", REF);
	assert(r.startDate !== null, "startDate present");
	assert(r.deadline !== null, "deadline present");
	assert(r.title === "Task", `title: ${JSON.stringify(r.title)}`);
});
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
//#endregion
export {};
