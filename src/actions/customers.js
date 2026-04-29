"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertWorkspaceLimit } from "@/lib/billing/workspace-quotas";

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
			memberships: true,
		},
	});

	if (!appUser || appUser.memberships.length === 0) {
		throw new Error("No workspace membership found");
	}

	return {
		appUser,
		membership: appUser.memberships[0],
		workspaceId: appUser.memberships[0].workspaceId,
	};
}

function normalizeTags(value) {
	if (!value) return [];

	if (Array.isArray(value)) {
		return value.map((tag) => tag.trim()).filter(Boolean);
	}

	return value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

function normalizeCustomerPayload(data) {
	return {
		firstName: data.firstName?.trim() || "",
		lastName: data.lastName?.trim() || "",
		companyName: data.companyName?.trim() || null,
		phone: data.phone?.trim() || null,
		email: data.email?.trim() || null,
		preferredContact: data.preferredContact || "PHONE",
		status: data.status || "ACTIVE",
		addressLine1: data.addressLine1?.trim() || null,
		addressLine2: data.addressLine2?.trim() || null,
		city: data.city?.trim() || null,
		county: data.county?.trim() || null,
		country: data.country?.trim() || "Ireland",
		notes: data.notes?.trim() || null,
		tags: normalizeTags(data.tags),
	};
}

export async function createCustomer(data) {
	const { workspaceId } = await getWorkspaceContextOrThrow();

	const payload = normalizeCustomerPayload(data);

	if (!payload.firstName) {
		throw new Error("First name is required");
	}

	if (!payload.lastName) {
		throw new Error("Last name is required");
	}

	await assertWorkspaceLimit(workspaceId, "customers");

	const customer = await db.customer.create({
		data: {
			workspaceId,
			...payload,
		},
	});

	revalidatePath("/customers");

	return {
		ok: true,
		customerId: customer.id,
	};
}

export async function updateCustomer(customerId, data) {
	const { workspaceId } = await getWorkspaceContextOrThrow();

	const existingCustomer = await db.customer.findFirst({
		where: {
			id: customerId,
			workspaceId,
		},
	});

	if (!existingCustomer) {
		throw new Error("Customer not found");
	}

	const payload = normalizeCustomerPayload(data);

	if (!payload.firstName) {
		throw new Error("First name is required");
	}

	if (!payload.lastName) {
		throw new Error("Last name is required");
	}

	await db.customer.update({
		where: {
			id: customerId,
		},
		data: payload,
	});

	revalidatePath("/customers");
	revalidatePath(`/customers/${customerId}`);

	return {
		ok: true,
		customerId,
	};
}
