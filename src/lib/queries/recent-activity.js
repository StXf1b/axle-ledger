import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const PAGE_SIZE = 12;
const DAY_MS = 1000 * 60 * 60 * 24;
const TZ = "Europe/Dublin";

const ACTIVITY_GROUPS = {
	ALL: "ALL",
	CUSTOMER: "CUSTOMER",
	VEHICLE: "VEHICLE",
	WORK_LOG: "WORK_LOG",
	REMINDER: "REMINDER",
	DOCUMENT: "DOCUMENT",
};

function startOfDay(date = new Date()) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function formatShortDateTime(value) {
	if (!value) return "—";

	return new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "short",
		hour: "numeric",
		minute: "2-digit",
		timeZone: TZ,
	}).format(new Date(value));
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

	return formatShortDateTime(value);
}

function formatCustomerName(customer) {
	if (!customer) return "";
	if (customer.companyName) return customer.companyName;
	return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
}

function formatVehicleLabel(vehicle) {
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

function parsePage(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 1) return 1;
	return Math.floor(parsed);
}

function normalizeSearch(value) {
	return String(value || "").trim();
}

function normalizeGroup(value) {
	const normalized = String(value || "ALL").toUpperCase();
	return ACTIVITY_GROUPS[normalized] || ACTIVITY_GROUPS.ALL;
}

async function getCurrentWorkspaceId() {
	const { userId } = await auth();

	if (!userId) return null;

	const appUser = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
		include: {
			memberships: {
				select: {
					workspaceId: true,
				},
				orderBy: {
					createdAt: "asc",
				},
				take: 1,
			},
		},
	});

	return appUser?.memberships?.[0]?.workspaceId || null;
}

function buildSearchText(parts) {
	return parts.filter(Boolean).join(" ").toLowerCase();
}

