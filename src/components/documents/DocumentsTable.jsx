"use client";

import { formatDocumentCategory, formatFileSize } from "@/lib/document-utils";

function getCustomerLabel(customer) {
	if (!customer) return null;
	return (
		customer.companyName ||
		`${customer.firstName || ""} ${customer.lastName || ""}`.trim()
	);
}

function getCategoryBadgeClass(category) {
	switch (category) {
		case "SERVICE_RECORD":
		case "PHOTO":
			return "badge-info";
		case "INSURANCE":
		case "TAX":
		case "NCT":
		case "WARRANTY":
			return "badge-warning";
		case "INVOICE":
		case "RECEIPT":
			return "badge-success";
		default:
			return "badge-neutral";
	}
}

function formatAddedDate(dateValue) {
	if (!dateValue) return "—";

	return new Date(dateValue).toLocaleDateString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export default function DocumentsTable({ documents, onRowClick }) {
	if (!documents.length) {
		return (
			<div className="empty-state">
				<p className="empty-state-title">No documents found</p>
				<p className="empty-state-text">
					Try adjusting your search or filters, or add your first document.
				</p>
			</div>
		);
	}

	return (
		<div className="table-wrap">
			<table className="table">
				<thead>
					<tr>
						<th>Document</th>
						<th>Category</th>
						<th>Linked to</th>
						<th>Size</th>
						<th>Type</th>
						<th>Added</th>
					</tr>
				</thead>

				<tbody>
					{documents.map((document) => {
						const customerLabel = getCustomerLabel(document.customer);
						const vehicleLabel = document.vehicle
							? `${document.vehicle.registration} · ${document.vehicle.make} ${document.vehicle.model}`
							: null;

						return (
							<tr
								key={document.id}
								onClick={() => onRowClick(document.id)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onRowClick(document.id);
									}
								}}
								tabIndex={0}
								style={{ cursor: "pointer" }}
								aria-label={`Open ${document.title}`}
							>
								<td>
									<div className="stack-sm">
										<strong style={{ color: "var(--text)" }}>
											{document.title}
										</strong>
										<span className="text-muted">{document.fileName}</span>
									</div>
								</td>

								<td>
									<span
										className={`badge ${getCategoryBadgeClass(document.category)}`}
									>
										{formatDocumentCategory(document.category)}
									</span>
								</td>

								<td>
									<div className="stack-sm">
										{vehicleLabel ? (
											<span style={{ color: "var(--text)" }}>
												{vehicleLabel}
											</span>
										) : null}

										{customerLabel ? (
											<span className="text-muted">{customerLabel}</span>
										) : null}

										{!vehicleLabel && !customerLabel ? (
											<span className="text-faint">Not linked</span>
										) : null}
									</div>
								</td>

								<td>{formatFileSize(document.sizeBytes)}</td>
								<td>{document.mimeType || document.fileExtension || "—"}</td>
								<td>{formatAddedDate(document.createdAt)}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
