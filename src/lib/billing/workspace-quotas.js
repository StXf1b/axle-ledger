import { getResolvedWorkspaceEntitlements } from "./workspace-subscription";
import {
	getWorkspaceUsage,
	buildWorkspaceUsageSummary,
} from "./workspace-usage";

const LIMIT_LABELS = {
	members: "team member",
	customers: "customer",
	vehicles: "vehicle",
	documents: "document",
	documentStorageBytes: "document storage",
	reminders: "reminder",
	workLogs: "work log",
	pendingInvites: "pending invite",
	maxUploadBytes: "upload size",
};

function buildLimitErrorMessage({ planLabel, resourceLabel, max }) {
	if (max == null) {
		return "This workspace has no limit for that resource.";
	}

	return `Your ${planLabel.toLowerCase()} plan allows up to ${max} ${resourceLabel}${max === 1 ? "" : "s"}. Upgrade your plan to increase this limit.`;
}

export async function getWorkspaceQuotaContext(workspaceId) {
	const [entitlements, usage] = await Promise.all([
		getResolvedWorkspaceEntitlements(workspaceId),
		getWorkspaceUsage(workspaceId),
	]);

	return {
		entitlements,
		usage,
		summary: buildWorkspaceUsageSummary(entitlements.limits, usage),
	};
}

export async function assertWorkspaceFeatureEnabled(workspaceId, featureKey) {
	const entitlements = await getResolvedWorkspaceEntitlements(workspaceId);

	if (!entitlements.features[featureKey]) {
		throw new Error("This feature is not available on your current plan.");
	}

	if (!entitlements.access.canCreateRecords) {
		throw new Error(
			"Your workspace can no longer create new records on the current subscription status.",
		);
	}

	return entitlements;
}

export async function assertWorkspaceLimit(
	workspaceId,
	limitKey,
	increment = 1,
) {
	const { entitlements, usage } = await getWorkspaceQuotaContext(workspaceId);

	if (!entitlements.access.canCreateRecords) {
		throw new Error(
			"Your workspace can no longer create new records on the current subscription status.",
		);
	}

	const max = entitlements.limits[limitKey];
	const current = usage[limitKey] || 0;
	const nextValue = current + increment;

	if (max != null && nextValue > max) {
		throw new Error(
			buildLimitErrorMessage({
				planLabel: entitlements.label,
				resourceLabel: LIMIT_LABELS[limitKey] || limitKey,
				max,
			}),
		);
	}

	return {
		entitlements,
		usage,
	};
}

export async function assertWorkspaceStorageAvailable(
	workspaceId,
	incomingBytes,
) {
	const { entitlements, usage } = await getWorkspaceQuotaContext(workspaceId);

	if (!entitlements.access.canCreateRecords) {
		throw new Error(
			"Your workspace can no longer create new records on the current subscription status.",
		);
	}

	const maxUploadBytes = entitlements.limits.maxUploadBytes;
	if (maxUploadBytes != null && incomingBytes > maxUploadBytes) {
		throw new Error(
			`This file exceeds your current upload limit of ${Math.round(
				maxUploadBytes / (1024 * 1024),
			)} MB.`,
		);
	}

	const maxStorageBytes = entitlements.limits.documentStorageBytes;
	const nextStorage = usage.documentStorageBytes + incomingBytes;

	if (maxStorageBytes != null && nextStorage > maxStorageBytes) {
		throw new Error(
			"Your workspace has reached its document storage limit for the current plan.",
		);
	}

	return {
		entitlements,
		usage,
	};
}
