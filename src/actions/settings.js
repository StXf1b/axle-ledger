"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

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
					workspace: {
						include: {
							settings: true,
						},
					},
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

export async function updateGeneralSettings(payload) {
	const { membership, workspace } = await getWorkspaceContextOrThrow();

	if (!["OWNER", "ADMIN"].includes(membership.role)) {
		throw new Error("Forbidden");
	}

	await db.workspace.update({
		where: {
			id: workspace.id,
		},
		data: {
			name: payload.name?.trim() || workspace.name,
			businessEmail: payload.businessEmail?.trim() || null,
			businessPhone: payload.businessPhone?.trim() || null,
			website: payload.website?.trim() || null,
			addressLine1: payload.addressLine1?.trim() || null,
			addressLine2: payload.addressLine2?.trim() || null,
			city: payload.city?.trim() || null,
			county: payload.county?.trim() || null,
			country: payload.country?.trim() || "Ireland",
		},
	});

	revalidatePath("/settings");
	revalidatePath("/dashboard");

	return { ok: true };
}

export async function updateDashboardSettings(payload) {
	const { membership, workspace } = await getWorkspaceContextOrThrow();

	if (!["OWNER", "ADMIN"].includes(membership.role)) {
		throw new Error("Forbidden");
	}

	await db.workspaceSettings.upsert({
		where: {
			workspaceId: workspace.id,
		},
		update: {
			compactLayout: !!payload.compactLayout,
			showWelcomeTips: !!payload.showWelcomeTips,
			showQuickAddVehicle: !!payload.showQuickAddVehicle,
			showQuickAddCustomer: !!payload.showQuickAddCustomer,
			showQuickAddReminder: !!payload.showQuickAddReminder,
			showQuickUploadDoc: !!payload.showQuickUploadDoc,
			showWidgetOverdue: !!payload.showWidgetOverdue,
			showWidgetDueSoon: !!payload.showWidgetDueSoon,
			showWidgetRecent: !!payload.showWidgetRecent,
			showWidgetStatus: !!payload.showWidgetStatus,
			showQuickAddWorkLog: !!payload.showQuickAddWorkLog,
			showWidgetWorkLogs: !!payload.showWidgetWorkLogs,
		},
		create: {
			workspaceId: workspace.id,
			compactLayout: !!payload.compactLayout,
			showWelcomeTips: !!payload.showWelcomeTips,
			showQuickAddVehicle: !!payload.showQuickAddVehicle,
			showQuickAddCustomer: !!payload.showQuickAddCustomer,
			showQuickAddReminder: !!payload.showQuickAddReminder,
			showQuickUploadDoc: !!payload.showQuickUploadDoc,
			showWidgetOverdue: !!payload.showWidgetOverdue,
			showWidgetDueSoon: !!payload.showWidgetDueSoon,
			showWidgetRecent: !!payload.showWidgetRecent,
			showWidgetStatus: !!payload.showWidgetStatus,
			showQuickAddWorkLog: !!payload.showQuickAddWorkLog,
			showWidgetWorkLogs: !!payload.showWidgetWorkLogs,
		},
	});

	revalidatePath("/settings");
	revalidatePath("/dashboard");

	return { ok: true };
}

export async function updateMemberRole({ memberId, role }) {
	const { appUser, membership, workspace } = await getWorkspaceContextOrThrow();

	if (membership.role !== "OWNER") {
		throw new Error("Only the workspace owner can change roles");
	}

	if (!["ADMIN", "STAFF"].includes(role)) {
		throw new Error("Invalid role");
	}

	const targetMember = await db.workspaceMember.findUnique({
		where: {
			id: memberId,
		},
		include: {
			user: true,
		},
	});

	if (!targetMember || targetMember.workspaceId !== workspace.id) {
		throw new Error("Member not found");
	}

	if (targetMember.userId === appUser.id) {
		throw new Error("You cannot change your own owner role here");
	}

	if (targetMember.role === "OWNER") {
		throw new Error("Owner role cannot be changed here");
	}

	await db.workspaceMember.update({
		where: {
			id: memberId,
		},
		data: {
			role,
		},
	});

	revalidatePath("/settings");
	revalidatePath("/dashboard");

	return { ok: true };
}

export async function removeMemberFromWorkspace(memberId) {
	const { appUser, membership, workspace } = await getWorkspaceContextOrThrow();

	if (membership.role !== "OWNER") {
		throw new Error("Only the workspace owner can remove members");
	}

	const targetMember = await db.workspaceMember.findUnique({
		where: {
			id: memberId,
		},
		include: {
			user: true,
		},
	});

	if (!targetMember || targetMember.workspaceId !== workspace.id) {
		throw new Error("Member not found");
	}

	if (targetMember.userId === appUser.id) {
		throw new Error("You cannot remove yourself from the workspace");
	}

	if (targetMember.role === "OWNER") {
		throw new Error("Owner cannot be removed here");
	}

	await db.workspaceMember.delete({
		where: {
			id: memberId,
		},
	});

	revalidatePath("/settings");
	revalidatePath("/dashboard");

	return { ok: true };
}

export async function deleteWorkspace() {
	const { appUser, membership, workspace } = await getWorkspaceContextOrThrow();

	if (membership.role !== "OWNER") {
		throw new Error("Only the workspace owner can delete the workspace");
	}

	const memberCount = await db.workspaceMember.count({
		where: {
			workspaceId: workspace.id,
		},
	});

	if (memberCount > 1) {
		throw new Error(
			"You cannot delete this workspace while other members still belong to it.",
		);
	}

	// ! If you use R2, fetch document file keys here first and delete them from storage
	// ! before deleting the workspace row.

	await db.workspace.delete({
		where: {
			id: workspace.id,
		},
	});

	revalidatePath("/settings");
	revalidatePath("/dashboard");
	revalidatePath("/onboarding");

	return { ok: true };
}
