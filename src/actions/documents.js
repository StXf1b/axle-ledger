"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db";
import { getR2BucketName, getR2Client } from "@/lib/r2";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/document-utils";
import { getFileExtension } from "@/lib/document-upload";
import {
	assertWorkspaceLimit,
	assertWorkspaceFeatureEnabled,
	assertWorkspaceStorageAvailable,
} from "@/lib/billing/workspace-quotas";

const VALID_CATEGORIES = new Set(
	DOCUMENT_CATEGORY_OPTIONS.map((item) => item.value),
);

function emptyToNull(value) {
	if (value === null || value === undefined) return null;
	const trimmed = String(value).trim();
	return trimmed ? trimmed : null;
}

function parseNullableInt(value, fieldLabel) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${fieldLabel} must be a valid number.`);
	}

	return Math.round(parsed);
}

async function getWorkspaceContextOrThrow() {
	const { userId } = await auth();

	if (!userId) throw new Error("Unauthorized");

	const appUser = await db.user.findUnique({
		where: { clerkUserId: userId },
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

	return {
		appUser,
		membership: appUser.memberships[0],
		workspace: appUser.memberships[0].workspace,
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

function buildDocumentPayload(payload) {
	const title = emptyToNull(payload.title);
	const fileName = emptyToNull(payload.fileName);
	const fileKey = emptyToNull(payload.fileKey);
	const mimeType = emptyToNull(payload.mimeType);
	const notes = emptyToNull(payload.notes);
	const category = emptyToNull(payload.category) || "GENERAL";
	const sizeBytes = parseNullableInt(payload.sizeBytes, "File size");

	if (!title) {
		throw new Error("Document title is required.");
	}

	if (!fileName) {
		throw new Error("File name is required.");
	}

	if (!fileKey) {
		throw new Error("File key is required.");
	}

	if (!VALID_CATEGORIES.has(category)) {
		throw new Error("Invalid document category.");
	}

	return {
		title,
		fileName,
		fileKey,
		mimeType,
		notes,
		category,
		sizeBytes,
		fileExtension: getFileExtension(fileName),
	};
}

function revalidateDocumentPaths({ documentId, customerId, vehicleId }) {
	revalidatePath("/documents");

	if (documentId) {
		revalidatePath(`/documents/${documentId}`);
		revalidatePath(`/documents/${documentId}/edit`);
	}

	if (customerId) {
		revalidatePath(`/customers/${customerId}`);
	}

	if (vehicleId) {
		revalidatePath(`/vehicles/${vehicleId}`);
	}
}

async function deleteObjectIfExists(fileKey) {
	if (!fileKey) return;

	try {
		await getR2Client().send(
			new DeleteObjectCommand({
				Bucket: getR2BucketName(),
				Key: fileKey,
			}),
		);
	} catch (error) {
		console.error("Failed to delete R2 object:", error);
	}
}

export async function createDocument(payload) {
	const { appUser, workspace } = await getWorkspaceContextOrThrow();
	await assertWorkspaceFeatureEnabled(workspace.id, "documentsEnabled");
	await assertWorkspaceLimit(workspace.id, "documents");
	await assertWorkspaceStorageAvailable(
		workspace.id,
		Number(payload.sizeBytes),
	);
	const baseData = buildDocumentPayload(payload);
	const linkedData = await resolveLinkedEntities({
		workspaceId: workspace.id,
		customerId: payload.customerId,
		vehicleId: payload.vehicleId,
	});

	const document = await db.document.create({
		data: {
			workspaceId: workspace.id,
			uploadedByUserId: appUser.id,
			...baseData,
			...linkedData,
		},
	});

	revalidateDocumentPaths({
		documentId: document.id,
		customerId: linkedData.customerId,
		vehicleId: linkedData.vehicleId,
	});

	return {
		ok: true,
		documentId: document.id,
	};
}

export async function updateDocument(documentId, payload) {
	const { workspace } = await getWorkspaceContextOrThrow();
	await assertWorkspaceFeatureEnabled(workspace.id, "documentsEnabled");
	await assertWorkspaceLimit(workspace.id, "documents");
	await assertWorkspaceStorageAvailable(
		workspace.id,
		Number(payload.sizeBytes),
	);

	const existingDocument = await db.document.findFirst({
		where: {
			id: documentId,
			workspaceId: workspace.id,
		},
	});

	if (!existingDocument) {
		throw new Error("Document not found.");
	}

	const baseData = buildDocumentPayload(payload);
	const linkedData = await resolveLinkedEntities({
		workspaceId: workspace.id,
		customerId: payload.customerId,
		vehicleId: payload.vehicleId,
	});

	const document = await db.document.update({
		where: {
			id: documentId,
		},
		data: {
			...baseData,
			...linkedData,
		},
	});

	if (
		existingDocument.fileKey &&
		existingDocument.fileKey !== document.fileKey
	) {
		await deleteObjectIfExists(existingDocument.fileKey);
	}

	revalidateDocumentPaths({
		documentId: document.id,
		customerId: linkedData.customerId,
		vehicleId: linkedData.vehicleId,
	});

	return {
		ok: true,
		documentId: document.id,
	};
}

export async function deleteDocument(documentId) {
	const { workspace } = await getWorkspaceContextOrThrow();

	const existingDocument = await db.document.findFirst({
		where: {
			id: documentId,
			workspaceId: workspace.id,
		},
	});

	if (!existingDocument) {
		throw new Error("Document not found.");
	}

	await db.document.delete({
		where: {
			id: documentId,
		},
	});

	await deleteObjectIfExists(existingDocument.fileKey);

	revalidateDocumentPaths({
		documentId,
		customerId: existingDocument.customerId,
		vehicleId: existingDocument.vehicleId,
	});

	return { ok: true };
}
