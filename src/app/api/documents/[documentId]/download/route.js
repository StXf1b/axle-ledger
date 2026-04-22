import { auth } from "@clerk/nextjs/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

import { db } from "@/lib/db";
import { getR2BucketName, getR2Client } from "@/lib/r2";

export const runtime = "nodejs";

async function getWorkspaceContextOrThrow() {
	const { userId } = await auth();

	if (!userId) {
		throw new Error("Unauthorized");
	}

	const appUser = await db.user.findUnique({
		where: { clerkUserId: userId },
		include: {
			memberships: true, // ! maybe workspace is needed here?
		},
	});

	if (!appUser || appUser.memberships.length === 0) {
		throw new Error("No workspace membership found");
	}

	return {
		appUser,
		membership: appUser.memberships[0],
	};
}

function toWebStream(body) {
	if (!body) return null;

	if (typeof body.transformToWebStream === "function") {
		return body.transformToWebStream();
	}

	if (body instanceof Readable) {
		return Readable.toWeb(body);
	}

	return body;
}

export async function GET(_req, { params }) {
	try {
		const { documentId } = await params;
		const { membership } = await getWorkspaceContextOrThrow();

		const document = await db.document.findFirst({
			where: {
				id: documentId,
				workspaceId: membership.workspaceId,
			},
		});

		if (!document) {
			return new Response("Document not found", { status: 404 });
		}

		const object = await getR2Client().send(
			new GetObjectCommand({
				Bucket: getR2BucketName(),
				Key: document.fileKey,
			}),
		);

		const stream = toWebStream(object.Body);

		return new Response(stream, {
			headers: {
				"Content-Type": object.ContentType || "application/octet-stream",
				"Content-Disposition": `attachment; filename="${document.fileName}"`,
				...(object.ContentLength
					? { "Content-Length": String(object.ContentLength) }
					: {}),
			},
		});
	} catch (error) {
		console.error("Document download error:", error);
		return new Response("Failed to download document", { status: 500 });
	}
}
