"use server";

import { randomBytes } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

function generateToken() {
	return randomBytes(24).toString("hex");
}

async function getWorkspaceContextOrThrow() {
	const { userId } = await auth();

	if (!userId) {
		throw new Error("Unauthorized");
	}

	const appUser = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
		include: {
			memberships: {
				include: {
					workspace: true,
				},
			},
		},
	});

	if (!appUser || appUser.memberships.length === 0) {
		throw new Error("No workspace membership found");
	}

	const membership = appUser.memberships[0];
	const workspace = membership.workspace;

	return {
		appUser,
		membership,
		workspace,
	};
}

export async function createWorkspaceInvite({ email, role }) {
	const { appUser, membership, workspace } = await getWorkspaceContextOrThrow();

	if (!["OWNER", "ADMIN"].includes(membership.role)) {
		throw new Error("Forbidden");
	}

	const normalizedEmail = email?.trim().toLowerCase();

	if (!normalizedEmail) {
		throw new Error("Email is required");
	}

	if (!["ADMIN", "STAFF"].includes(role)) {
		throw new Error("Invalid role");
	}

	const existingUser = await db.user.findUnique({
		where: {
			email: normalizedEmail,
		},
		include: {
			memberships: true,
		},
	});

	if (existingUser) {
		const alreadyMember = await db.workspaceMember.findFirst({
			where: {
				workspaceId: workspace.id,
				userId: existingUser.id,
			},
		});

		if (alreadyMember) {
			throw new Error("This user is already a member of the workspace");
		}
	}

	const existingInvite = await db.workspaceInvite.findFirst({
		where: {
			workspaceId: workspace.id,
			email: normalizedEmail,
			status: "PENDING",
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	if (existingInvite && existingInvite.expiresAt > new Date()) {
		return {
			ok: true,
			inviteId: existingInvite.id,
			token: existingInvite.token,
		};
	}

	const token = generateToken();
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

	const invite = await db.workspaceInvite.create({
		data: {
			workspaceId: workspace.id,
			email: normalizedEmail,
			role,
			token,
			status: "PENDING",
			invitedByUserId: appUser.id,
			expiresAt,
		},
	});

	revalidatePath("/settings");

	return {
		ok: true,
		inviteId: invite.id,
		token: invite.token,
	};
}

export async function revokeWorkspaceInvite(inviteId) {
	const { membership, workspace } = await getWorkspaceContextOrThrow();

	if (!["OWNER", "ADMIN"].includes(membership.role)) {
		throw new Error("Forbidden");
	}

	const invite = await db.workspaceInvite.findUnique({
		where: {
			id: inviteId,
		},
	});

	if (!invite || invite.workspaceId !== workspace.id) {
		throw new Error("Invite not found");
	}

	await db.workspaceInvite.update({
		where: {
			id: inviteId,
		},
		data: {
			status: "REVOKED",
		},
	});

	revalidatePath("/settings");

	return { ok: true };
}

export async function acceptWorkspaceInvite(token) {
	const { userId } = await auth();

	if (!userId) {
		throw new Error("Unauthorized");
	}

	const appUser = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
		include: {
			memberships: true,
		},
	});

	if (!appUser) {
		throw new Error("User not found");
	}

	const invite = await db.workspaceInvite.findUnique({
		where: {
			token,
		},
		include: {
			workspace: true,
		},
	});

	if (!invite) {
		throw new Error("Invite not found");
	}

	if (invite.status !== "PENDING") {
		throw new Error("This invite is no longer active");
	}

	if (invite.expiresAt < new Date()) {
		await db.workspaceInvite.update({
			where: { id: invite.id },
			data: { status: "EXPIRED" },
		});

		throw new Error("This invite has expired");
	}

	if (appUser.email.toLowerCase() !== invite.email.toLowerCase()) {
		throw new Error("You must sign in with the invited email address");
	}

	const existingMembershipInInvitedWorkspace =
		await db.workspaceMember.findFirst({
			where: {
				workspaceId: invite.workspaceId,
				userId: appUser.id,
			},
		});

	if (existingMembershipInInvitedWorkspace) {
		await db.workspaceInvite.update({
			where: { id: invite.id },
			data: {
				status: "ACCEPTED",
				acceptedAt: new Date(),
			},
		});

		revalidatePath("/settings");
		return { ok: true, alreadyJoined: true };
	}

	const existingMembershipElsewhere = await db.workspaceMember.findFirst({
		where: {
			userId: appUser.id,
			workspaceId: {
				not: invite.workspaceId,
			},
		},
	});

	if (existingMembershipElsewhere) {
		return {
			ok: false,
			error: "MULTIPLE_WORKSPACES",
			message:
				"This account already belongs to another workspace. Please delete the existing workspace before accepting this invite.",
		};
	}

	await db.$transaction(async (tx) => {
		await tx.workspaceMember.create({
			data: {
				workspaceId: invite.workspaceId,
				userId: appUser.id,
				role: invite.role,
			},
		});

		await tx.workspaceInvite.update({
			where: { id: invite.id },
			data: {
				status: "ACCEPTED",
				acceptedAt: new Date(),
			},
		});
	});

	revalidatePath("/settings");

	return { ok: true };
}
