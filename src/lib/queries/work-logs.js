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

function buildWorkLogsWhere({
	workspaceId,
	search = "",
	performedBy = "All",
	customerId = "",
	vehicleId = "",
}) {
	const trimmedSearch = search.trim();

	const where = {
		workspaceId,
		...(customerId ? { customerId } : {}),
		...(vehicleId ? { vehicleId } : {}),
		...(performedBy && performedBy !== "All"
			? { performedByUserId: performedBy }
			: {}),
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
				description: {
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
			{
				performedByUser: {
					is: {
						OR: [
							{
								fullName: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								email: {
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

	return where;
}

function serializeWorkLogs(workLogs) {
	return workLogs.map((workLog) => ({
		...workLog,
		completedAt: workLog.completedAt?.toISOString() || null,
		nextServiceDueAt: workLog.nextServiceDueAt?.toISOString() || null,
		createdAt: workLog.createdAt?.toISOString() || null,
		updatedAt: workLog.updatedAt?.toISOString() || null,
		labourCharge: workLog.labourCharge?.toString() || "0",
		partsCharge: workLog.partsCharge?.toString() || "0",
		totalCharge: workLog.totalCharge?.toString() || "0",
	}));
}

export async function getWorkLogsListPage({
	search = "",
	performedBy = "All",
	customerId = "",
	vehicleId = "",
	page = 1,
	pageSize = 10,
}) {
	const workspaceId = await getCurrentWorkspaceId();

	if (!workspaceId) {
		return {
			workLogs: [],
			totalCount: 0,
			stats: {
				totalLogs: 0,
				logsThisMonth: 0,
				labourTotal: 0,
				partsTotal: 0,
				billedTotal: 0,
			},
			staffOptions: [],
		};
	}

	const safePage = Math.max(1, Number(page) || 1);
	const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
	const skip = (safePage - 1) * safePageSize;

	const baseWhere = {
		workspaceId,
		...(customerId ? { customerId } : {}),
		...(vehicleId ? { vehicleId } : {}),
	};

	const where = buildWorkLogsWhere({
		workspaceId,
		search,
		performedBy,
		customerId,
		vehicleId,
	});

	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const [workLogs, totalCount, totalLogs, logsThisMonth, totals, members] =
		await Promise.all([
			db.workLog.findMany({
				where,
				orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
				skip,
				take: safePageSize,
				select: {
					id: true,
					title: true,
					description: true,
					completedAt: true,
					odometerValue: true,
					odometerUnit: true,
					labourCharge: true,
					partsCharge: true,
					totalCharge: true,
					notes: true,
					nextServiceDueAt: true,
					nextServiceOdometer: true,
					nextServiceOdometerUnit: true,
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
					performedByUser: {
						select: {
							id: true,
							fullName: true,
							email: true,
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
			db.workLog.count({ where }),
			db.workLog.count({ where: baseWhere }),
			db.workLog.count({
				where: {
					...baseWhere,
					completedAt: {
						gte: monthStart,
						lt: nextMonthStart,
					},
				},
			}),
			db.workLog.aggregate({
				where: baseWhere,
				_sum: {
					labourCharge: true,
					partsCharge: true,
					totalCharge: true,
				},
			}),
			db.workspaceMember.findMany({
				where: {
					workspaceId,
				},
				select: {
					user: {
						select: {
							id: true,
							fullName: true,
							email: true,
						},
					},
				},
				orderBy: {
					createdAt: "asc",
				},
			}),
		]);

	const staffOptions = members
		.map((member) => member.user)
		.filter(Boolean)
		.map((user) => ({
			id: user.id,
			label: user.fullName || user.email || "Unknown",
		}));

	return {
		workLogs: serializeWorkLogs(workLogs),
		totalCount,
		stats: {
			totalLogs,
			logsThisMonth,
			labourTotal: Number(totals._sum.labourCharge || 0),
			partsTotal: Number(totals._sum.partsCharge || 0),
			billedTotal: Number(totals._sum.totalCharge || 0),
		},
		staffOptions,
	};
}
