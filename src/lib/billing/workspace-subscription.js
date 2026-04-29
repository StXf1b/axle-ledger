import { db } from "@/lib/db";
import { WORKSPACE_PLAN_DEFINITIONS } from "./workspace-plans";

function asPlainObject(value) {
	return value && typeof value === "object" && !Array.isArray(value)
		? value
		: {};
}

function mergeWithOverrides(base, overrides) {
	const safeOverrides = asPlainObject(overrides);
	return {
		...base,
		...safeOverrides,
	};
}

export async function ensureWorkspaceSubscription(workspaceId) {
	return db.workspaceSubscription.upsert({
		where: {
			workspaceId,
		},
		update: {},
		create: {
			workspaceId,
			billingProvider: "MANUAL",
			tier: "TRIAL",
			status: "TRIALING",
			trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
		},
	});
}

export function resolveWorkspaceEntitlements(subscription) {
	const tier = subscription?.tier || "TRIAL";
	const basePlan =
		WORKSPACE_PLAN_DEFINITIONS[tier] || WORKSPACE_PLAN_DEFINITIONS.TRIAL;

	const limits = mergeWithOverrides(
		basePlan.limits,
		subscription?.limitOverrides,
	);
	const features = mergeWithOverrides(
		basePlan.features,
		subscription?.featureOverrides,
	);

	const now = new Date();
	const isTrialExpired =
		subscription?.status === "TRIALING" &&
		subscription?.trialEndsAt &&
		new Date(subscription.trialEndsAt) < now;

	const canCreateRecords =
		!["CANCELED", "EXPIRED"].includes(subscription?.status || "TRIALING") &&
		!isTrialExpired;

	return {
		tier,
		label: basePlan.label,
		status: subscription?.status || "TRIALING",
		billingProvider: subscription?.billingProvider || "MANUAL",
		limits,
		features,
		billing: basePlan.billing,
		trialEndsAt: subscription?.trialEndsAt || null,
		currentPeriodStart: subscription?.currentPeriodStart || null,
		currentPeriodEnd: subscription?.currentPeriodEnd || null,
		cancelAtPeriodEnd: !!subscription?.cancelAtPeriodEnd,
		access: {
			isTrialExpired,
			canCreateRecords,
		},
	};
}

export async function getResolvedWorkspaceEntitlements(workspaceId) {
	const subscription = await ensureWorkspaceSubscription(workspaceId);
	return resolveWorkspaceEntitlements(subscription);
}
