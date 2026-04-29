"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

function slugify(value) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 50);
}

async function uniqueWorkspaceSlug(base) {
	const slugBase = slugify(base || "workspace");
	let candidate = slugBase;
	let count = 1;

	while (await db.workspace.findUnique({ where: { slug: candidate } })) {
		count += 1;
		candidate = `${slugBase}-${count}`;
	}

	return candidate;
}

export async function createOwnerWorkspace(formData) {
	const { userId } = await auth();
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const user = await db.user.findUnique({
		where: { clerkUserId: userId },
		include: { memberships: true },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.memberships.length > 0) {
		redirect("/dashboard");
	}

	const businessName = formData.businessName?.trim();
	const businessEmail = formData.businessEmail?.trim() || null;
	const businessPhone = formData.businessPhone?.trim() || null;

	if (!businessName) {
		throw new Error("Business name is required");
	}

	const slug = await uniqueWorkspaceSlug(businessName);

	await db.$transaction(async (tx) => {
		const workspace = await tx.workspace.create({
			data: {
				name: businessName,
				slug,
				ownerId: user.id,
				businessEmail,
				businessPhone,
			},
		});

		await tx.workspaceMember.create({
			data: {
				workspaceId: workspace.id,
				userId: user.id,
				role: "OWNER",
			},
		});

		await tx.workspaceSettings.create({
			data: {
				workspaceId: workspace.id,
			},
		});
		await tx.workspaceSubscription.create({
			data: {
				workspaceId: workspace.id,
				billingProvider: "MANUAL",
				tier: "TRIAL",
				status: "TRIALING",
				trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
			},
		});
	});

	redirect("/dashboard");
}
