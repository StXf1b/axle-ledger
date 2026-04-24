import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

async function getCurrentWorkspaceId() {
	const { userId } = await auth();
	if (!userId) return null;

	const user = await db.user.findUnique({
		where: { clerkUserId: userId },
		include: {
			memberships: {
				include: {
					workspace: true,
				},
			},
		},
	});

	return user?.memberships?.[0]?.workspaceId || null;
}

function buildCustomersWhere({ workspaceId, search = "", status = "All" }) {
	const trimmedSearch = search.trim();

	return {
		workspaceId,
		...(status && status !== "All" ? { status } : {}),
		...(trimmedSearch
			? {
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
						{
							phone: {
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
						{
							vehicles: {
								some: {
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
					],
				}
			: {}),
	};
}

export async function getCustomersListPage({
	search = "",
	status = "All",
	page = 1,
	pageSize = 10,
}) {
	const workspaceId = await getCurrentWorkspaceId();

	if (!workspaceId) {
		return {
			customers: [],
			totalCount: 0,
			stats: {
				totalCustomers: 0,
				activeCustomers: 0,
				businessCustomers: 0,
				linkedVehicles: 0,
			},
		};
	}

	const safePage = Math.max(1, Number(page) || 1);
	const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
	const skip = (safePage - 1) * safePageSize;

	const where = buildCustomersWhere({
		workspaceId,
		search,
		status,
	});

	const [
		customers,
		totalCount,
		totalCustomers,
		activeCustomers,
		businessCustomers,
		linkedVehicles,
	] = await Promise.all([
		db.customer.findMany({
			where,
			orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
			skip,
			take: safePageSize,
			select: {
				id: true,
				firstName: true,
				lastName: true,
				companyName: true,
				phone: true,
				email: true,
				status: true,
				tags: true,
				preferredContact: true,
				vehicles: {
					select: {
						id: true,
						registration: true,
						make: true,
						model: true,
					},
				},
			},
		}),
		db.customer.count({ where }),
		db.customer.count({
			where: {
				workspaceId,
			},
		}),
		db.customer.count({
			where: {
				workspaceId,
				status: "ACTIVE",
			},
		}),
		db.customer.count({
			where: {
				workspaceId,
				companyName: {
					not: null,
				},
			},
		}),
		db.vehicle.count({
			where: {
				workspaceId,
				customerId: {
					not: null,
				},
			},
		}),
	]);

	return {
		customers,
		totalCount,
		stats: {
			totalCustomers,
			activeCustomers,
			businessCustomers,
			linkedVehicles,
		},
	};
}

export async function getCustomersList() {
	const workspaceId = await getCurrentWorkspaceId();
	if (!workspaceId) return [];

	const customers = await db.customer.findMany({
		where: { workspaceId },
		include: {
			vehicles: {
				select: {
					id: true,
					registration: true,
					make: true,
					model: true,
				},
			},
		},
		orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
	});

	return customers;
}

export async function getCustomerById(customerId) {
	const workspaceId = await getCurrentWorkspaceId();
	if (!workspaceId) return null;

	const customer = await db.customer.findFirst({
		where: {
			id: customerId,
			workspaceId,
		},
		include: {
			vehicles: {
				orderBy: {
					createdAt: "desc",
				},
			},
			reminders: {
				include: {
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
				orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			},
			documents: {
				orderBy: [{ createdAt: "desc" }],
				take: 6,
				select: {
					id: true,
					title: true,
					fileName: true,
					fileExtension: true,
					mimeType: true,
					sizeBytes: true,
					category: true,
					createdAt: true,
				},
			},
		},
	});

	return customer;
}
