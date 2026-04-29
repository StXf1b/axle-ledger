import { db } from "@/lib/db";

export async function getWorkspaceUsage(workspaceId) {
	const [
		members,
		customers,
		vehicles,
		documents,
		documentStorageAgg,
		reminders,
		workLogs,
		pendingInvites,
	] = await Promise.all([
		db.workspaceMember.count({
			where: {
				workspaceId,
			},
		}),
		db.customer.count({
			where: {
				workspaceId,
			},
		}),
		db.vehicle.count({
			where: {
				workspaceId,
			},
		}),
		db.document.count({
			where: {
				workspaceId,
			},
		}),
		db.document.aggregate({
			where: {
				workspaceId,
			},
			_sum: {
				sizeBytes: true,
			},
		}),
		db.reminder.count({
			where: {
				workspaceId,
			},
		}),
		db.workLog.count({
			where: {
				workspaceId,
			},
		}),
		db.workspaceInvite.count({
			where: {
				workspaceId,
				status: "PENDING",
			},
		}),
	]);

	return {
		members,
		customers,
		vehicles,
		documents,
		documentStorageBytes: Number(documentStorageAgg._sum.sizeBytes || 0),
		reminders,
		workLogs,
		pendingInvites,
	};
}

export function buildWorkspaceUsageSummary(limits, usage) {
	const summary = {};

	for (const [key, current] of Object.entries(usage)) {
		const max = limits[key] ?? null;

		summary[key] = {
			current,
			max,
			remaining: max == null ? null : Math.max(max - current, 0),
			isUnlimited: max == null,
			percent:
				max == null || max === 0
					? null
					: Math.min(Math.round((current / max) * 100), 100),
		};
	}

	return summary;
}
