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

function buildVehiclesWhere({ workspaceId, search = "", status = "All" }) {
	const trimmedSearch = search.trim();

	return {
		workspaceId,
		...(status && status !== "All" ? { status } : {}),
		...(trimmedSearch
			? {
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
						{
							vin: {
								contains: trimmedSearch,
								mode: "insensitive",
							},
						},
						{
							customer: {
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
					],
				}
			: {}),
	};
}

function serializeVehicleList(vehicles) {
	return vehicles.map((vehicle) => ({
		...vehicle,
		taxDueAt: vehicle.taxDueAt?.toISOString() || null,
		insuranceDueAt: vehicle.insuranceDueAt?.toISOString() || null,
		nctDueAt: vehicle.nctDueAt?.toISOString() || null,
		serviceDueAt: vehicle.serviceDueAt?.toISOString() || null,
		createdAt: vehicle.createdAt?.toISOString() || null,
		updatedAt: vehicle.updatedAt?.toISOString() || null,
	}));
}

export async function getVehiclesListPage({
	search = "",
	status = "All",
	page = 1,
	pageSize = 10,
}) {
	const workspaceId = await getCurrentWorkspaceId();

	if (!workspaceId) {
		return {
			vehicles: [],
			totalCount: 0,
			stats: {
				total: 0,
				active: 0,
				dueSoon: 0,
				unassigned: 0,
			},
		};
	}

	const safePage = Math.max(1, Number(page) || 1);
	const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
	const skip = (safePage - 1) * safePageSize;

	const where = buildVehiclesWhere({
		workspaceId,
		search,
		status,
	});

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const dueSoonLimit = new Date(today);
	dueSoonLimit.setDate(dueSoonLimit.getDate() + 30);

	const [
		vehicles,
		totalCount,
		totalVehicles,
		activeVehicles,
		dueSoonVehicles,
		unassignedVehicles,
	] = await Promise.all([
		db.vehicle.findMany({
			where,
			orderBy: [{ createdAt: "desc" }],
			skip,
			take: safePageSize,
			select: {
				id: true,
				registration: true,
				vin: true,
				make: true,
				model: true,
				year: true,
				odometerValue: true,
				odometerUnit: true,
				fuelType: true,
				colour: true,
				status: true,
				taxDueAt: true,
				insuranceDueAt: true,
				nctDueAt: true,
				serviceDueAt: true,
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
			},
		}),
		db.vehicle.count({ where }),
		db.vehicle.count({
			where: {
				workspaceId,
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
				serviceDueAt: {
					gte: today,
					lte: dueSoonLimit,
				},
			},
		}),
		db.vehicle.count({
			where: {
				workspaceId,
				customerId: null,
			},
		}),
	]);

	return {
		vehicles: serializeVehicleList(vehicles),
		totalCount,
		stats: {
			total: totalVehicles,
			active: activeVehicles,
			dueSoon: dueSoonVehicles,
			unassigned: unassignedVehicles,
		},
	};
}

export async function getVehiclesList() {
	const workspaceId = await getCurrentWorkspaceId();
	if (!workspaceId) return [];

	return db.vehicle.findMany({
		where: { workspaceId },
		include: {
			customer: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					companyName: true,
				},
			},
		},
		orderBy: [{ createdAt: "desc" }],
	});
}

export async function getVehicleById(vehicleId) {
	const workspaceId = await getCurrentWorkspaceId();
	if (!workspaceId) return null;

	return db.vehicle.findFirst({
		where: {
			id: vehicleId,
			workspaceId,
		},
		include: {
			customer: true,
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
			workLogs: {
				orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
				take: 6,
				include: {
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
			},
		},
	});
}

export async function getVehicleFormData() {
	const workspaceId = await getCurrentWorkspaceId();
	if (!workspaceId) return { customers: [] };

	const customers = await db.customer.findMany({
		where: { workspaceId },
		orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
		select: {
			id: true,
			firstName: true,
			lastName: true,
			companyName: true,
		},
	});

	return { customers };
}
