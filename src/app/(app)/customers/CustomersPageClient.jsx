"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import CustomersStats from "@/components/customers/CustomersStats";
import CustomersTableToolbar from "@/components/customers/CustomersTableToolbar";
import CustomersTable from "@/components/customers/CustomersTable";

export default function CustomersPageClient({
	customers,
	totalCount,
	stats,
	currentPage,
	pageSize,
	currentSearch,
	currentStatus,
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

			const queryString = params.toString();

			startTransition(() => {
				router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
					scroll: false,
				});
			});
		},
		[pathname, router, searchParams],
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

	function handleStatusChange(nextStatus) {
		updateUrlParams({
			status: nextStatus,
			page: 1,
		});
	}

	function handlePageChange(nextPage) {
		updateUrlParams({
			page: nextPage <= 1 ? null : nextPage,
		});
	}

	return (
		<section className="customers-page">
			<div className="customers-page__header">
				<div className="customers-page__header-text">
					<p className="customers-page__eyebrow">Customer management</p>
					<h2 className="customers-page__title">Customers</h2>
					<p className="customers-page__subtitle">
						View and manage all customer records, contact details, linked
						vehicles, and account notes.
					</p>
				</div>

				<div className="customers-page__actions">
					<Button variant="secondary">Export</Button>

					<Link href="/customers/new">
						<Button variant="primary" leftIcon={<Plus size={18} />}>
							New customer
						</Button>
					</Link>
				</div>
			</div>

			<CustomersStats stats={stats} />

			<div className="customers-table-shell card">
				<CustomersTableToolbar
					search={searchInput}
					onSearchChange={setSearchInput}
					onSearchSubmit={handleSearchSubmit}
					onClearSearch={handleClearSearch}
					status={currentStatus}
					onStatusChange={handleStatusChange}
					isPending={isPending}
				/>

				<CustomersTable
					customers={customers}
					onRowClick={(customerId) => router.push(`/customers/${customerId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={totalCount}
					itemsPerPage={pageSize}
					onPageChange={handlePageChange}
					label="customers"
				/>
			</div>
		</section>
	);
}
