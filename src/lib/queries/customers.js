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
		},
	});

	return customer;
}
