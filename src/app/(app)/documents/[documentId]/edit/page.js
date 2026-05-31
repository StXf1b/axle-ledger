import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import DocumentEditAccessModal from "@/components/documents/DocumentEditAccessModal";
import DocumentForm from "@/components/documents/DocumentForm";

export default async function EditDocumentPage({ params }) {
	const { documentId } = await params;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;
	const canEditDocuments = ["OWNER", "ADMIN"].includes(
		context?.membership?.role,
	);

	if (!workspaceId) {
		notFound();
	}

	const [document, customers, vehicles] = await Promise.all([
		db.document.findFirst({
			where: {
				id: documentId,
				workspaceId,
			},
		}),
		db.customer.findMany({
			where: { workspaceId },
			orderBy: [
				{ companyName: "asc" },
				{ lastName: "asc" },
				{ firstName: "asc" },
			],
			select: {
				id: true,
				firstName: true,
				lastName: true,
				companyName: true,
			},
		}),
		db.vehicle.findMany({
			where: { workspaceId },
			orderBy: [{ registration: "asc" }],
			select: {
				id: true,
				registration: true,
				make: true,
				model: true,
				customerId: true,
			},
		}),
	]);

	if (!document) {
		notFound();
	}

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Documents</p>
					<h2>Edit document</h2>
					<p>Update file details, linked records, and document notes.</p>
				</div>
			</div>

			<div className="card">
				{canEditDocuments ? (
					<DocumentForm
						mode="edit"
						documentId={document.id}
						initialData={{
							...document,
							createdAt: document.createdAt.toISOString(),
							updatedAt: document.updatedAt.toISOString(),
						}}
						customers={customers}
						vehicles={vehicles}
					/>
				) : (
					<div className="stack-md">
						<p className="text-muted">
							Admin access is required to edit document records.
						</p>
						<DocumentEditAccessModal documentId={document.id} />
					</div>
				)}
			</div>
		</section>
	);
}
