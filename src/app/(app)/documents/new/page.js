import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import DocumentForm from "@/components/documents/DocumentForm";

export default async function NewDocumentPage() {
	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const [customers, vehicles] = await Promise.all([
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

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Documents</p>
					<h2>New document</h2>
					<p>
						Create a document record now using a file URL. You can swap this to
						a real R2 upload flow later without changing the rest of the
						feature.
					</p>
				</div>
			</div>

			<div className="card">
				<DocumentForm customers={customers} vehicles={vehicles} />
			</div>
		</section>
	);
}
