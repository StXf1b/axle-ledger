"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import DocumentsStats from "@/components/documents/DocumentsStats";
import DocumentsTableToolbar from "@/components/documents/DocumentsTableToolbar";
import DocumentsTable from "@/components/documents/DocumentsTable";
import { formatFileSize } from "@/lib/document-utils";

export default function DocumentsPageClient({
	documents,
	totalCount,
	stats,
	currentPage,
	pageSize,
	currentSearch,
	currentCategory,
	currentLinkedTo,
	currentCustomerId,
	currentVehicleId,
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [searchInput, setSearchInput] = useState(currentSearch);

	useEffect(() => {
		setSearchInput(currentSearch);
	}, [currentSearch]);

	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

	const updateUrlParams = useCallback(
		(updates) => {
			const params = new URLSearchParams(searchParams.toString());

			Object.entries(updates).forEach(([key, value]) => {
				if (
					value === null ||
					value === undefined ||
					value === "" ||
					value === "All"
				) {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});

			// preserve linked context filters if they already exist
			if (currentCustomerId && !params.has("customerId")) {
				params.set("customerId", currentCustomerId);
			}

			if (currentVehicleId && !params.has("vehicleId")) {
				params.set("vehicleId", currentVehicleId);
			}

			const queryString = params.toString();

			startTransition(() => {
				router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
					scroll: false,
				});
			});
		},
		[currentCustomerId, currentVehicleId, pathname, router, searchParams],
	);

	function handleSearchSubmit(event) {
		event.preventDefault();

		const trimmedValue = searchInput.trim();

		if (trimmedValue === currentSearch) return;

		updateUrlParams({
			search: trimmedValue || null,
			page: 1,
		});
	}

	function handleClearSearch() {
		setSearchInput("");

		if (!currentSearch) return;

		updateUrlParams({
			search: null,
			page: 1,
		});
	}

	function handleCategoryChange(nextCategory) {
		updateUrlParams({
			category: nextCategory,
			page: 1,
		});
	}

	function handleLinkedToChange(nextLinkedTo) {
		updateUrlParams({
			linkedTo: nextLinkedTo,
			page: 1,
		});
	}

	function handlePageChange(nextPage) {
		updateUrlParams({
			page: nextPage <= 1 ? null : nextPage,
		});
	}

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="vehicles-page__eyebrow">Document management</p>
					<h2>Documents</h2>
					<p>
						Store workshop files, service records, invoices, images, and linked
						customer or vehicle documents in one place.
					</p>
				</div>

				{/* Change the class to DocumentsPage__actions */}
				<div className="vehicles-page__actions">
					<Button variant="secondary">Export</Button>

					<Link
						href={`/documents/new${
							currentCustomerId || currentVehicleId
								? `?${new URLSearchParams({
										...(currentCustomerId
											? { customerId: currentCustomerId }
											: {}),
										...(currentVehicleId
											? { vehicleId: currentVehicleId }
											: {}),
									}).toString()}`
								: ""
						}`}
					>
						<Button variant="primary" leftIcon={<Plus size={18} />}>
							New document
						</Button>
					</Link>
				</div>
			</div>

			<DocumentsStats
				stats={{
					...stats,
					totalStorageFormatted: formatFileSize(stats.totalStorageBytes || 0),
				}}
			/>

			<div className="card stack-md">
				<DocumentsTableToolbar
					search={searchInput}
					onSearchChange={setSearchInput}
					onSearchSubmit={handleSearchSubmit}
					onClearSearch={handleClearSearch}
					category={currentCategory}
					onCategoryChange={handleCategoryChange}
					linkedTo={currentLinkedTo}
					onLinkedToChange={handleLinkedToChange}
					isPending={isPending}
				/>

				<DocumentsTable
					documents={documents}
					onRowClick={(documentId) => router.push(`/documents/${documentId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={totalCount}
					itemsPerPage={pageSize}
					onPageChange={handlePageChange}
					label="documents"
				/>
			</div>
		</section>
	);
}
