"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
	assertWorkspaceLimit,
	assertWorkspaceFeatureEnabled,
} from "@/lib/billing/workspace-quotas";

function emptyToNull(value) {
	if (value === null || value === undefined) return null;
	const trimmed = String(value).trim();
	return trimmed ? trimmed : null;
}

function parseRequiredDate(value, label) {
	if (!value) {
		throw new Error(`${label} is required.`);
	}

	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`${label} must be a valid date.`);
	}

	return parsed;
}

function parseOptionalDate(value) {
	if (!value) return null;

	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		throw new Error("Invalid date provided.");
	}

	return parsed;
}

function parseOptionalInt(value, label) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${label} must be a valid number.`);
	}

	return Math.round(parsed);
}

function parseMoney(value) {
	if (value === null || value === undefined || value === "") {
		return 0;
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error("Charge values must be valid positive numbers.");
	}

	return Number(parsed.toFixed(2));
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

async function resolveLinkedEntities({ workspaceId, customerId, vehicleId }) {
	const normalizedCustomerId = emptyToNull(customerId);
	const normalizedVehicleId = emptyToNull(vehicleId);

	if (!normalizedCustomerId && !normalizedVehicleId) {
		throw new Error("Select at least a customer or vehicle.");
	}

	const [customer, vehicle] = await Promise.all([
		normalizedCustomerId
			? db.customer.findFirst({
					where: {
						id: normalizedCustomerId,
						workspaceId,
					},
				})
			: null,
		normalizedVehicleId
			? db.vehicle.findFirst({
					where: {
						id: normalizedVehicleId,
						workspaceId,
					},
				})
			: null,
	]);

	if (normalizedCustomerId && !customer) {
		throw new Error("Selected customer was not found.");
	}

	if (normalizedVehicleId && !vehicle) {
		throw new Error("Selected vehicle was not found.");
	}

	if (
		vehicle?.customerId &&
		normalizedCustomerId &&
		vehicle.customerId !== normalizedCustomerId
	) {
		throw new Error(
			"Selected vehicle is already linked to a different customer.",
		);
	}

	return {
		customerId: normalizedCustomerId || vehicle?.customerId || null,
		vehicleId: normalizedVehicleId || null,
		vehicle,
	};
}

async function resolvePerformedByUserId({
	workspaceId,
	performedByUserId,
	fallbackUserId,
}) {
	const targetUserId = emptyToNull(performedByUserId) || fallbackUserId;

	const member = await db.workspaceMember.findFirst({
		where: {
			workspaceId,
			userId: targetUserId,
		},
	});

	if (!member) {
		throw new Error("Selected staff member is not part of this workspace.");
	}

	return targetUserId;
}

function buildWorkLogPayload(payload) {
	const title = emptyToNull(payload.title);
	const description = emptyToNull(payload.description);
	const notes = emptyToNull(payload.notes);
	const completedAt = parseRequiredDate(payload.completedAt, "Completed date");

	const odometerValue = parseOptionalInt(
		payload.odometerValue,
		"Odometer reading",
	);
	const odometerUnit =
		emptyToNull(payload.odometerUnit) || (odometerValue !== null ? "KM" : null);

	const labourCharge = parseMoney(payload.labourCharge);
	const partsCharge = parseMoney(payload.partsCharge);
	const totalCharge = Number((labourCharge + partsCharge).toFixed(2));

	const nextServiceDueAt = parseOptionalDate(payload.nextServiceDueAt);
	const nextServiceOdometer = parseOptionalInt(
		payload.nextServiceOdometer,
		"Next service odometer",
	);
	const nextServiceOdometerUnit =
		emptyToNull(payload.nextServiceOdometerUnit) ||
		(nextServiceOdometer !== null ? "KM" : null);

	if (!title) {
		throw new Error("Work log title is required.");
	}

	return {
		title,
		description,
		notes,
		completedAt,
		odometerValue,
		odometerUnit,
		labourCharge,
		partsCharge,
		totalCharge,
		nextServiceDueAt,
		nextServiceOdometer,
		nextServiceOdometerUnit,
	};
}

async function syncVehicleFromWorkLog(tx, vehicleId, payload) {
	if (!vehicleId) return;

	const vehicle = await tx.vehicle.findUnique({
		where: {
			id: vehicleId,
		},
	});

	if (!vehicle) return;

	const nextData = {};

	if (payload.odometerValue !== null) {
		const nextUnit = payload.odometerUnit || vehicle.odometerUnit || "KM";

		const shouldAdvanceOdometer =
			vehicle.odometerValue === null ||
			vehicle.odometerValue === undefined ||
			payload.odometerValue >= vehicle.odometerValue ||
			nextUnit !== vehicle.odometerUnit;

		if (shouldAdvanceOdometer) {
			nextData.odometerValue = payload.odometerValue;
			nextData.odometerUnit = nextUnit;
		}
	}

	if (payload.nextServiceDueAt) {
		nextData.serviceDueAt = payload.nextServiceDueAt;
	}

	if (Object.keys(nextData).length > 0) {
		await tx.vehicle.update({
			where: {
				id: vehicleId,
			},
			data: nextData,
		});
	}
}

function revalidateWorkLogPaths({ workLogId, customerId, vehicleId }) {
	revalidatePath("/work-logs");

	if (workLogId) {
		revalidatePath(`/work-logs/${workLogId}`);
		revalidatePath(`/work-logs/${workLogId}/edit`);
	}

	if (customerId) {
		revalidatePath(`/customers/${customerId}`);
	}

	if (vehicleId) {
		revalidatePath(`/vehicles/${vehicleId}`);
	}
}

async function getWorkLogOrThrow(workLogId, workspaceId) {
	const workLog = await db.workLog.findFirst({
		where: {
			id: workLogId,
			workspaceId,
		},
	});

	if (!workLog) {
		throw new Error("Work log not found.");
	}

	return workLog;
}

export async function createWorkLog(payload) {
	const { appUser, workspace } = await getWorkspaceContextOrThrow();
	await assertWorkspaceFeatureEnabled(workspace.id, "workLogsEnabled");
	await assertWorkspaceLimit(workspace.id, "workLogs");

	const baseData = buildWorkLogPayload(payload);
	const linked = await resolveLinkedEntities({
		workspaceId: workspace.id,
		customerId: payload.customerId,
		vehicleId: payload.vehicleId,
	});

	const performedByUserId = await resolvePerformedByUserId({
		workspaceId: workspace.id,
		performedByUserId: payload.performedByUserId,
		fallbackUserId: appUser.id,
	});

	const result = await db.$transaction(async (tx) => {
		const workLog = await tx.workLog.create({
			data: {
				workspaceId: workspace.id,
				customerId: linked.customerId,
				vehicleId: linked.vehicleId,
				performedByUserId,
				createdByUserId: appUser.id,
				...baseData,
			},
		});

		await syncVehicleFromWorkLog(tx, linked.vehicleId, baseData);

		return workLog;
	});

	revalidateWorkLogPaths({
		workLogId: result.id,
		customerId: linked.customerId,
		vehicleId: linked.vehicleId,
	});

	return {
		ok: true,
		workLogId: result.id,
	};
}

export async function updateWorkLog(workLogId, payload) {
	const { appUser, workspace } = await getWorkspaceContextOrThrow();

	const existingWorkLog = await getWorkLogOrThrow(workLogId, workspace.id);

	const baseData = buildWorkLogPayload(payload);
	const linked = await resolveLinkedEntities({
		workspaceId: workspace.id,
		customerId: payload.customerId,
		vehicleId: payload.vehicleId,
	});

	const performedByUserId = await resolvePerformedByUserId({
		workspaceId: workspace.id,
		performedByUserId: payload.performedByUserId,
		fallbackUserId: appUser.id,
	});

	const result = await db.$transaction(async (tx) => {
		const workLog = await tx.workLog.update({
			where: {
				id: workLogId,
			},
			data: {
				customerId: linked.customerId,
				vehicleId: linked.vehicleId,
				performedByUserId,
				...baseData,
			},
		});

		await syncVehicleFromWorkLog(tx, linked.vehicleId, baseData);

		return workLog;
	});

	revalidateWorkLogPaths({
		workLogId: result.id,
		customerId: linked.customerId,
		vehicleId: linked.vehicleId,
	});

	if (
		existingWorkLog.customerId !== linked.customerId &&
		existingWorkLog.customerId
	) {
		revalidatePath(`/customers/${existingWorkLog.customerId}`);
	}

	if (
		existingWorkLog.vehicleId !== linked.vehicleId &&
		existingWorkLog.vehicleId
	) {
		revalidatePath(`/vehicles/${existingWorkLog.vehicleId}`);
	}

	return {
		ok: true,
		workLogId: result.id,
	};
}

export async function deleteWorkLog(workLogId) {
	const { workspace } = await getWorkspaceContextOrThrow();

	const existingWorkLog = await getWorkLogOrThrow(workLogId, workspace.id);

	await db.workLog.delete({
		where: {
			id: workLogId,
		},
	});

	revalidateWorkLogPaths({
		workLogId,
		customerId: existingWorkLog.customerId,
		vehicleId: existingWorkLog.vehicleId,
	});

	return { ok: true };
}
