import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "@/lib/db";
import { getR2BucketName, getR2Client } from "@/lib/r2";
import { buildDocumentObjectKey } from "@/lib/document-upload";

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
		const { workspace } = await getWorkspaceContextOrThrow();
		const body = await req.json();

		const fileName = String(body.fileName || "").trim();
		const fileType = String(body.fileType || "application/octet-stream");
		const title = String(body.title || "").trim();

		if (!fileName) {
			return Response.json(
				{ error: "File name is required." },
				{ status: 400 },
			);
		}

		const key = buildDocumentObjectKey({
			workspaceId: workspace.id,
			title,
			fileName,
		});

		const uploadUrl = await getSignedUrl(
			getR2Client(),
			new PutObjectCommand({
				Bucket: getR2BucketName(),
				Key: key,
				ContentType: fileType,
			}),
			{ expiresIn: 60 },
		);

		return Response.json({
			uploadUrl,
			key,
		});
	} catch (error) {
		console.error("Upload URL error:", error);
		return Response.json(
			{ error: error?.message || "Failed to create upload URL." },
			{ status: 500 },
		);
	}
}
