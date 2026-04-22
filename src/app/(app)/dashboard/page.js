import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import DashboardPageView from "@/components/dashboard/DashboardPageView";

export const dynamic = "force-dynamic";

function startOfToday() {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	return now;
}

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export default async function DashboardPage() {
	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	if (!workspaceId) {
		return null;
	}

	const today = startOfToday();
	const dueSoonLimit = addDays(today, 7);

	const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
	const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

	const workspace = await db.workspace.findUnique({
		where: {
			id: workspaceId,
		},
		include: {
			settings: true,
		},
	});

	const settings = {
		compactLayout: workspace?.settings?.compactLayout ?? true,
		showWelcomeTips: workspace?.settings?.showWelcomeTips ?? true,

		showQuickAddVehicle: workspace?.settings?.showQuickAddVehicle ?? true,
		showQuickAddCustomer: workspace?.settings?.showQuickAddCustomer ?? true,
		showQuickAddReminder: workspace?.settings?.showQuickAddReminder ?? true,
		showQuickUploadDoc: workspace?.settings?.showQuickUploadDoc ?? false,
		showQuickAddWorkLog: workspace?.settings?.showQuickAddWorkLog ?? true,

		showWidgetOverdue: workspace?.settings?.showWidgetOverdue ?? true,
		showWidgetDueSoon: workspace?.settings?.showWidgetDueSoon ?? true,
		showWidgetRecent: workspace?.settings?.showWidgetRecent ?? true,
		showWidgetStatus: workspace?.settings?.showWidgetStatus ?? false,
		showWidgetRecentWorkLogs: workspace?.settings?.showWidgetWorkLogs ?? true,
	};

	const [
		customersCount,
		vehiclesCount,
		documentsCount,
		openRemindersCount,
		workLogsThisMonthCount,
		activeVehiclesCount,
		soldVehiclesCount,
		archivedVehiclesCount,
		overdueReminders,
		dueSoonReminders,
		recentWorkLogs,
		recentDocuments,
		recentReminders,
	] = await Promise.all([
		db.customer.count({
			where: { workspaceId },
		}),
		db.vehicle.count({
			where: { workspaceId },
		}),
		db.document.count({
			where: { workspaceId },
		}),
		db.reminder.count({
			where: {
				workspaceId,
				status: "OPEN",
			},
		}),
		db.workLog.count({
			where: {
				workspaceId,
				completedAt: {
					gte: monthStart,
					lt: nextMonthStart,
				},
			},
		}),
		db.vehicle.count({
			where: {
				workspaceId,
				status: "ACTIVE",
			},
		}),
		db.vehicle.count({
			where: {
				workspaceId,
				status: "SOLD",
			},
		}),
		db.vehicle.count({
			where: {
				workspaceId,
				status: "ARCHIVED",
			},
		}),
		db.reminder.findMany({
			where: {
				workspaceId,
				status: "OPEN",
				dueAt: {
					lt: today,
				},
			},
			include: {
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
			},
			orderBy: {
				dueAt: "asc",
			},
			take: 5,
		}),
		db.reminder.findMany({
			where: {
				workspaceId,
				status: "OPEN",
				dueAt: {
					gte: today,
					lte: dueSoonLimit,
				},
			},
			include: {
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
			},
			orderBy: {
				dueAt: "asc",
			},
			take: 5,
		}),
		db.workLog.findMany({
			where: {
				workspaceId,
			},
			include: {
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
			},
			orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
			take: 5,
		}),
		db.document.findMany({
			where: {
				workspaceId,
			},
			include: {
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
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 5,
		}),
		db.reminder.findMany({
			where: {
				workspaceId,
			},
			include: {
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
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 5,
		}),
	]);

	const recentActivity = [
		...recentWorkLogs.map((item) => ({
			id: `work-log-${item.id}`,
			type: "work_log",
			title: item.title,
			date: item.completedAt || item.createdAt,
			href: `/work-logs/${item.id}`,
			meta: item.vehicle
				? `${item.vehicle.registration} · ${item.vehicle.make} ${item.vehicle.model}`
				: item.customer?.companyName ||
					`${item.customer?.firstName || ""} ${item.customer?.lastName || ""}`.trim() ||
					"No linked record",
		})),
		...recentDocuments.map((item) => ({
			id: `document-${item.id}`,
			type: "document",
			title: item.title,
			date: item.createdAt,
			href: `/documents/${item.id}`,
			meta: item.vehicle
				? `${item.vehicle.registration} · ${item.vehicle.make} ${item.vehicle.model}`
				: item.customer?.companyName ||
					`${item.customer?.firstName || ""} ${item.customer?.lastName || ""}`.trim() ||
					"No linked record",
		})),
		...recentReminders.map((item) => ({
			id: `reminder-${item.id}`,
			type: "reminder",
			title: item.title,
			date: item.createdAt,
			href: `/reminders/${item.id}`,
			meta: item.vehicle
				? `${item.vehicle.registration} · ${item.vehicle.make} ${item.vehicle.model}`
				: item.customer?.companyName ||
					`${item.customer?.firstName || ""} ${item.customer?.lastName || ""}`.trim() ||
					"No linked record",
		})),
	]
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 8);

	const dashboardData = {
		workspaceName: workspace?.name || "Your workspace",
		settings,
		kpis: {
			customersCount,
			vehiclesCount,
			documentsCount,
			openRemindersCount,
			workLogsThisMonthCount,
		},
		vehicleStatus: {
			active: activeVehiclesCount,
			sold: soldVehiclesCount,
			archived: archivedVehiclesCount,
		},
		overdueReminders: overdueReminders.map((item) => ({
			...item,
			dueAt: item.dueAt?.toISOString() || null,
		})),
		dueSoonReminders: dueSoonReminders.map((item) => ({
			...item,
			dueAt: item.dueAt?.toISOString() || null,
		})),
		recentWorkLogs: recentWorkLogs.map((item) => ({
			...item,
			completedAt: item.completedAt?.toISOString() || null,
			createdAt: item.createdAt?.toISOString() || null,
			labourCharge: item.labourCharge?.toString() || "0",
			partsCharge: item.partsCharge?.toString() || "0",
			totalCharge: item.totalCharge?.toString() || "0",
		})),
		recentActivity: recentActivity.map((item) => ({
			...item,
			date: item.date ? new Date(item.date).toISOString() : null,
		})),
	};

	return <DashboardPageView data={dashboardData} />;
}
