import Link from "next/link";
import { FileText, Plus, ArrowRight, Download } from "lucide-react";
import { formatDocumentCategory, formatFileSize } from "@/lib/document-utils";
import "./LinkedDocumentsCard.css";

function formatAddedDate(dateValue) {
	if (!dateValue) return "—";

	return new Date(dateValue).toLocaleDateString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function getFileTypeLabel(document) {
	return document.fileExtension || document.mimeType || "File";
}

export default function LinkedDocumentsCard({
	title = "Linked documents",
	subtitle = "Recent files associated with this record.",
	documents = [],
	customerId = null,
	vehicleId = null,
	maxItems = 5,
}) {
	const hasMore = documents.length > maxItems;
	const visibleDocuments = documents.slice(0, maxItems);

	const params = new URLSearchParams();
	if (customerId) params.set("customerId", customerId);
	if (vehicleId) params.set("vehicleId", vehicleId);

	const createHref = `/documents/new${
		params.toString() ? `?${params.toString()}` : ""
	}`;

	const viewAllHref = `/documents${
		params.toString() ? `?${params.toString()}` : ""
	}`;

	return (
		<div className="linked-documents-card card">
			<div className="linked-documents-card__header">
				<div className="linked-documents-card__header-left">
					<p className="linked-documents-card__eyebrow">Documents</p>
					<h3 className="linked-documents-card__title">{title}</h3>
					<p className="linked-documents-card__subtitle">{subtitle}</p>
				</div>

				<div className="linked-documents-card__header-right">
					<Link href="/documents" className="btn btn-secondary btn-sm">
						View all
					</Link>
					<Link href={createHref} className="btn btn-primary btn-sm">
						<Plus size={16} />
						Add document
					</Link>
				</div>
			</div>

			{visibleDocuments.length === 0 ? (
				<div className="empty-state">
					<p className="empty-state-title">No documents linked yet</p>
					<p className="empty-state-text">
						Add service sheets, invoices, receipts, inspection files, or images
						for this record.
					</p>
				</div>
			) : (
				<div className="linked-documents-list">
					{visibleDocuments.map((document) => (
						<div key={document.id} className="linked-documents-item">
							<Link
								href={`/documents/${document.id}`}
								className="linked-documents-item__main"
							>
								<div className="linked-documents-item__top">
									<div className="linked-documents-item__title-wrap">
										<span className="linked-documents-item__icon">
											<FileText size={16} />
										</span>

										<div className="linked-documents-item__title-block">
											<p className="linked-documents-item__title">
												{document.title}
											</p>
											<p className="linked-documents-item__meta">
												{document.fileName}
											</p>
										</div>
									</div>

									<div className="linked-documents-item__badges">
										<span className="badge badge-neutral">
											{formatDocumentCategory(document.category)}
										</span>
									</div>
								</div>

								<div className="linked-documents-item__details">
									<span>{getFileTypeLabel(document)}</span>
									<span>•</span>
									<span>{formatFileSize(document.sizeBytes)}</span>
									<span>•</span>
									<span>Added {formatAddedDate(document.createdAt)}</span>
								</div>

								<div className="linked-documents-item__footer">
									<span>Open document</span>
									<ArrowRight size={16} />
								</div>
							</Link>

							<a
								href={`/api/documents/${document.id}/download`}
								className="linked-documents-item__download"
								aria-label={`Download ${document.title}`}
							>
								<Download size={16} />
							</a>
						</div>
					))}
				</div>
			)}

			{hasMore ? (
				<div className="linked-documents-card__footer">
					<Link href={viewAllHref} className="btn btn-secondary btn-sm">
						See all documents
					</Link>
				</div>
			) : null}
		</div>
	);
}
