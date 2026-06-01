"use server";

import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";

import { db } from "@/lib/db";
import { canUseStarterAndAboveFeature } from "@/lib/billing/export-permissions";
import { getResolvedWorkspaceEntitlements } from "@/lib/billing/workspace-subscription";
import { buildWorkLogCustomerEmailPayload } from "@/lib/work-log-customer-email";
import {
	ABUSE_LIMITS,
	assertWorkspaceTierAbuseLimit,
} from "@/lib/abuse-limits";

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

	return {
		appUser,
		membership,
		workspace: membership.workspace,
	};
}

function normalizeWorkLogIds(value) {
	if (!Array.isArray(value)) return [];

	return Array.from(
		new Set(value.map((id) => String(id || "").trim()).filter(Boolean)),
	);
}

async function assertWorkLogEmailAccess(workspaceId) {
	const entitlements = await getResolvedWorkspaceEntitlements(workspaceId);

	if (!canUseStarterAndAboveFeature(entitlements)) {
		throw new Error("Sending work logs to customers requires Starter or higher.");
	}

	return entitlements;
}

function getResendConfig() {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.RESEND_FROM_EMAIL;

	if (!apiKey || !from) {
		throw new Error(
			"Resend is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to your environment.",
		);
	}

	return {
		apiKey,
		from,
	};
}

export async function sendWorkLogsToCustomer({ customerId, workLogIds }) {
	const { workspace } = await getWorkspaceContextOrThrow();
	const selectedWorkLogIds = normalizeWorkLogIds(workLogIds);

	if (!customerId || typeof customerId !== "string") {
		throw new Error("Select a customer.");
	}

	if (selectedWorkLogIds.length === 0) {
		throw new Error("Select at least one work log.");
	}

	const entitlements = await assertWorkLogEmailAccess(workspace.id);

	const customer = await db.customer.findFirst({
		where: {
			id: customerId,
			workspaceId: workspace.id,
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			companyName: true,
			email: true,
		},
	});

	if (!customer) {
		throw new Error("Customer not found.");
	}

	if (!customer.email) {
		throw new Error("This customer does not have an email address.");
	}

	const workLogs = await db.workLog.findMany({
		where: {
			id: {
				in: selectedWorkLogIds,
			},
			workspaceId: workspace.id,
			customerId: customer.id,
		},
		orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
		select: {
			id: true,
			title: true,
			description: true,
			completedAt: true,
			odometerValue: true,
			odometerUnit: true,
			labourCharge: true,
			partsCharge: true,
			totalCharge: true,
			nextServiceDueAt: true,
			nextServiceOdometer: true,
			nextServiceOdometerUnit: true,
			vehicle: {
				select: {
					id: true,
					registration: true,
					make: true,
					model: true,
					year: true,
				},
			},
			performedByUser: {
				select: {
					id: true,
					fullName: true,
					email: true,
				},
			},
		},
	});

	if (workLogs.length !== selectedWorkLogIds.length) {
		throw new Error("One or more selected work logs could not be found.");
	}

	await assertWorkspaceTierAbuseLimit({
		workspaceId: workspace.id,
		entitlements,
		...ABUSE_LIMITS.workLogCustomerEmail,
	});

	const { apiKey, from } = getResendConfig();
	const resend = new Resend(apiKey);
	const emailPayload = buildWorkLogCustomerEmailPayload({
		workspace,
		customer,
		workLogs,
	});

	const { data, error } = await resend.emails.send({
		from,
		to: [customer.email],
		subject: emailPayload.subject,
		html: emailPayload.html,
		text: emailPayload.text,
		attachments: [
			{
				filename: emailPayload.attachment.filename,
				content: emailPayload.attachment.content,
			},
		],
	});

	if (error) {
		throw new Error(error.message || "Resend could not send this email.");
	}

	return {
		ok: true,
		emailId: data?.id || null,
		recipient: customer.email,
		sentCount: workLogs.length,
	};
}
