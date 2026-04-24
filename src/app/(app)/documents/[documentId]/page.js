import Link from "next/link";
import { notFound } from "next/navigation";
import {
	PencilLine,
	Download,
	UserRound,
	CarFront,
	ArrowLeft,
	FileText,
	HardDrive,
	ShieldCheck,
} from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import { formatDocumentCategory, formatFileSize } from "@/lib/document-utils";
import "./DocumentDetailPage.css";

function formatDateTime(dateValue) {
	if (!dateValue) return "—";

	return new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(dateValue));
}

function getCustomerLabel(customer) {
	if (!customer) return null;

	return (
		customer.companyName ||
		`${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
		null
	);
}

function getVehicleLabel(vehicle) {
	if (!vehicle) return null;
	return `${vehicle.registration} · ${vehicle.make} ${vehicle.model}`;
}

function InfoRow({ label, value }) {
	return (
		<div className="document-info-row">
			<span className="document-info-row__label">{label}</span>
			<span className="document-info-row__value">{value || "—"}</span>
		</div>
	);
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

	const customerLabel = getCustomerLabel(document.customer);
	const vehicleLabel = getVehicleLabel(document.vehicle);

	return (
		<section className="document-detail-page">
			<div className="document-detail-page__topbar">
				<Link href="/documents" className="document-detail-back">
					<ArrowLeft size={16} />
					Back to documents
				</Link>

				<div className="document-detail-page__actions">
					<Link
						href={`/documents/${document.id}/edit`}
						className="btn btn-secondary"
					>
						<PencilLine size={18} />
						Edit document
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

			<div className="document-hero card">
				<div className="document-hero__left">
					<div className="document-hero__avatar">
						<FileText size={28} />
					</div>

					<div className="document-hero__identity">
						<div className="document-hero__heading">
							<h2>{document.title}</h2>
							<span className="badge badge-info">
								{formatDocumentCategory(document.category)}
							</span>
						</div>

						<p className="document-hero__sub">{document.fileName}</p>
					</div>
				</div>

				<div className="document-hero__stats">
					<div className="document-mini-stat">
						<p>File size</p>
						<h4>{formatFileSize(document.sizeBytes)}</h4>
					</div>

					<div className="document-mini-stat">
						<p>Linked customer</p>
						<h4>{customerLabel || "—"}</h4>
					</div>
				</div>
			</div>

			<div className="document-detail-grid">
				<div className="card stack-md">
					<div className="document-detail-card__header">
						<div className="document-detail-card__title-wrap">
							<span className="document-detail-card__icon">
								<FileText size={16} />
							</span>
							<div>
								<h3 className="document-detail-card__title">File details</h3>
								<p className="document-detail-card__subtitle">
									Stored file metadata and category information.
								</p>
							</div>
						</div>
					</div>

					<div className="document-detail-list">
						<InfoRow label="Title" value={document.title} />
						<InfoRow label="File name" value={document.fileName} />
						<InfoRow
							label="Category"
							value={formatDocumentCategory(document.category)}
						/>
						<InfoRow label="MIME type" value={document.mimeType} />
						<InfoRow
							label="Extension"
							value={
								document.fileExtension ? `.${document.fileExtension}` : "—"
							}
						/>
						<InfoRow
							label="File size"
							value={formatFileSize(document.sizeBytes)}
						/>
					</div>
				</div>

				<div className="card stack-md">
					<div className="document-detail-card__header">
						<div className="document-detail-card__title-wrap">
							<span className="document-detail-card__icon">
								<UserRound size={16} />
							</span>
							<div>
								<h3 className="document-detail-card__title">Linked records</h3>
								<p className="document-detail-card__subtitle">
									Customer and vehicle relationships for this document.
								</p>
							</div>
						</div>
					</div>

					<div className="document-linked-grid">
						<div className="document-linked-card">
							<div className="document-linked-card__top">
								<UserRound size={16} />
								<strong>Customer</strong>
							</div>

							{document.customer ? (
								<Link
									href={`/customers/${document.customer.id}`}
									className="document-linked-card__link"
								>
									{customerLabel}
								</Link>
							) : (
								<p className="document-linked-card__empty">Not linked</p>
							)}
						</div>

						<div className="document-linked-card">
							<div className="document-linked-card__top">
								<CarFront size={16} />
								<strong>Vehicle</strong>
							</div>

							{document.vehicle ? (
								<Link
									href={`/vehicles/${document.vehicle.id}`}
									className="document-linked-card__link"
								>
									{vehicleLabel}
								</Link>
							) : (
								<p className="document-linked-card__empty">Not linked</p>
							)}
						</div>
					</div>
				</div>

				<div className="card stack-md">
					<div className="document-detail-card__header">
						<div className="document-detail-card__title-wrap">
							<span className="document-detail-card__icon">
								<HardDrive size={16} />
							</span>
							<div>
								<h3 className="document-detail-card__title">Storage details</h3>
								<p className="document-detail-card__subtitle">
									Storage reference and file delivery details.
								</p>
							</div>
						</div>
					</div>

					<div className="document-detail-list">
						<InfoRow label="Storage key" value={document.fileKey} />
						<InfoRow label="Download ready" value="Available" />
					</div>
				</div>

				<div className="card stack-md">
					<div className="document-detail-card__header">
						<div className="document-detail-card__title-wrap">
							<span className="document-detail-card__icon">
								<ShieldCheck size={16} />
							</span>
							<div>
								<h3 className="document-detail-card__title">Audit</h3>
								<p className="document-detail-card__subtitle">
									Creation and update information for this file.
								</p>
							</div>
						</div>
					</div>

					<div className="document-detail-list">
						<InfoRow
							label="Uploaded by"
							value={
								document.uploadedByUser?.fullName ||
								document.uploadedByUser?.email ||
								"Unknown"
							}
						/>
						<InfoRow
							label="Created"
							value={formatDateTime(document.createdAt)}
						/>
						<InfoRow
							label="Updated"
							value={formatDateTime(document.updatedAt)}
						/>
					</div>
				</div>
			</div>

			<div className="card stack-md">
				<div className="document-detail-card__header">
					<div className="document-detail-card__title-wrap">
						<span className="document-detail-card__icon">
							<FileText size={16} />
						</span>
						<div>
							<h3 className="document-detail-card__title">Notes</h3>
							<p className="document-detail-card__subtitle">
								Internal workshop context for this document.
							</p>
						</div>
					</div>
				</div>

				<div className="document-notes-box">
					<p>{document.notes || "No notes added for this document yet."}</p>
				</div>
			</div>
		</section>
	);
}
