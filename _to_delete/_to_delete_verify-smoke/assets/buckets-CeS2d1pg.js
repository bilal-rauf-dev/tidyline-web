import { t as daysUntil } from "./dates-OcvPtNgq.js";
import { a as isTaskUpcoming, i as isTaskPlannedForToday } from "./taskFields-B8eA_8sb.js";
//#region src/utils/buckets.js
var BUCKET_ORDER = [
	"today",
	"week",
	"twoWeeks",
	"month",
	"quarter",
	"year",
	"later"
];
var REQUIRED_BUCKETS = ["today", "later"];
var BUCKET_LABELS = {
	today: "Today",
	week: "Week",
	twoWeeks: "2 Weeks",
	month: "Month",
	quarter: "Quarter",
	year: "Year",
	later: "Later"
};
var BUCKET_END_DAYS = {
	today: 0,
	week: 7,
	twoWeeks: 14,
	month: 30,
	quarter: 90,
	year: 365,
	later: Number.POSITIVE_INFINITY
};
function normalizeBucketOrder(bucketOrder = BUCKET_ORDER) {
	const requested = new Set(Array.isArray(bucketOrder) ? bucketOrder : []);
	REQUIRED_BUCKETS.forEach((bucket) => requested.add(bucket));
	return BUCKET_ORDER.filter((bucket) => requested.has(bucket));
}
function deadlineForBucket(bucketKey, referenceDate = /* @__PURE__ */ new Date(), bucketOrder = BUCKET_ORDER) {
	const activeBuckets = normalizeBucketOrder(bucketOrder);
	const index = activeBuckets.indexOf(bucketKey);
	const previousBucket = index > 0 ? activeBuckets[index - 1] : null;
	const offset = previousBucket ? BUCKET_END_DAYS[previousBucket] + 1 : 0;
	const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + offset);
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}
function getTaskBucket(deadline, referenceDate = /* @__PURE__ */ new Date(), bucketOrder = BUCKET_ORDER) {
	const daysUntilDeadline = daysUntil(deadline, referenceDate);
	const activeBuckets = normalizeBucketOrder(bucketOrder);
	if (daysUntilDeadline <= 0) return "today";
	return activeBuckets.find((bucket) => bucket !== "today" && daysUntilDeadline <= BUCKET_END_DAYS[bucket]) ?? "later";
}
var byDeadline = (a, b) => a.deadline.localeCompare(b.deadline);
/**
* Group tasks into buckets. Within a bucket the order is always
* pinned first, then not-done before done, then the supplied comparator.
*/
function groupTasksByBucket(tasks, referenceDate = /* @__PURE__ */ new Date(), comparator = byDeadline, bucketOrder = BUCKET_ORDER, { includeUpcoming = false } = {}) {
	const activeBuckets = normalizeBucketOrder(bucketOrder);
	const grouped = Object.fromEntries(activeBuckets.map((bucket) => [bucket, []]));
	tasks.forEach((task) => {
		if (!task.deadline) return;
		if (!includeUpcoming && isTaskUpcoming(task, referenceDate)) return;
		const bucket = isTaskPlannedForToday(task, referenceDate) ? "today" : getTaskBucket(task.deadline, referenceDate, activeBuckets);
		grouped[bucket].push(task);
	});
	activeBuckets.forEach((bucket) => {
		grouped[bucket].sort((a, b) => {
			if (Boolean(a.pinned) !== Boolean(b.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
			if (a.done !== b.done) return Number(a.done) - Number(b.done);
			return comparator(a, b);
		});
	});
	return grouped;
}
//#endregion
export { groupTasksByBucket as a, deadlineForBucket as i, BUCKET_ORDER as n, normalizeBucketOrder as o, REQUIRED_BUCKETS as r, BUCKET_LABELS as t };
