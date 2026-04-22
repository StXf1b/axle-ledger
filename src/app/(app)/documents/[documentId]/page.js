import Link from "next/link";
import { notFound } from "next/navigation";
import {
	PencilLine,
	Download,
	UserRound,
	CarFront,
	ArrowLeft,
} from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import { formatDocumentCategory, formatFileSize } from "@/lib/document-utils";

function InfoRow({ label, value }) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				gap: "16px",
				flexWrap: "wrap",
				padding: "10px 0",
				borderBottom: "1px solid var(--border)",
			}}
		>
			<span className="text-muted">{label}</span>
			<span style={{ color: "var(--text)", textAlign: "right" }}>
				{value || "—"}
			</span>
		</div>
	);
}

function formatDate(dateValue) {
	if (!dateValue) return "—";

	return new Date(dateValue).toLocaleString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default async function DocumentDetailPage({ params }) {
	const { documentId } = await params;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const document = await db.document.findFirst({
		where: {
			id: documentId,
			workspaceId,
		},
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
	});

	if (!document) {
		notFound();
	}

	const customerLabel = document.customer
		? document.customer.companyName ||
			`${document.customer.firstName || ""} ${document.customer.lastName || ""}`.trim()
		: null;

	const vehicleLabel = document.vehicle
		? `${document.vehicle.registration} · ${document.vehicle.make} ${document.vehicle.model}`
		: null;

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<Link href="/documents" className="customer-detail-back">
						<ArrowLeft size={16} />
						Back to documents
					</Link>
					<h2>{document.title}</h2>
					<p>
						{document.fileName} · {formatDocumentCategory(document.category)}
					</p>
				</div>

				<div className="page-header-right">
					<Link href={`/documents/${document.id}/edit`}>
						<button className="btn btn-secondary">
							<PencilLine size={18} />
							Edit document
						</button>
					</Link>

					<a
						href={`/api/documents/${document.id}/download`}
						className="btn btn-primary"
					>
						<Download size={18} />
						Download file
					</a>
				</div>
			</div>

			<div className="content-grid two-col">
				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">File details</p>
							<p className="card-subtitle">
								Stored file metadata and category information
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow label="Title" value={document.title} />
						<InfoRow label="File name" value={document.fileName} />
						<InfoRow
							label="Category"
							value={formatDocumentCategory(document.category)}
						/>
						<InfoRow label="MIME type" value={document.mimeType} />
						<InfoRow label="Extension" value={document.fileExtension} />
						<InfoRow
							label="File size"
							value={formatFileSize(document.sizeBytes)}
						/>
					</div>
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Linked records</p>
							<p className="card-subtitle">
								Customer and vehicle relationships for this document
							</p>
						</div>
					</div>

					<div className="stack-md">
						<div className="card-muted stack-sm">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "10px",
								}}
							>
								<UserRound size={16} />
								<strong style={{ color: "var(--text)" }}>Customer</strong>
							</div>

							{document.customer ? (
								<Link href={`/customers/${document.customer.id}`}>
									<span style={{ color: "var(--primary)" }}>
										{customerLabel}
									</span>
								</Link>
							) : (
								<span className="text-faint">Not linked</span>
							)}
						</div>

						<div className="card-muted stack-sm">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "10px",
								}}
							>
								<CarFront size={16} />
								<strong style={{ color: "var(--text)" }}>Vehicle</strong>
							</div>

							{document.vehicle ? (
								<Link href={`/vehicles/${document.vehicle.id}`}>
									<span style={{ color: "var(--primary)" }}>
										{vehicleLabel}
									</span>
								</Link>
							) : (
								<span className="text-faint">Not linked</span>
							)}
						</div>
					</div>
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Storage & download</p>
							<p className="card-subtitle">
								Current download URL and future R2 storage reference
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow label="Storage key" value={document.fileKey} />
					</div>
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Audit</p>
							<p className="card-subtitle">
								Creation and update details for this document
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow
							label="Uploaded by"
							value={
								document.uploadedByUser?.fullName ||
								document.uploadedByUser?.email ||
								"Unknown"
							}
						/>
						<InfoRow label="Created" value={formatDate(document.createdAt)} />
						<InfoRow label="Updated" value={formatDate(document.updatedAt)} />
					</div>
				</div>
			</div>

			<div className="card stack-md">
				<div className="card-header">
					<div>
						<p className="card-title">Notes</p>
						<p className="card-subtitle">
							Internal workshop context for this document
						</p>
					</div>
				</div>

				{document.notes ? (
					<p>{document.notes}</p>
				) : (
					<p className="text-faint">No notes added for this document yet.</p>
				)}
			</div>
		</section>
	);
}
