import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const DAY_MS = 1000 * 60 * 60 * 24;
const TZ = "Europe/Dublin";

function startOfDay(date = new Date()) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date = new Date()) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function addMonths(date, months) {
	const next = new Date(date);
	next.setMonth(next.getMonth() + months);
	return next;
}

function formatCount(value) {
	return new Intl.NumberFormat("en-IE").format(value || 0);
}

function formatShortDate(value) {
	if (!value) return "—";

	return new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "short",
		timeZone: TZ,
	}).format(new Date(value));
}

function formatUpdatedLabel(value) {
	if (!value) return "Updated just now";

	const date = new Date(value);
	const now = new Date();

	const dateLabel = new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "short",
		timeZone: TZ,
	}).format(date);

	const todayLabel = new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: TZ,
	}).format(now);

	const compareLabel = new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: TZ,
	}).format(date);

	const timeLabel = new Intl.DateTimeFormat("en-IE", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: TZ,
	}).format(date);

	if (todayLabel === compareLabel) {
		return `Updated today, ${timeLabel}`;
	}

	return `Updated ${dateLabel}, ${timeLabel}`;
}

function formatRelativeTime(value) {
	if (!value) return "—";

	const now = new Date();
	const then = new Date(value);
	const diffMs = now.getTime() - then.getTime();

	if (diffMs < 60 * 1000) return "Just now";

	const minutes = Math.floor(diffMs / (60 * 1000));
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.floor(diffMs / (60 * 60 * 1000));
	if (hours < 24) return `${hours}h ago`;

	const days = Math.floor(diffMs / DAY_MS);
	if (days < 7) return `${days}d ago`;

	return formatShortDate(value);
}

function calculateChange(current, previous) {
	if (!current && !previous) {
		return { direction: "flat", percent: 0 };
	}

	if (!previous && current > 0) {
		return { direction: "up", percent: 100 };
	}

	const raw = ((current - previous) / previous) * 100;
	const percent = Math.round(Math.abs(raw));

	if (raw > 0) return { direction: "up", percent };
	if (raw < 0) return { direction: "down", percent };

	return { direction: "flat", percent: 0 };
}

function buildSparklineSeries(rows, fieldName, bucketCount = 8) {
	const now = new Date();
	const start = startOfDay(addDays(now, -(bucketCount - 1) * 7));

	const buckets = Array.from({ length: bucketCount }, (_, index) => {
		const bucketDate = addDays(start, index * 7);

		return {
			label: formatShortDate(bucketDate),
			value: 0,
		};
	});

	rows.forEach((row) => {
		const raw = row?.[fieldName];
		if (!raw) return;

		const date = new Date(raw);
		if (date < start) return;

		const diff = date.getTime() - start.getTime();
		const bucketIndex = Math.min(
			bucketCount - 1,
			Math.floor(diff / (7 * DAY_MS)),
		);

		if (bucketIndex >= 0 && buckets[bucketIndex]) {
			buckets[bucketIndex].value += 1;
		}
	});

	return buckets;
}

function formatCustomerName(customer) {
	if (!customer) return "";
	if (customer.companyName) return customer.companyName;

	return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
}

function formatVehicleName(vehicle) {
	if (!vehicle) return "";
	return [vehicle.registration, `${vehicle.make} ${vehicle.model}`]
		.filter(Boolean)
		.join(" • ");
}

