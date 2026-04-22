import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import DocumentsPageClient from "./DocumentsPageClient";

export default async function DocumentsPage({ searchParams }) {
	const params = await searchParams;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const where = {
		workspaceId,
		...(params?.customerId ? { customerId: params.customerId } : {}),
		...(params?.vehicleId ? { vehicleId: params.vehicleId } : {}),
	};

	const documents = await db.document.findMany({
		where,
		include: {
			customer: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					companyName: true,
				},
			},
			vehicle: {
				select: {
					id: true,
					registration: true,
					make: true,
					model: true,
				},
			},
			uploadedByUser: {
				select: {
					id: true,
					fullName: true,
					email: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	const initialDocuments = documents.map((document) => ({
		...document,
		createdAt: document.createdAt.toISOString(),
		updatedAt: document.updatedAt.toISOString(),
	}));

	return <DocumentsPageClient initialDocuments={initialDocuments} />;
}
