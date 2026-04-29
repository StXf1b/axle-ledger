"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const ALLOWED_TIERS = ["TRIAL", "STARTER", "PRO", "BUSINESS"];

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

export async function updateWorkspacePlan(nextTier) {
	const { membership, workspace } = await getWorkspaceContextOrThrow();

	if (membership.role !== "OWNER") {
		throw new Error("Only the workspace owner can change the billing plan");
	}

	if (!ALLOWED_TIERS.includes(nextTier)) {
		throw new Error("Invalid plan selected");
	}

	const now = new Date();
	const nextPeriodEnd = new Date(now);
	nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

	const trialEndsAt = new Date(now);
	trialEndsAt.setDate(trialEndsAt.getDate() + 14);

	await db.workspaceSubscription.upsert({
		where: {
			workspaceId: workspace.id,
		},
		update: {
			tier: nextTier,
			status: nextTier === "TRIAL" ? "TRIALING" : "ACTIVE",
			billingProvider: "MANUAL",
			trialEndsAt: nextTier === "TRIAL" ? trialEndsAt : null,
			currentPeriodStart: nextTier === "TRIAL" ? null : now,
			currentPeriodEnd: nextTier === "TRIAL" ? null : nextPeriodEnd,
			cancelAtPeriodEnd: false,
		},
		create: {
			workspaceId: workspace.id,
			tier: nextTier,
			status: nextTier === "TRIAL" ? "TRIALING" : "ACTIVE",
			billingProvider: "MANUAL",
			trialEndsAt: nextTier === "TRIAL" ? trialEndsAt : null,
			currentPeriodStart: nextTier === "TRIAL" ? null : now,
			currentPeriodEnd: nextTier === "TRIAL" ? null : nextPeriodEnd,
			cancelAtPeriodEnd: false,
		},
	});

	revalidatePath("/settings");
	revalidatePath("/dashboard");

	return { ok: true };
}
