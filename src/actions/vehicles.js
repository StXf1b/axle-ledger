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
		where: { clerkUserId: userId },
		include: { memberships: true },
	});

	if (!appUser || appUser.memberships.length === 0) {
		throw new Error("No workspace membership found");
	}

	return {
		workspaceId: appUser.memberships[0].workspaceId,
	};
}

function parseOptionalInt(value) {
	if (value === "" || value === null || value === undefined) return null;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalDate(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeVehiclePayload(data) {
	return {
		registration: data.registration?.trim()?.toUpperCase() || "",
		vin: data.vin?.trim() || null,
		make: data.make?.trim() || "",
		model: data.model?.trim() || "",
		year: parseOptionalInt(data.year),
		odometerValue: parseOptionalInt(data.odometerValue),
		odometerUnit: data.odometerUnit || "KM",
		fuelType: data.fuelType?.trim() || null,
		colour: data.colour?.trim() || null,
		status: data.status || "ACTIVE",
		customerId: data.customerId || null,
		taxDueAt: parseOptionalDate(data.taxDueAt),
		insuranceDueAt: parseOptionalDate(data.insuranceDueAt),
		nctDueAt: parseOptionalDate(data.nctDueAt),
		serviceDueAt: parseOptionalDate(data.serviceDueAt),
		notes: data.notes?.trim() || null,
	};
}

export async function createVehicle(data) {
	const { workspaceId } = await getWorkspaceContextOrThrow();
	const payload = normalizeVehiclePayload(data);

	if (!payload.registration) throw new Error("Registration is required");
	if (!payload.make) throw new Error("Make is required");
	if (!payload.model) throw new Error("Model is required");

	const vehicle = await db.vehicle.create({
		data: {
			workspaceId,
			...payload,
		},
	});

	revalidatePath("/vehicles");
	return { ok: true, vehicleId: vehicle.id };
}

export async function updateVehicle(vehicleId, data) {
	const { workspaceId } = await getWorkspaceContextOrThrow();

	const existing = await db.vehicle.findFirst({
		where: {
			id: vehicleId,
			workspaceId,
		},
	});

	if (!existing) throw new Error("Vehicle not found");

	const payload = normalizeVehiclePayload(data);

	if (!payload.registration) throw new Error("Registration is required");
	if (!payload.make) throw new Error("Make is required");
	if (!payload.model) throw new Error("Model is required");

	await db.vehicle.update({
		where: { id: vehicleId },
		data: payload,
	});

	revalidatePath("/vehicles");
	revalidatePath(`/vehicles/${vehicleId}`);

	return { ok: true, vehicleId };
}

export async function deleteVehicle(vehicleId) {
	const { workspaceId } = await getWorkspaceContextOrThrow();

	const existing = await db.vehicle.findFirst({
		where: {
			id: vehicleId,
			workspaceId,
		},
	});

	if (!existing) throw new Error("Vehicle not found");

	await db.vehicle.delete({
		where: { id: vehicleId },
	});

	revalidatePath("/vehicles");
	return { ok: true };
}

export async function softDeleteVehicle(vehicleId) {
	const { workspaceId } = await getWorkspaceContextOrThrow();
	const existing = await db.vehicle.findFirst({
		where: {
			id: vehicleId,
			workspaceId,
		},
	});

	if (!existing) throw new Error("Vehicle not found");

	await db.vehicle.update({
		where: { id: vehicleId },
		data: { status: "DELETED" },
	});
}
