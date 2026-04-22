import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function getCurrentUserRoleContext() {
	const { userId } = await auth();

	if (!userId) {
		return {
			user: null,
			workspace: null,
			membership: null,
			role: null,
			isOwner: false,
			isAdmin: false,
			isStaff: false,
			canManageWorkspace: false,
			canManageStaff: false,
		};
	}

	const user = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
		include: {
			memberships: {
				include: {
					workspace: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
		},
	});

	const membership = user?.memberships?.[0] || null;
	const workspace = membership?.workspace || null;
	const role = membership?.role || null;

	const isOwner = role === "OWNER";
	const isAdmin = role === "ADMIN";
	const isStaff = role === "STAFF";

	return {
		user,
		workspace,
		membership,
		role,
		isOwner,
		isAdmin,
		isStaff,
		canManageWorkspace: isOwner || isAdmin,
		canManageStaff: isOwner,
	};
}
