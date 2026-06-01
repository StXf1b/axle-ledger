"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db";
import { getR2BucketName, getR2Client } from "@/lib/r2";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/document-utils";
import {
	getFileExtension,
	isDocumentObjectKeyForWorkspace,
	normalizeDocumentUploadFile,
} from "@/lib/document-upload";
import {
	assertWorkspaceLimit,
	assertWorkspaceFeatureEnabled,
	assertWorkspaceStorageAvailable,
} from "@/lib/billing/workspace-quotas";

const VALID_CATEGORIES = new Set(
	DOCUMENT_CATEGORY_OPTIONS.map((item) => item.value),
);
const DOCUMENT_EDIT_ROLES = new Set(["OWNER", "ADMIN"]);

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

function assertCanEditDocuments(membership) {
	if (!DOCUMENT_EDIT_ROLES.has(membership?.role)) {
		throw new Error("Only workspace admins and owners can edit documents.");
	}
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

function buildDocumentPayload(payload, workspaceId) {
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

	if (!isDocumentObjectKeyForWorkspace(fileKey, workspaceId)) {
		throw new Error("Invalid document upload key.");
	}

	if (!VALID_CATEGORIES.has(category)) {
		throw new Error("Invalid document category.");
	}

	const file = normalizeDocumentUploadFile({
		fileName,
		fileType: mimeType,
		sizeBytes: sizeBytes && sizeBytes > 0 ? sizeBytes : 1,
	});

	return {
		title,
		fileName: file.fileName,
		fileKey,
		mimeType: file.mimeType,
		notes,
		category,
		sizeBytes: file.sizeBytes,
		fileExtension: file.fileExtension,
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

async function getUploadedObjectMetadata(fileKey) {
	try {
		return await getR2Client().send(
			new HeadObjectCommand({
				Bucket: getR2BucketName(),
				Key: fileKey,
			}),
		);
	} catch (error) {
		console.error("Failed to verify R2 object:", error);
		throw new Error("Uploaded file could not be verified. Please upload it again.");
	}
}

async function verifyUploadedDocumentObject(baseData) {
	const object = await getUploadedObjectMetadata(baseData.fileKey);
	const file = normalizeDocumentUploadFile({
		fileName: baseData.fileName,
		fileType: object.ContentType || baseData.mimeType,
		sizeBytes: object.ContentLength ?? baseData.sizeBytes,
	});

	return {
		...baseData,
		fileName: file.fileName,
		mimeType: file.mimeType,
		sizeBytes: file.sizeBytes,
		fileExtension: file.fileExtension || getFileExtension(file.fileName),
	};
}

export async function createDocument(payload) {
	const { appUser, workspace } = await getWorkspaceContextOrThrow();
	await assertWorkspaceFeatureEnabled(workspace.id, "documentsEnabled");
	await assertWorkspaceLimit(workspace.id, "documents");

	const baseData = buildDocumentPayload(payload, workspace.id);
	let verifiedData;
	let linkedData;
	let document;

	try {
		verifiedData = await verifyUploadedDocumentObject(baseData);
		await assertWorkspaceStorageAvailable(workspace.id, verifiedData.sizeBytes);
		linkedData = await resolveLinkedEntities({
			workspaceId: workspace.id,
			customerId: payload.customerId,
			vehicleId: payload.vehicleId,
		});

		document = await db.document.create({
			data: {
				workspaceId: workspace.id,
				uploadedByUserId: appUser.id,
				...verifiedData,
				...linkedData,
			},
		});
	} catch (error) {
		await deleteObjectIfExists(baseData.fileKey);
		throw error;
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

export async function updateDocument(documentId, payload) {
	const { membership, workspace } = await getWorkspaceContextOrThrow();
	assertCanEditDocuments(membership);
	await assertWorkspaceFeatureEnabled(workspace.id, "documentsEnabled");

	const existingDocument = await db.document.findFirst({
		where: {
			id: documentId,
			workspaceId: workspace.id,
		},
	});

	if (!existingDocument) {
		throw new Error("Document not found.");
	}

	const baseData = buildDocumentPayload(payload, workspace.id);
	let verifiedData;
	let linkedData;
	let document;
	const shouldDeleteIncomingObject =
		baseData.fileKey &&
		baseData.fileKey !== existingDocument.fileKey &&
		isDocumentObjectKeyForWorkspace(baseData.fileKey, workspace.id);

	try {
		verifiedData = await verifyUploadedDocumentObject(baseData);
		await assertWorkspaceStorageAvailable(
			workspace.id,
			Math.max(
				0,
				verifiedData.sizeBytes - Number(existingDocument.sizeBytes || 0),
			),
		);
		linkedData = await resolveLinkedEntities({
			workspaceId: workspace.id,
			customerId: payload.customerId,
			vehicleId: payload.vehicleId,
		});

		document = await db.document.update({
			where: {
				id: documentId,
			},
			data: {
				...verifiedData,
				...linkedData,
			},
		});
	} catch (error) {
		if (shouldDeleteIncomingObject) {
			await deleteObjectIfExists(baseData.fileKey);
		}

		throw error;
	}

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
	const { membership, workspace } = await getWorkspaceContextOrThrow();
	assertCanEditDocuments(membership);

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