function formatReminderType(type) {
	if (!type) return "Reminder";

	return type
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function formatReminderMeta(reminder) {
	return [
		formatVehicleName(reminder.vehicle),
		formatCustomerName(reminder.customer),
	]
		.filter(Boolean)
		.join(" • ");
}

function getReminderStatusLabel(reminder) {
	if (!reminder?.dueAt) return "No due date";

	const now = startOfDay(new Date());
	const due = startOfDay(new Date(reminder.dueAt));
	const diffDays = Math.floor((due.getTime() - now.getTime()) / DAY_MS);

	if (diffDays < 0) {
		const days = Math.abs(diffDays);
		return days === 1 ? "1 day overdue" : `${days} days overdue`;
	}

	if (diffDays === 0) return "Due today";
	if (diffDays === 1) return "Due tomorrow";

	return `Due in ${diffDays} days`;
}

function buildRecentActivity({
	customers,
	vehicles,
	workLogs,
	reminders,
	documents,
}) {
	const items = [
		...customers.map((item) => ({
			id: `customer-${item.id}`,
			type: "customer",
			title: `New customer added: ${formatCustomerName(item) || "Unnamed customer"}`,
			meta:
				[item.companyName, item.email, item.phone]
					.filter(Boolean)
					.join(" • ") || "Customer created",
			time: item.createdAt,
			href: `/customers/${item.id}`,
		})),
		...vehicles.map((item) => ({
			id: `vehicle-${item.id}`,
			type: "vehicle",
			title: `Vehicle added: ${item.registration}`,
			meta:
				[
					`${item.make} ${item.model}`.trim(),
					item.customer ? formatCustomerName(item.customer) : null,
				]
					.filter(Boolean)
					.join(" • ") || "Vehicle created",
			time: item.createdAt,
			href: `/vehicles/${item.id}`,
		})),
		...workLogs.map((item) => ({
			id: `worklog-${item.id}`,
			type: "workLog",
			title: `Work log completed: ${item.title}`,
			meta:
				[
					item.vehicle ? formatVehicleName(item.vehicle) : null,
					item.performedByUser?.fullName || item.performedByUser?.email || null,
				]
					.filter(Boolean)
					.join(" • ") || "Work log recorded",
			time: item.completedAt || item.createdAt,
			href: `/work-logs/${item.id}`,
		})),
		...reminders.map((item) => ({
			id: `reminder-${item.id}`,
			type: "reminder",
			title: `Reminder created: ${item.title}`,
			meta:
				[
					formatReminderType(item.type),
					formatReminderMeta(item),
					item.dueAt ? `Due ${formatShortDate(item.dueAt)}` : null,
				]
					.filter(Boolean)
					.join(" • ") || "Reminder created",
			time: item.createdAt,
			href: `/reminders/${item.id}`,
		})),
		...documents.map((item) => ({
			id: `document-${item.id}`,
			type: "document",
			title: `Document uploaded: ${item.title}`,
			meta:
				[
					item.fileName,
					item.vehicle ? formatVehicleName(item.vehicle) : null,
					item.customer ? formatCustomerName(item.customer) : null,
				]
					.filter(Boolean)
					.join(" • ") || "Document uploaded",
			time: item.createdAt,
			href: `/documents/${item.id}`,
		})),
	];

	return items
		.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
		.slice(0, 8)
		.map((item) => ({
			...item,
			timeLabel: formatRelativeTime(item.time),
		}));
}

async function getCurrentWorkspaceId() {
	const { userId } = await auth();

	if (!userId) return null;

	const appUser = await db.user.findUnique({
		where: { clerkUserId: userId },
		include: {
			memberships: {
				select: { workspaceId: true },
				orderBy: { createdAt: "asc" },
				take: 1,
			},
		},
	});

	return appUser?.memberships?.[0]?.workspaceId || null;
}

export async function getDashboardPageData() {
	const workspaceId = await getCurrentWorkspaceId();

	if (!workspaceId) {
		return null;
	}

	const now = new Date();
	const monthStart = startOfMonth(now);
	const previousMonthStart = startOfMonth(addMonths(now, -1));
	const trendStart = addDays(now, -55);
	const dueSoonEnd = addDays(now, 14);

	const activeVehicleWhere = {
		workspaceId,
		status: {
			not: "DELETED",
		},
	};

	const [
		totalCustomers,
		totalVehicles,
		totalWorkLogs,
		totalOpenReminders,

		customersThisMonth,
		customersPreviousMonth,
		vehiclesThisMonth,
		vehiclesPreviousMonth,
		workLogsThisMonth,
		workLogsPreviousMonth,
		remindersThisMonth,
		remindersPreviousMonth,

		customerTrendRows,
		vehicleTrendRows,
		workLogTrendRows,
		reminderTrendRows,

		overdueCount,
		dueSoonCount,
		overdueReminders,
		dueSoonReminders,

		recentCustomers,
		recentVehicles,
		recentWorkLogs,
		recentReminders,
		recentDocuments,
	] = await Promise.all([
		db.customer.count({
			where: { workspaceId },
		}),
		db.vehicle.count({
			where: activeVehicleWhere,
		}),
		db.workLog.count({
			where: { workspaceId },
		}),
		db.reminder.count({
			where: {
				workspaceId,
				status: "OPEN",
			},
		}),

		db.customer.count({
			where: {
				workspaceId,
				createdAt: { gte: monthStart },
			},
		}),
		db.customer.count({
			where: {
				workspaceId,
				createdAt: {
					gte: previousMonthStart,
					lt: monthStart,
				},
			},
		}),
		db.vehicle.count({
			where: {
				...activeVehicleWhere,
				createdAt: { gte: monthStart },
			},
		}),
		db.vehicle.count({
			where: {
				...activeVehicleWhere,
				createdAt: {
					gte: previousMonthStart,
					lt: monthStart,
				},
			},
		}),
		db.workLog.count({
			where: {
				workspaceId,
				completedAt: { gte: monthStart },
			},
		}),
		db.workLog.count({
			where: {
				workspaceId,
				completedAt: {
					gte: previousMonthStart,
					lt: monthStart,
				},
			},
		}),
		db.reminder.count({
			where: {
				workspaceId,
				createdAt: { gte: monthStart },
			},
		}),
		db.reminder.count({
			where: {
				workspaceId,
				createdAt: {
					gte: previousMonthStart,
					lt: monthStart,
				},
			},
		}),

		db.customer.findMany({
			where: {
				workspaceId,
				createdAt: { gte: trendStart },
			},
			select: { createdAt: true },
		}),
		db.vehicle.findMany({
			where: {
				...activeVehicleWhere,
				createdAt: { gte: trendStart },
			},
			select: { createdAt: true },
		}),
		db.workLog.findMany({
			where: {
				workspaceId,
				completedAt: { gte: trendStart },
			},
			select: { completedAt: true },
		}),
		db.reminder.findMany({
			where: {
				workspaceId,
				createdAt: { gte: trendStart },
			},
			select: { createdAt: true },
		}),

		db.reminder.count({
			where: {
				workspaceId,
				status: "OPEN",
				dueAt: { lt: now },
			},
		}),
		db.reminder.count({
			where: {
				workspaceId,
				status: "OPEN",
				dueAt: {
					gte: now,
					lte: dueSoonEnd,
				},
			},
		}),
		db.reminder.findMany({
			where: {
				workspaceId,
				status: "OPEN",
				dueAt: { lt: now },
			},
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			take: 5,
			select: {
				id: true,
				title: true,
				type: true,
				dueAt: true,
				vehicle: {
					select: {
						id: true,
						registration: true,
						make: true,
						model: true,
					},
				},
				customer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
			},
		}),
		db.reminder.findMany({
			where: {
				workspaceId,
				status: "OPEN",
				dueAt: {
					gte: now,
					lte: dueSoonEnd,
				},
			},
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			take: 5,
			select: {
				id: true,
				title: true,
				type: true,
				dueAt: true,
				vehicle: {
					select: {
						id: true,
						registration: true,
						make: true,
						model: true,
					},
				},
				customer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
			},
		}),

		db.customer.findMany({
			where: { workspaceId },
			orderBy: { createdAt: "desc" },
			take: 4,
			select: {
				id: true,
				firstName: true,
				lastName: true,
				companyName: true,
				email: true,
				phone: true,
				createdAt: true,
			},
		}),
		db.vehicle.findMany({
			where: activeVehicleWhere,
			orderBy: { createdAt: "desc" },
			take: 4,
			select: {
				id: true,
				registration: true,
				make: true,
				model: true,
				createdAt: true,
				customer: {
					select: {
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
			},
		}),
		db.workLog.findMany({
			where: { workspaceId },
			orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
			take: 4,
			select: {
				id: true,
				title: true,
				completedAt: true,
				createdAt: true,
				vehicle: {
					select: {
						registration: true,
						make: true,
						model: true,
					},
				},
				performedByUser: {
					select: {
						fullName: true,
						email: true,
					},
				},
			},
		}),
		db.reminder.findMany({
			where: { workspaceId },
			orderBy: { createdAt: "desc" },
			take: 4,
			select: {
				id: true,
				title: true,
				type: true,
				dueAt: true,
				createdAt: true,
				vehicle: {
					select: {
						registration: true,
						make: true,
						model: true,
					},
				},
				customer: {
					select: {
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
			},
		}),
		db.document.findMany({
			where: { workspaceId },
			orderBy: { createdAt: "desc" },
			take: 4,
			select: {
				id: true,
				title: true,
				fileName: true,
				createdAt: true,
				vehicle: {
					select: {
						registration: true,
						make: true,
						model: true,
					},
				},
				customer: {
					select: {
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
			},
		}),
	]);

	const activityPool = [
		...recentCustomers.map((item) => item.createdAt),
		...recentVehicles.map((item) => item.createdAt),
		...recentWorkLogs.map((item) => item.completedAt || item.createdAt),
		...recentReminders.map((item) => item.createdAt),
		...recentDocuments.map((item) => item.createdAt),
	].filter(Boolean);

	const latestUpdate = activityPool.length
		? new Date(
				Math.max(...activityPool.map((value) => new Date(value).getTime())),
			)
		: now;

	return {
		updatedAtLabel: formatUpdatedLabel(latestUpdate),

		kpis: [
			{
				key: "customers",
				label: "Customers",
				total: totalCustomers,
				totalLabel: formatCount(totalCustomers),
				newThisMonth: customersThisMonth,
				newThisMonthLabel: `+${formatCount(customersThisMonth)} this month`,
				change: calculateChange(customersThisMonth, customersPreviousMonth),
				series: buildSparklineSeries(customerTrendRows, "createdAt"),
			},
			{
				key: "vehicles",
				label: "Vehicles",
				total: totalVehicles,
				totalLabel: formatCount(totalVehicles),
				newThisMonth: vehiclesThisMonth,
				newThisMonthLabel: `+${formatCount(vehiclesThisMonth)} this month`,
				change: calculateChange(vehiclesThisMonth, vehiclesPreviousMonth),
				series: buildSparklineSeries(vehicleTrendRows, "createdAt"),
			},
			{
				key: "workLogs",
				label: "Work Logs",
				total: totalWorkLogs,
				totalLabel: formatCount(totalWorkLogs),
				newThisMonth: workLogsThisMonth,
				newThisMonthLabel: `+${formatCount(workLogsThisMonth)} this month`,
				change: calculateChange(workLogsThisMonth, workLogsPreviousMonth),
				series: buildSparklineSeries(workLogTrendRows, "completedAt"),
			},
			{
				key: "activeReminders",
				label: "Open Reminders",
				total: totalOpenReminders,
				totalLabel: formatCount(totalOpenReminders),
				newThisMonth: remindersThisMonth,
				newThisMonthLabel: `+${formatCount(remindersThisMonth)} created this month`,
				change: calculateChange(remindersThisMonth, remindersPreviousMonth),
				series: buildSparklineSeries(reminderTrendRows, "createdAt"),
			},
		],

		quickActions: [
			{
				key: "customer",
				label: "Add Customer",
				href: "/customers/new",
				icon: "customer",
			},
			{
				key: "vehicle",
				label: "Add Vehicle",
				href: "/vehicles/new",
				icon: "vehicle",
			},
			{
				key: "workLog",
				label: "Add Work Log",
				href: "/work-logs/new",
				icon: "workLog",
			},
			{
				key: "reminder",
				label: "New Reminder",
				href: "/reminders/new",
				icon: "reminder",
			},
			{
				key: "document",
				label: "Upload Document",
				href: "/documents/new",
				icon: "document",
			},
		],

		overdue: {
			total: overdueCount,
			items: overdueReminders.map((item) => ({
				id: item.id,
				title: item.title,
				type: item.type,
				typeLabel: formatReminderType(item.type),
				meta: formatReminderMeta(item) || "Linked record not set",
				statusLabel: getReminderStatusLabel(item),
				href: `/reminders/${item.id}`,
			})),
		},

		dueSoon: {
			total: dueSoonCount,
			items: dueSoonReminders.map((item) => ({
				id: item.id,
				title: item.title,
				type: item.type,
				typeLabel: formatReminderType(item.type),
				meta: formatReminderMeta(item) || "Linked record not set",
				statusLabel: getReminderStatusLabel(item),
				href: `/reminders/${item.id}`,
			})),
		},

		recentActivity: buildRecentActivity({
			customers: recentCustomers,
			vehicles: recentVehicles,
			workLogs: recentWorkLogs,
			reminders: recentReminders,
			documents: recentDocuments,
		}),
	};
}
