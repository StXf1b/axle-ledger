"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, UserRound, CarFront, HardDrive } from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import DocumentsStats from "@/components/documents/DocumentsStats";
import DocumentsTableToolbar from "@/components/documents/DocumentsTableToolbar";
import DocumentsTable from "@/components/documents/DocumentsTable";
import { formatFileSize } from "@/lib/document-utils";

const ITEMS_PER_PAGE = 10;

export default function DocumentsPageClient({ initialDocuments }) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("All");
	const [linkedTo, setLinkedTo] = useState("All");
	const [currentPage, setCurrentPage] = useState(1);

	const filteredDocuments = useMemo(() => {
		const value = search.trim().toLowerCase();

		return initialDocuments.filter((document) => {
			const customerText = document.customer
				? `${document.customer.firstName || ""} ${document.customer.lastName || ""} ${document.customer.companyName || ""}`.toLowerCase()
				: "";

			const vehicleText = document.vehicle
				? `${document.vehicle.registration || ""} ${document.vehicle.make || ""} ${document.vehicle.model || ""}`.toLowerCase()
				: "";

			const matchesSearch =
				!value ||
				(document.title || "").toLowerCase().includes(value) ||
				(document.fileName || "").toLowerCase().includes(value) ||
				(document.mimeType || "").toLowerCase().includes(value) ||
				(document.notes || "").toLowerCase().includes(value) ||
				customerText.includes(value) ||
				vehicleText.includes(value);

			const matchesCategory =
				category === "All" ? true : document.category === category;

			const matchesLinked =
				linkedTo === "All"
					? true
					: linkedTo === "CUSTOMER"
						? !!document.customer
						: linkedTo === "VEHICLE"
							? !!document.vehicle
							: linkedTo === "UNLINKED"
								? !document.customer && !document.vehicle
								: true;

			return matchesSearch && matchesCategory && matchesLinked;
		});
	}, [initialDocuments, search, category, linkedTo]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE),
	);

	const paginatedDocuments = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	}, [filteredDocuments, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search, category, linkedTo]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const stats = useMemo(() => {
		const totalStorageBytes = initialDocuments.reduce(
			(total, document) => total + (document.sizeBytes || 0),
			0,
		);

		return {
			totalDocuments: initialDocuments.length,
			customerLinked: initialDocuments.filter((document) => !!document.customer)
				.length,
			vehicleLinked: initialDocuments.filter((document) => !!document.vehicle)
				.length,
			totalStorageBytes,
			totalStorageFormatted: formatFileSize(totalStorageBytes),
		};
	}, [initialDocuments]);

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Document management</p>
					<h2>Documents</h2>
					<p>
						Store workshop files, service records, invoices, images, and linked
						customer or vehicle documents in one place.
					</p>
				</div>

				<div className="page-header-right">
					<Button variant="secondary">Import</Button>

					<Link href="/documents/new">
						<Button variant="primary" leftIcon={<Plus size={18} />}>
							New document
						</Button>
					</Link>
				</div>
			</div>

			<DocumentsStats stats={stats} />

			<div className="card stack-md">
				<DocumentsTableToolbar
					search={search}
					onSearchChange={setSearch}
					category={category}
					onCategoryChange={setCategory}
					linkedTo={linkedTo}
					onLinkedToChange={setLinkedTo}
				/>

				<DocumentsTable
					documents={paginatedDocuments}
					onRowClick={(documentId) => router.push(`/documents/${documentId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredDocuments.length}
					itemsPerPage={ITEMS_PER_PAGE}
					onPageChange={setCurrentPage}
					label="documents"
				/>
			</div>
		</section>
	);
}
