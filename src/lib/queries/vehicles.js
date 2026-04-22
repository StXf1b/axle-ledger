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
