import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

async function getCurrentWorkspaceId() {
	const { userId } = await auth();
	if (!userId) return null;

	const user = await db.user.findUnique({
		where: { clerkUserId: userId },
		include: {
			memberships: true,
		},
	});

	return user?.memberships?.[0]?.workspaceId || null;
}

function getDateBoundaries() {
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);

	const tomorrowStart = new Date(todayStart);
	tomorrowStart.setDate(tomorrowStart.getDate() + 1);

	const soonLimit = new Date(todayStart);
	soonLimit.setDate(soonLimit.getDate() + 7);

	return {
		todayStart,
		tomorrowStart,
		soonLimit,
	};
}

function buildRemindersWhere({
	workspaceId,
	search = "",
	status = "All",
	type = "All",
	timing = "All",
}) {
	const trimmedSearch = search.trim();
	const { todayStart, tomorrowStart, soonLimit } = getDateBoundaries();

	const where = {
		workspaceId,
		...(status && status !== "All" ? { status } : {}),
		...(type && type !== "All" ? { type } : {}),
	};

	if (trimmedSearch) {
		where.OR = [
			{
				title: {
					contains: trimmedSearch,
					mode: "insensitive",
				},
			},
			{
				notes: {
					contains: trimmedSearch,
					mode: "insensitive",
				},
			},
			{
				customer: {
					is: {
						OR: [
							{
								firstName: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								lastName: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								companyName: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
						],
					},
				},
			},
			{
				vehicle: {
					is: {
						OR: [
							{
								registration: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								make: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								model: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
						],
					},
				},
			},
		];
	}

	if (timing === "OVERDUE") {
		where.status = "OPEN";
		where.dueAt = {
			lt: todayStart,
		};
	}

	if (timing === "TODAY") {
		where.status = "OPEN";
		where.dueAt = {
			gte: todayStart,
			lt: tomorrowStart,
		};
	}

	if (timing === "SOON") {
		where.status = "OPEN";
		where.dueAt = {
			gte: tomorrowStart,
			lte: soonLimit,
		};
	}

	if (timing === "UPCOMING") {
		where.status = "OPEN";
		where.dueAt = {
			gt: soonLimit,
		};
	}

	if (timing === "COMPLETED") {
		where.status = "COMPLETED";
	}

	return where;
}

function serializeReminders(reminders) {
	return reminders.map((reminder) => ({
		...reminder,
		dueAt: reminder.dueAt?.toISOString() || null,
		completedAt: reminder.completedAt?.toISOString() || null,
		createdAt: reminder.createdAt?.toISOString() || null,
		updatedAt: reminder.updatedAt?.toISOString() || null,
	}));
}

export async function getRemindersListPage({
	search = "",
	status = "All",
	type = "All",
	timing = "All",
	page = 1,
	pageSize = 10,
}) {
	const workspaceId = await getCurrentWorkspaceId();

	if (!workspaceId) {
		return {
			reminders: [],
			totalCount: 0,
			stats: {
				total: 0,
				open: 0,
				completed: 0,
				overdue: 0,
				dueSoon: 0,
			},
		};
	}

	const safePage = Math.max(1, Number(page) || 1);
	const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
	const skip = (safePage - 1) * safePageSize;

	const where = buildRemindersWhere({
		workspaceId,
		search,
		status,
		type,
		timing,
	});

	const { todayStart, soonLimit } = getDateBoundaries();

	const [reminders, totalCount, total, open, completed, overdue, dueSoon] =
		await Promise.all([
			db.reminder.findMany({
				where,
				orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
				skip,
				take: safePageSize,
				select: {
					id: true,
					title: true,
					type: true,
					status: true,
					dueAt: true,
					completedAt: true,
					notes: true,
					createdAt: true,
					updatedAt: true,
					customer: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							companyName: true,
						},
					},
					vehicle: {
						select: {
							id: true,
							registration: true,
							make: true,
							model: true,
						},
					},
					createdByUser: {
						select: {
							id: true,
							fullName: true,
							email: true,
						},
					},
				},
			}),
			db.reminder.count({ where }),
			db.reminder.count({
				where: {
					workspaceId,
				},
			}),
			db.reminder.count({
				where: {
					workspaceId,
					status: "OPEN",
				},
			}),
			db.reminder.count({
				where: {
					workspaceId,
					status: "COMPLETED",
				},
			}),
			db.reminder.count({
				where: {
					workspaceId,
					status: "OPEN",
					dueAt: {
						lt: todayStart,
					},
				},
			}),
			db.reminder.count({
				where: {
					workspaceId,
					status: "OPEN",
					dueAt: {
						gte: todayStart,
						lte: soonLimit,
					},
				},
			}),
		]);

	return {
		reminders: serializeReminders(reminders),
		totalCount,
		stats: {
			total,
			open,
			completed,
			overdue,
			dueSoon,
		},
	};
}
