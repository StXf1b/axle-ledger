"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { REMINDER_TYPE_OPTIONS } from "@/lib/reminder-utils";

const VALID_TYPES = new Set(REMINDER_TYPE_OPTIONS.map((item) => item.value));
const VALID_UPDATE_STATUSES = new Set(["OPEN", "COMPLETED", "CANCELLED"]);

function emptyToNull(value) {
	if (value === null || value === undefined) return null;

	const trimmed = String(value).trim();
	return trimmed ? trimmed : null;
}

function parseRequiredDate(value, fieldLabel) {
	if (!value) {
		throw new Error(`${fieldLabel} is required.`);
	}

	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`${fieldLabel} must be a valid date.`);
	}

	return parsed;
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
	};
}

function buildReminderPayload(payload) {
	const title = emptyToNull(payload.title);
	const type = emptyToNull(payload.type) || "CUSTOM";
	const notes = emptyToNull(payload.notes);
	const dueAt = parseRequiredDate(payload.dueAt, "Due date");

	if (!title) {
		throw new Error("Reminder title is required.");
	}

	if (!VALID_TYPES.has(type)) {
		throw new Error("Invalid reminder type.");
	}

	return {
		title,
		type,
		notes,
		dueAt,
	};
}

function revalidateReminderPaths({ reminderId, customerId, vehicleId }) {
	revalidatePath("/reminders");

	if (reminderId) {
		revalidatePath(`/reminders/${reminderId}`);
		revalidatePath(`/reminders/${reminderId}/edit`);
	}

	if (customerId) {
		revalidatePath(`/customers/${customerId}`);
	}

	if (vehicleId) {
		revalidatePath(`/vehicles/${vehicleId}`);
	}
}

async function getReminderOrThrow(reminderId, workspaceId) {
	const reminder = await db.reminder.findFirst({
		where: {
			id: reminderId,
			workspaceId,
		},
	});

	if (!reminder) {
		throw new Error("Reminder not found.");
	}

	return reminder;
}

export async function createReminder(payload) {
	const { appUser, workspace } = await getWorkspaceContextOrThrow();

	const baseData = buildReminderPayload(payload);
	const linkedData = await resolveLinkedEntities({
		workspaceId: workspace.id,
		customerId: payload.customerId,
		vehicleId: payload.vehicleId,
	});

	const reminder = await db.reminder.create({
		data: {
			workspaceId: workspace.id,
			createdByUserId: appUser.id,
			status: "OPEN",
			...baseData,
			...linkedData,
		},
	});

	revalidateReminderPaths({
		reminderId: reminder.id,
		customerId: linkedData.customerId,
		vehicleId: linkedData.vehicleId,
	});

	return {
		ok: true,
		reminderId: reminder.id,
	};
}

export async function updateReminder(reminderId, payload) {
	const { workspace } = await getWorkspaceContextOrThrow();

	const existingReminder = await getReminderOrThrow(reminderId, workspace.id);

	const baseData = buildReminderPayload(payload);
	const linkedData = await resolveLinkedEntities({
		workspaceId: workspace.id,
		customerId: payload.customerId,
		vehicleId: payload.vehicleId,
	});

	let nextStatus = existingReminder.status;
	let nextCompletedAt = existingReminder.completedAt;

	if (payload.status) {
		const requestedStatus = String(payload.status).trim();

		if (!VALID_UPDATE_STATUSES.has(requestedStatus)) {
			throw new Error("Invalid reminder status.");
		}

		nextStatus = requestedStatus;

		if (requestedStatus === "COMPLETED") {
			nextCompletedAt = existingReminder.completedAt || new Date();
		} else {
			nextCompletedAt = null;
		}
	}

	const reminder = await db.reminder.update({
		where: {
			id: reminderId,
		},
		data: {
			...baseData,
			...linkedData,
			status: nextStatus,
			completedAt: nextCompletedAt,
		},
	});

	revalidateReminderPaths({
		reminderId: reminder.id,
		customerId: linkedData.customerId,
		vehicleId: linkedData.vehicleId,
	});

	return {
		ok: true,
		reminderId: reminder.id,
	};
}

export async function deleteReminder(reminderId) {
	const { workspace } = await getWorkspaceContextOrThrow();

	const existingReminder = await getReminderOrThrow(reminderId, workspace.id);

	await db.reminder.delete({
		where: {
			id: reminderId,
		},
	});

	revalidateReminderPaths({
		reminderId,
		customerId: existingReminder.customerId,
		vehicleId: existingReminder.vehicleId,
	});

	return { ok: true };
}

export async function markReminderCompleted(reminderId) {
	const { workspace } = await getWorkspaceContextOrThrow();

	const existingReminder = await getReminderOrThrow(reminderId, workspace.id);

	const reminder = await db.reminder.update({
		where: {
			id: reminderId,
		},
		data: {
			status: "COMPLETED",
			completedAt: new Date(),
		},
	});

	revalidateReminderPaths({
		reminderId: reminder.id,
		customerId: existingReminder.customerId,
		vehicleId: existingReminder.vehicleId,
	});

	return { ok: true };
}

export async function reopenReminder(reminderId) {
	const { workspace } = await getWorkspaceContextOrThrow();

	const existingReminder = await getReminderOrThrow(reminderId, workspace.id);

	const reminder = await db.reminder.update({
		where: {
			id: reminderId,
		},
		data: {
			status: "OPEN",
			completedAt: null,
		},
	});

	revalidateReminderPaths({
		reminderId: reminder.id,
		customerId: existingReminder.customerId,
		vehicleId: existingReminder.vehicleId,
	});

	return { ok: true };
}

export async function cancelReminder(reminderId) {
	const { workspace } = await getWorkspaceContextOrThrow();

	const existingReminder = await getReminderOrThrow(reminderId, workspace.id);

	const reminder = await db.reminder.update({
		where: {
			id: reminderId,
		},
		data: {
			status: "CANCELLED",
			completedAt: null,
		},
	});

	revalidateReminderPaths({
		reminderId: reminder.id,
		customerId: existingReminder.customerId,
		vehicleId: existingReminder.vehicleId,
	});

	return { ok: true };
}
