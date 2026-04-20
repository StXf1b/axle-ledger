import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function getCurrentAppUser() {
	const { userId } = await auth();

	if (!userId) return null;

	return db.user.findUnique({
		where: { clerkUserId: userId },
		include: {
			memberships: {
				include: {
					workspace: {
						include: {
							settings: true,
						},
					},
				},
			},
		},
	});
}

export async function getCurrentWorkspaceContext() {
	const user = await getCurrentAppUser();

	if (!user) return null;

	const membership = user.memberships[0] || null;
	const workspace = membership?.workspace || null;

	return {
		user,
		membership,
		workspace,
	};
}
