import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "@/lib/db";
import { getR2BucketName, getR2Client } from "@/lib/r2";
import {
	buildDocumentObjectKey,
	normalizeDocumentUploadFile,
} from "@/lib/document-upload";
import {
	assertWorkspaceFeatureEnabled,
	assertWorkspaceLimit,
	assertWorkspaceStorageAvailable,
} from "@/lib/billing/workspace-quotas";
import {
	buildRateLimitKey,
	checkRateLimit,
	createRateLimitResponse,
} from "@/lib/rate-limit";
import {
	ABUSE_LIMITS,
	assertWorkspaceAbuseLimit,
	createAbuseLimitResponse,
	isAbuseLimitError,
} from "@/lib/abuse-limits";

export const runtime = "nodejs";

async function getWorkspaceContextOrThrow() {
	const { userId } = await auth();

	if (!userId) {
		throw new Error("Unauthorized");
	}

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

export async function POST(req) {
	try {
		const { appUser, workspace } = await getWorkspaceContextOrThrow();
		const rateLimit = checkRateLimit({
			key: buildRateLimitKey(["documents:upload-url", appUser.id]),
			limit: 20,
			windowMs: 60 * 1000,
		});

		if (!rateLimit.allowed) {
			return createRateLimitResponse(
				rateLimit,
				"Too many upload requests. Please wait a minute and try again.",
			);
		}

		let body = null;

		try {
			body = await req.json();
		} catch {
			return Response.json(
				{ error: "Upload request body must be valid JSON." },
				{ status: 400 },
			);
		}

		let file;

		try {
			file = normalizeDocumentUploadFile({
				fileName: body.fileName,
				fileType: body.fileType,
				sizeBytes: body.sizeBytes,
			});
		} catch (error) {
			return Response.json(
				{ error: error?.message || "Invalid upload request." },
				{ status: 400 },
			);
		}

		const title = String(body.title || "").trim();

		try {
			await assertWorkspaceFeatureEnabled(workspace.id, "documentsEnabled");
			await assertWorkspaceLimit(workspace.id, "documents");
			await assertWorkspaceStorageAvailable(workspace.id, file.sizeBytes);
			await assertWorkspaceAbuseLimit({
				workspaceId: workspace.id,
				...ABUSE_LIMITS.documentUploadUrl,
			});
		} catch (error) {
			if (isAbuseLimitError(error)) {
				return createAbuseLimitResponse(error);
			}

			return Response.json(
				{ error: error?.message || "Upload is not allowed." },
				{ status: 403 },
			);
		}

		const key = buildDocumentObjectKey({
			workspaceId: workspace.id,
			title,
			fileName: file.fileName,
		});

		const uploadUrl = await getSignedUrl(
			getR2Client(),
			new PutObjectCommand({
				Bucket: getR2BucketName(),
				Key: key,
				ContentType: file.mimeType,
			}),
			{ expiresIn: 60 },
		);

		return Response.json({
			uploadUrl,
			key,
		});
	} catch (error) {
		if (isAbuseLimitError(error)) {
			return createAbuseLimitResponse(error);
		}

		console.error("Upload URL error:", error);
		return Response.json(
			{ error: error?.message || "Failed to create upload URL." },
			{ status: 500 },
		);
	}
}
