import { O as PlusIcon, _ as GoogleIcon, x as LogOutIcon } from "./icons-98MzWrNh.js";
import { a as getCountdownLabel, o as getDeadlineParts, p as toDateStr, r as formatDate } from "./dates-OcvPtNgq.js";
import { a as isTaskUpcoming, i as isTaskPlannedForToday } from "./taskFields-B8eA_8sb.js";
import { a as getActivityHeatmap, c as getCompletionHistory, f as summarizeHeatmap, i as RingStat, l as getCompletionStat, n as ActivityGrid, r as MilestoneBar, t as Sparkline } from "./Sparkline-CAuimBQM.js";
import { t as TagList } from "./TagList-QBt6i8xH.js";
import { n as isOverdue } from "./overdue-B7EOC0S3.js";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@supabase/supabase-js";
//#region src/utils/timeline.js
var DAY_START = 360;
var DAY_END = 1320;
var TIMELINE_TICKS = [
	6,
	9,
	12,
	15,
	18,
	21
];
function toPercent(minutes) {
	return (minutes - DAY_START) / 960 * 100;
}
function durationMinutes(task) {
	if (!task.duration) return 30;
	return task.duration.unit === "hr" ? task.duration.value * 60 : task.duration.value;
}
/**
* Today's Day Planner blocks placed on its 06:00–22:00 axis. This deliberately
* reads scheduledStart rather than reminders: Home is a compact view of the
* plan someone actively placed in the planner, not a second reminder list.
*/
function getTodayTimeline(tasks) {
	const now = /* @__PURE__ */ new Date();
	const todayStr = toDateStr(now);
	const items = tasks.filter((task) => task.scheduledStart?.slice(0, 10) === todayStr && !task.done && !task.archived && task.status !== "waiting").map((task) => {
		const time = task.scheduledStart.slice(11, 16);
		const [hour, minute] = time.split(":").map(Number);
		const minutes = hour * 60 + minute;
		const duration = durationMinutes(task);
		const visibleStart = Math.max(DAY_START, Math.min(DAY_END, minutes));
		const visibleEnd = Math.max(visibleStart + 15, Math.min(DAY_END, minutes + duration));
		return {
			key: task.id,
			title: task.title,
			minutes,
			duration,
			position: toPercent(visibleStart),
			width: Math.max(4, toPercent(visibleEnd) - toPercent(visibleStart)),
			time
		};
	}).filter((item) => item.minutes < DAY_END && item.minutes + item.duration > DAY_START).sort((a, b) => a.minutes - b.minutes);
	const laneEnds = [];
	items.forEach((item) => {
		const end = item.minutes + item.duration;
		let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.minutes);
		if (lane === -1) {
			lane = laneEnds.length;
			laneEnds.push(end);
		} else laneEnds[lane] = end;
		item.lane = lane;
	});
	return {
		items,
		laneCount: Math.max(1, laneEnds.length),
		nowPosition: toPercent(now.getHours() * 60 + now.getMinutes())
	};
}
//#endregion
//#region src/components/HomeDaybreak.jsx
/**
* Home-only feature illustrations. They deliberately carry no metrics; each
* variant gives a real TidyLine capability a small editorial line drawing.
*/
function HomeDaybreak({ variant = 0 }) {
	return /* @__PURE__ */ jsxs("svg", {
		className: `home-daybreak-art home-daybreak-art-${variant}`,
		viewBox: "0 0 260 190",
		role: "img",
		"aria-hidden": "true",
		children: [
			variant === 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-sun",
					d: "M88 125a49 49 0 0 1 98 0"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-horizon",
					d: "M26 142h208"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-path",
					d: "M92 164c22-20 23-43 47-54 18-8 27-22 31-44"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-ray",
					d: "M192 43h23M203.5 31.5v23M195.5 35l16 16M211.5 35l-16 16"
				}),
				/* @__PURE__ */ jsx("circle", {
					className: "daybreak-dot dot-one",
					cx: "46",
					cy: "58",
					r: "5"
				}),
				/* @__PURE__ */ jsx("circle", {
					className: "daybreak-dot dot-two",
					cx: "217",
					cy: "104",
					r: "3"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-scribble",
					d: "M35 94c18-18 33 15 51-3s32 10 47-8"
				})
			] }),
			variant === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-grid",
					d: "M38 48v92M70 48v92M102 48v92M134 48v92M166 48v92M198 48v92M230 48v92M38 48h192M38 80h192M38 112h192M38 140h192"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-chart",
					d: "M38 119c20-2 20-32 39-25 18 7 20 22 36 17 18-6 23-48 42-39 16 8 17 22 32 13 16-10 22-37 43-42"
				}),
				/* @__PURE__ */ jsx("circle", {
					className: "daybreak-chart-point",
					cx: "230",
					cy: "43",
					r: "5"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-ray",
					d: "M220 43h20M230 33v20M223 36l14 14M237 36l-14 14"
				})
			] }),
			variant === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("rect", {
					className: "daybreak-calendar",
					x: "58",
					y: "54",
					width: "142",
					height: "104",
					rx: "3"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-calendar-line",
					d: "M58 81h142M91 43v22M167 43v22"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-calendar-mark",
					d: "m88 108 13 13 23-26M141 108h39M141 128h28"
				}),
				/* @__PURE__ */ jsx("circle", {
					className: "daybreak-dot dot-one",
					cx: "40",
					cy: "57",
					r: "4"
				}),
				/* @__PURE__ */ jsx("circle", {
					className: "daybreak-dot dot-two",
					cx: "218",
					cy: "135",
					r: "4"
				}),
				/* @__PURE__ */ jsx("path", {
					className: "daybreak-ray",
					d: "M210 47h22M221 36v22M213 39l16 16M229 39l-16 16"
				})
			] })
		]
	});
}
var supabase = createClient(void 0, void 0);
//#endregion
//#region src/hooks/useAuth.js
function useAuth() {
	const [user, setUser] = useState(null);
	const [session, setSession] = useState(null);
	const [loading, setLoading] = useState(Boolean(supabase));
	useEffect(() => {
		if (!supabase) return;
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);
		}).catch((error) => {
			console.error("Error getting initial session:", error);
			setLoading(false);
		});
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);
		});
		return () => {
			subscription?.unsubscribe();
		};
	}, []);
	const signInWithGoogle = useCallback(async () => {
		if (!supabase) throw new Error("Google sign-in is unavailable: no Supabase backend is configured for this app.");
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: window.location.origin }
		});
		if (error) {
			console.error("Error signing in with Google:", error.message);
			throw error;
		}
		return data;
	}, []);
	const signOut = useCallback(async () => {
		if (!supabase) return;
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error("Error signing out:", error.message);
			throw error;
		}
	}, []);
	const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
	const email = user?.email || user?.user_metadata?.email || "";
	const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
	return {
		user,
		session,
		loading,
		isAuthenticated: Boolean(user),
		isConfigured: Boolean(supabase),
		displayName,
		email,
		avatarUrl,
		signInWithGoogle,
		signOut
	};
}
//#endregion
//#region src/pages/HomePage.jsx
var UPCOMING_LIMIT = 6;
var HOME_HEATMAP_DAYS = 35;
var HOME_FEATURES = [
	{
		title: "Plan by deadline",
		copy: "Tasks find their place automatically, so your next step stays visible."
	},
	{
		title: "Make space for focus",
		copy: "Use time blocks, reminders, and estimates to shape a day that feels doable."
	},
	{
		title: "Review and reset",
		copy: "Close the day with a clear view of what moved forward and what can wait."
	}
];
function getGreeting(date = /* @__PURE__ */ new Date()) {
	const hour = date.getHours();
	if (hour < 5) return "Good night";
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}
function HomePage({ tasks: allTasks, workspaceName = "", auth: propAuth }) {
	const fallbackAuth = useAuth();
	const auth = propAuth || fallbackAuth;
	const [featureIndex, setFeatureIndex] = useState(0);
	const greeting = useMemo(() => getGreeting(), []);
	const tasks = useMemo(() => allTasks.filter((task) => !task.archived && task.deadline), [allTasks]);
	const heatmap = useMemo(() => getActivityHeatmap(tasks, HOME_HEATMAP_DAYS), [tasks]);
	const heatmapSummary = useMemo(() => summarizeHeatmap(heatmap), [heatmap]);
	const timeline = useMemo(() => getTodayTimeline(tasks), [tasks]);
	const completion = useMemo(() => getCompletionStat(tasks), [tasks]);
	const completionHistory = useMemo(() => getCompletionHistory(tasks), [tasks]);
	const completionTrend = useMemo(() => {
		const fiveWeekHistory = getCompletionHistory(tasks, HOME_HEATMAP_DAYS);
		const weeklySeries = Array.from({ length: 5 }, (_, index) => {
			return { count: fiveWeekHistory.series.slice(index * 7, index * 7 + 7).reduce((total, point) => total + point.count, 0) };
		});
		const current = weeklySeries.at(-1)?.count ?? 0;
		const average = weeklySeries.reduce((total, week) => total + week.count, 0) / weeklySeries.length;
		return {
			weeklySeries,
			current,
			average,
			peakIndex: weeklySeries.reduce((peak, week, index) => week.count > weeklySeries[peak].count ? index : peak, 0),
			difference: current - average
		};
	}, [tasks]);
	const todayStr = toDateStr(/* @__PURE__ */ new Date());
	useEffect(() => {
		const timer = window.setInterval(() => {
			setFeatureIndex((current) => (current + 1) % HOME_FEATURES.length);
		}, 5500);
		return () => window.clearInterval(timer);
	}, []);
	const upcoming = useMemo(() => tasks.filter((task) => !task.done).filter((task) => task.deadline >= todayStr).sort((a, b) => (a.startDate ?? a.deadline).localeCompare(b.startDate ?? b.deadline) || a.deadline.localeCompare(b.deadline)).slice(0, UPCOMING_LIMIT), [tasks, todayStr]);
	const daily = useMemo(() => {
		const today = toDateStr(/* @__PURE__ */ new Date());
		const dueToday = tasks.filter((task) => !isTaskUpcoming(task) && task.status !== "waiting" && (task.deadline === today || isTaskPlannedForToday(task)));
		const overdueCount = tasks.filter((task) => isOverdue(task)).length;
		const completedToday = tasks.filter((task) => task.done && task.completedAt?.slice(0, 10) === today).length;
		const done = dueToday.filter((task) => task.done).length;
		return {
			dueToday: dueToday.length,
			overdueCount,
			completedToday,
			done
		};
	}, [tasks]);
	const headingGreeting = useMemo(() => {
		if (auth.isAuthenticated && auth.displayName) {
			const firstName = auth.displayName.trim().split(" ")[0];
			return `${greeting}, ${firstName}`;
		}
		return workspaceName ? `${greeting}` : greeting;
	}, [
		auth.isAuthenticated,
		auth.displayName,
		greeting,
		workspaceName
	]);
	return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("main", {
		className: "app-shell home-shell",
		children: /* @__PURE__ */ jsxs("section", {
			className: "home-dashboard",
			"aria-label": "Home dashboard",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "home-welcome",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", { children: headingGreeting }), /* @__PURE__ */ jsx("p", { children: "See what needs your attention, make a little progress, and leave the rest somewhere you can trust." })] }), /* @__PURE__ */ jsxs("div", {
						className: "home-actions",
						children: [/* @__PURE__ */ jsxs(Link, {
							href: "/board?add=1",
							className: "home-add-action",
							children: [/* @__PURE__ */ jsx("span", {
								className: "home-add-mark",
								"aria-hidden": "true",
								children: /* @__PURE__ */ jsx(PlusIcon, {})
							}), "Add a task"]
						}), !auth.isAuthenticated ? /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "home-google-auth-btn",
							onClick: auth.signInWithGoogle,
							"aria-label": "Sign in with Google",
							children: [/* @__PURE__ */ jsx(GoogleIcon, { size: 18 }), /* @__PURE__ */ jsx("span", { children: "Sign in with Google" })]
						}) : /* @__PURE__ */ jsxs("div", {
							className: "home-user-badge",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "home-user-avatar-wrap",
									children: auth.avatarUrl ? /* @__PURE__ */ jsx("img", {
										src: auth.avatarUrl,
										alt: auth.displayName,
										className: "home-user-avatar",
										referrerPolicy: "no-referrer"
									}) : /* @__PURE__ */ jsx("div", {
										className: "home-user-avatar-fallback",
										"aria-hidden": "true",
										children: auth.displayName.charAt(0).toUpperCase()
									})
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "home-user-meta",
									children: [/* @__PURE__ */ jsx("span", {
										className: "home-user-name",
										children: auth.displayName
									}), auth.email && /* @__PURE__ */ jsx("span", {
										className: "home-user-email",
										children: auth.email
									})]
								}),
								/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "home-signout-btn",
									onClick: auth.signOut,
									title: "Sign out",
									"aria-label": "Sign out",
									children: [/* @__PURE__ */ jsx(LogOutIcon, {}), /* @__PURE__ */ jsx("span", { children: "Sign out" })]
								})
							]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "entry-card home-timeline",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "home-card-heading",
							children: [/* @__PURE__ */ jsx("h2", { children: "Daily activity" }), /* @__PURE__ */ jsx(Link, {
								href: "/planner",
								children: "Open day planner"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "home-schedule",
							style: { "--schedule-lanes": timeline.laneCount },
							children: [/* @__PURE__ */ jsx("div", {
								className: "home-schedule-scale",
								"aria-hidden": "true",
								children: TIMELINE_TICKS.map((tick) => /* @__PURE__ */ jsxs("span", {
									style: { left: `${(tick - 6) / 16 * 100}%` },
									children: [String(tick).padStart(2, "0"), ":00"]
								}, tick))
							}), /* @__PURE__ */ jsxs("div", {
								className: "home-schedule-rail",
								children: [
									TIMELINE_TICKS.map((tick) => /* @__PURE__ */ jsx("span", {
										className: "home-schedule-tick",
										style: { left: `${(tick - 6) / 16 * 100}%` }
									}, tick)),
									timeline.items.map((item) => /* @__PURE__ */ jsxs("div", {
										className: "home-schedule-block",
										style: {
											left: `${item.position}%`,
											width: `${item.width}%`,
											top: `calc(${item.lane} * 3.05rem + 0.8rem)`
										},
										title: `${item.time} — ${item.title}`,
										children: [/* @__PURE__ */ jsx("strong", { children: item.title }), /* @__PURE__ */ jsxs("span", { children: [
											item.time,
											" · ",
											item.duration,
											" min"
										] })]
									}, item.key)),
									timeline.nowPosition >= 0 && timeline.nowPosition <= 100 && /* @__PURE__ */ jsx("span", {
										className: "home-schedule-now",
										style: { left: `${timeline.nowPosition}%` }
									})
								]
							})]
						}),
						timeline.items.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "empty",
							children: "Nothing is placed in today’s plan yet."
						}) : /* @__PURE__ */ jsxs("p", {
							className: "home-schedule-summary",
							children: [
								timeline.items.length,
								" ",
								timeline.items.length === 1 ? "task is" : "tasks are",
								" placed in today’s plan."
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "bucket-column dark home-focus",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Today at a glance" }),
						/* @__PURE__ */ jsxs("div", {
							className: "bucket-stat",
							children: [/* @__PURE__ */ jsx("strong", { children: daily.dueToday }), /* @__PURE__ */ jsx("span", { children: "due or planned today" })]
						}),
						/* @__PURE__ */ jsx(RingStat, {
							label: "Cleared",
							value: daily.done,
							total: daily.dueToday
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "home-focus-notes",
							children: [/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: daily.overdueCount }), " overdue"] }), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: daily.completedToday }), " completed today"] })]
						})
					]
				}),
				/* @__PURE__ */ jsxs("section", {
					className: "home-activity-pair",
					"aria-label": "Activity and weekly completion pace",
					children: [/* @__PURE__ */ jsxs("article", {
						className: "home-panel home-activity",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "home-card-heading",
								children: [/* @__PURE__ */ jsx("h2", { children: "Activity" }), /* @__PURE__ */ jsx("span", { children: "Last 5 weeks" })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "activity-stat",
								children: [/* @__PURE__ */ jsx("strong", { children: heatmapSummary.activeDays }), /* @__PURE__ */ jsx("span", { children: "days with completed work" })]
							}),
							/* @__PURE__ */ jsx(ActivityGrid, {
								cells: heatmap,
								label: "Task activity by day, last 5 weeks"
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "card-note",
								children: [
									heatmapSummary.overdueDays,
									" overdue ",
									heatmapSummary.overdueDays === 1 ? "day" : "days"
								]
							})
						]
					}), /* @__PURE__ */ jsxs("article", {
						className: "home-panel home-completion-trend",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "home-card-heading",
								children: [/* @__PURE__ */ jsx("h2", { children: "Weekly pace" }), /* @__PURE__ */ jsx("span", { children: "5 weeks" })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "home-trend-stat",
								children: [/* @__PURE__ */ jsx("strong", { children: completionTrend.current }), /* @__PURE__ */ jsx("span", { children: "completed this week" })]
							}),
							/* @__PURE__ */ jsx(Sparkline, {
								series: completionTrend.weeklySeries,
								peakIndex: completionTrend.peakIndex,
								height: 52
							}),
							/* @__PURE__ */ jsx("p", {
								className: "home-trend-note",
								children: completionTrend.average === 0 ? "No completed tasks in this five-week view yet." : `${Math.abs(completionTrend.difference).toFixed(1).replace(/\.0$/, "")} ${completionTrend.difference >= 0 ? "above" : "below"} your ${completionTrend.average.toFixed(1).replace(/\.0$/, "")}-task weekly average`
							})
						]
					})]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "home-panel home-daybreak",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "home-daybreak-copy home-feature-slide",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "home-feature-kicker",
									children: "TidyLine in practice"
								}),
								/* @__PURE__ */ jsx("h2", { children: HOME_FEATURES[featureIndex].title }),
								/* @__PURE__ */ jsx("p", { children: HOME_FEATURES[featureIndex].copy })
							]
						}, `feature-copy-${featureIndex}`),
						/* @__PURE__ */ jsx(HomeDaybreak, { variant: featureIndex }, `feature-art-${featureIndex}`),
						/* @__PURE__ */ jsxs("div", {
							className: "home-feature-controls",
							"aria-label": "Home feature slideshow",
							children: [
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "home-feature-arrow",
									"aria-label": "Previous feature",
									onClick: () => setFeatureIndex((current) => (current - 1 + HOME_FEATURES.length) % HOME_FEATURES.length),
									children: "‹"
								}),
								/* @__PURE__ */ jsx("div", {
									className: "home-feature-dots",
									"aria-hidden": "true",
									children: HOME_FEATURES.map((feature, index) => /* @__PURE__ */ jsx("span", { className: index === featureIndex ? "active" : "" }, feature.title))
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "home-feature-arrow",
									"aria-label": "Next feature",
									onClick: () => setFeatureIndex((current) => (current + 1) % HOME_FEATURES.length),
									children: "›"
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "accent-card home-progress",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Overall progress" }),
						/* @__PURE__ */ jsxs("div", {
							className: "home-progress-stat",
							children: [/* @__PURE__ */ jsxs("strong", { children: [completion.percent, "%"] }), /* @__PURE__ */ jsxs("span", { children: [
								completion.done,
								" of ",
								completion.total,
								" tasks complete"
							] })]
						}),
						/* @__PURE__ */ jsx(MilestoneBar, {
							percent: completion.percent,
							label: "All active tasks"
						})
					]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "entry-card home-upcoming",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "home-card-heading",
						children: [/* @__PURE__ */ jsx("h2", { children: "Coming up" }), /* @__PURE__ */ jsx(Link, {
							href: "/calendar",
							children: "Open calendar"
						})]
					}), upcoming.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "empty",
						children: "Nothing scheduled yet."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "upcoming-list",
						children: upcoming.map((task) => {
							const { day, month } = getDeadlineParts(task.deadline);
							return /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsxs("div", {
								className: "deadline-stat",
								children: [/* @__PURE__ */ jsx("strong", { children: day }), /* @__PURE__ */ jsx("span", { children: month })]
							}), /* @__PURE__ */ jsxs("div", {
								className: "upcoming-copy",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "upcoming-title",
										children: task.title
									}),
									/* @__PURE__ */ jsx("span", {
										className: "upcoming-date",
										children: isTaskUpcoming(task) ? `Starts ${formatDate(task.startDate)} · due ${formatDate(task.deadline)}` : `${formatDate(task.deadline)} · ${getCountdownLabel(task.deadline)}`
									}),
									/* @__PURE__ */ jsx(TagList, { tags: task.tags })
								]
							})] }, task.id);
						})
					})]
				}),
				/* @__PURE__ */ jsxs("article", {
					className: "entry-card home-completion",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Completion rhythm" }),
						/* @__PURE__ */ jsx("p", {
							className: "card-note",
							children: "Actual completions over the last 14 days"
						}),
						/* @__PURE__ */ jsx(Sparkline, {
							series: completionHistory.series,
							peakIndex: completionHistory.peakIndex
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "home-completion-stat",
							children: [/* @__PURE__ */ jsx("strong", { children: completionHistory.total }), /* @__PURE__ */ jsxs("span", { children: [
								"completed · peak ",
								completionHistory.peakCount,
								" on ",
								formatDate(completionHistory.peakDate)
							] })]
						})
					]
				})
			]
		})
	}) });
}
//#endregion
export { useAuth as n, HomePage as t };