export async function getRecentActivityPageData({
	page = 1,
	search = "",
	group = "ALL",
} = {}) {
	const workspaceId = await getCurrentWorkspaceId();

	if (!workspaceId) {
		return null;
	}

	const currentPageInput = parsePage(page);
	const normalizedSearch = normalizeSearch(search);
	const normalizedGroup = normalizeGroup(group);

	const now = new Date();
	const todayStart = startOfDay(now);
	const weekStart = startOfDay(addDays(now, -6));

	const [
		customers,
		vehicles,
		workLogs,
		createdReminders,
		completedReminders,
		documents,
	] = await Promise.all([
		db.customer.findMany({
			where: {
				workspaceId,
				createdAt: {
					gte: weekStart,
				},
			},
			orderBy: {
				createdAt: "desc",
			},
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
			where: {
				workspaceId,
				status: {
					not: "DELETED",
				},
				createdAt: {
					gte: weekStart,
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			select: {
				id: true,
				registration: true,
				make: true,
				model: true,
				status: true,
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
			where: {
				workspaceId,
				OR: [
					{
						completedAt: {
							gte: weekStart,
						},
					},
					{
						createdAt: {
							gte: weekStart,
						},
					},
				],
			},
			orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
			select: {
				id: true,
				title: true,
				description: true,
				completedAt: true,
				createdAt: true,
				totalCharge: true,
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
				performedByUser: {
					select: {
						fullName: true,
						email: true,
					},
				},
				createdByUser: {
					select: {
						fullName: true,
						email: true,
					},
				},
			},
		}),

		db.reminder.findMany({
			where: {
				workspaceId,
				createdAt: {
					gte: weekStart,
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			select: {
				id: true,
				title: true,
				type: true,
				status: true,
				dueAt: true,
				createdAt: true,
				customer: {
					select: {
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
				vehicle: {
					select: {
						registration: true,
						make: true,
						model: true,
					},
				},
				createdByUser: {
					select: {
						fullName: true,
						email: true,
					},
				},
			},
		}),

		db.reminder.findMany({
			where: {
				workspaceId,
				status: "COMPLETED",
				completedAt: {
					gte: weekStart,
				},
			},
			orderBy: {
				completedAt: "desc",
			},
			select: {
				id: true,
				title: true,
				type: true,
				status: true,
				dueAt: true,
				completedAt: true,
				customer: {
					select: {
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
				vehicle: {
					select: {
						registration: true,
						make: true,
						model: true,
					},
				},
				createdByUser: {
					select: {
						fullName: true,
						email: true,
					},
				},
			},
		}),

		db.document.findMany({
			where: {
				workspaceId,
				createdAt: {
					gte: weekStart,
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			select: {
				id: true,
				title: true,
				fileName: true,
				category: true,
				createdAt: true,
				customer: {
					select: {
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
				vehicle: {
					select: {
						registration: true,
						make: true,
						model: true,
					},
				},
				uploadedByUser: {
					select: {
						fullName: true,
						email: true,
					},
				},
			},
		}),
	]);

	const activityItems = [
		...customers.map((item) => {
			const customerName = formatCustomerName(item);

			return {
				id: `customer-${item.id}-created`,
				group: ACTIVITY_GROUPS.CUSTOMER,
				event: "CREATED",
				title: `Customer added`,
				subtitle: customerName || "Unnamed customer",
				meta:
					[item.email, item.phone].filter(Boolean).join(" • ") ||
					"Customer record created",
				time: item.createdAt,
				timeLabel: formatRelativeTime(item.createdAt),
				timeFull: formatShortDateTime(item.createdAt),
				href: `/customers/${item.id}`,
				badge: "Customer",
				searchText: buildSearchText([
					"customer added",
					customerName,
					item.email,
					item.phone,
				]),
			};
		}),

		...vehicles.map((item) => {
			const customerName = formatCustomerName(item.customer);

			return {
				id: `vehicle-${item.id}-created`,
				group: ACTIVITY_GROUPS.VEHICLE,
				event: "CREATED",
				title: `Vehicle added`,
				subtitle: item.registration || `${item.make} ${item.model}`.trim(),
				meta:
					[`${item.make} ${item.model}`.trim(), customerName || null]
						.filter(Boolean)
						.join(" • ") || "Vehicle record created",
				time: item.createdAt,
				timeLabel: formatRelativeTime(item.createdAt),
				timeFull: formatShortDateTime(item.createdAt),
				href: `/vehicles/${item.id}`,
				badge: "Vehicle",
				searchText: buildSearchText([
					"vehicle added",
					item.registration,
					item.make,
					item.model,
					customerName,
				]),
			};
		}),

		...workLogs
			.filter(
				(item) => item.completedAt && new Date(item.completedAt) >= weekStart,
			)
			.map((item) => {
				const vehicleLabel = formatVehicleLabel(item.vehicle);
				const customerName = formatCustomerName(item.customer);
				const performedBy =
					item.performedByUser?.fullName ||
					item.performedByUser?.email ||
					item.createdByUser?.fullName ||
					item.createdByUser?.email ||
					"Staff member";

				return {
					id: `worklog-${item.id}-completed`,
					group: ACTIVITY_GROUPS.WORK_LOG,
					event: "COMPLETED",
					title: `Work log completed`,
					subtitle: item.title,
					meta:
						[vehicleLabel, customerName, performedBy]
							.filter(Boolean)
							.join(" • ") || "Workshop work recorded",
					time: item.completedAt,
					timeLabel: formatRelativeTime(item.completedAt),
					timeFull: formatShortDateTime(item.completedAt),
					href: `/work-logs/${item.id}`,
					badge: "Work log",
					searchText: buildSearchText([
						"work log completed",
						item.title,
						item.description,
						vehicleLabel,
						customerName,
						performedBy,
					]),
				};
			}),

		...createdReminders.map((item) => {
			const vehicleLabel = formatVehicleLabel(item.vehicle);
			const customerName = formatCustomerName(item.customer);
			const actor =
				item.createdByUser?.fullName || item.createdByUser?.email || "";

			return {
				id: `reminder-${item.id}-created`,
				group: ACTIVITY_GROUPS.REMINDER,
				event: "CREATED",
				title: `Reminder created`,
				subtitle: item.title,
				meta:
					[
						formatReminderType(item.type),
						vehicleLabel,
						customerName,
						item.dueAt ? `Due ${formatShortDateTime(item.dueAt)}` : null,
						actor || null,
					]
						.filter(Boolean)
						.join(" • ") || "Reminder created",
				time: item.createdAt,
				timeLabel: formatRelativeTime(item.createdAt),
				timeFull: formatShortDateTime(item.createdAt),
				href: `/reminders/${item.id}`,
				badge: "Reminder",
				searchText: buildSearchText([
					"reminder created",
					item.title,
					item.type,
					vehicleLabel,
					customerName,
					actor,
				]),
			};
		}),

		...completedReminders.map((item) => {
			const vehicleLabel = formatVehicleLabel(item.vehicle);
			const customerName = formatCustomerName(item.customer);
			const actor =
				item.createdByUser?.fullName || item.createdByUser?.email || "";

			return {
				id: `reminder-${item.id}-completed`,
				group: ACTIVITY_GROUPS.REMINDER,
				event: "COMPLETED",
				title: `Reminder completed`,
				subtitle: item.title,
				meta:
					[
						formatReminderType(item.type),
						vehicleLabel,
						customerName,
						actor || null,
					]
						.filter(Boolean)
						.join(" • ") || "Reminder completed",
				time: item.completedAt,
				timeLabel: formatRelativeTime(item.completedAt),
				timeFull: formatShortDateTime(item.completedAt),
				href: `/reminders/${item.id}`,
				badge: "Completed",
				searchText: buildSearchText([
					"reminder completed",
					item.title,
					item.type,
					vehicleLabel,
					customerName,
					actor,
				]),
			};
		}),

		...documents.map((item) => {
			const vehicleLabel = formatVehicleLabel(item.vehicle);
			const customerName = formatCustomerName(item.customer);
			const actor =
				item.uploadedByUser?.fullName || item.uploadedByUser?.email || "";

			return {
				id: `document-${item.id}-uploaded`,
				group: ACTIVITY_GROUPS.DOCUMENT,
				event: "UPLOADED",
				title: `Document uploaded`,
				subtitle: item.title,
				meta:
					[
						item.fileName,
						item.category,
						vehicleLabel,
						customerName,
						actor || null,
					]
						.filter(Boolean)
						.join(" • ") || "Document uploaded",
				time: item.createdAt,
				timeLabel: formatRelativeTime(item.createdAt),
				timeFull: formatShortDateTime(item.createdAt),
				href: `/documents/${item.id}`,
				badge: "Document",
				searchText: buildSearchText([
					"document uploaded",
					item.title,
					item.fileName,
					item.category,
					vehicleLabel,
					customerName,
					actor,
				]),
			};
		}),
	].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

	const fullWeekStats = {
		total: activityItems.length,
		today: activityItems.filter((item) => new Date(item.time) >= todayStart)
			.length,
		workLogs: activityItems.filter(
			(item) => item.group === ACTIVITY_GROUPS.WORK_LOG,
		).length,
		reminders: activityItems.filter(
			(item) => item.group === ACTIVITY_GROUPS.REMINDER,
		).length,
		documents: activityItems.filter(
			(item) => item.group === ACTIVITY_GROUPS.DOCUMENT,
		).length,
	};

	const filteredItems = activityItems.filter((item) => {
		const matchesGroup =
			normalizedGroup === ACTIVITY_GROUPS.ALL
				? true
				: item.group === normalizedGroup;

		const matchesSearch = normalizedSearch
			? item.searchText.includes(normalizedSearch.toLowerCase())
			: true;

		return matchesGroup && matchesSearch;
	});

	const totalItems = filteredItems.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
	const currentPage = Math.min(currentPageInput, totalPages);
	const startIndex = (currentPage - 1) * PAGE_SIZE;
	const paginatedItems = filteredItems.slice(
		startIndex,
		startIndex + PAGE_SIZE,
	);

	return {
		timeframeLabel: "Past 7 days",
		stats: fullWeekStats,
		filters: {
			search: normalizedSearch,
			group: normalizedGroup,
		},
		pagination: {
			currentPage,
			totalPages,
			totalItems,
			pageSize: PAGE_SIZE,
		},
		items: paginatedItems,
		filterOptions: [
			{ value: "ALL", label: "All activity" },
			{ value: "CUSTOMER", label: "Customers" },
			{ value: "VEHICLE", label: "Vehicles" },
			{ value: "WORK_LOG", label: "Work logs" },
			{ value: "REMINDER", label: "Reminders" },
			{ value: "DOCUMENT", label: "Documents" },
		],
	};
}
