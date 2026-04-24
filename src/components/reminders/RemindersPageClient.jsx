"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import RemindersStats from "@/components/reminders/RemindersStats";
import RemindersTableToolbar from "@/components/reminders/RemindersTableToolbar";
import RemindersTable from "@/components/reminders/RemindersTable";
import "./RemindersPageClient.css";

export default function RemindersPageClient({
	reminders,
	totalCount,
	stats,
	currentPage,
	pageSize,
	currentSearch,
	currentStatus,
	currentType,
	currentTiming,
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

	function handleTypeChange(nextType) {
		updateUrlParams({
			type: nextType,
			page: 1,
		});
	}

	function handleTimingChange(nextTiming) {
		updateUrlParams({
			timing: nextTiming,
			page: 1,
		});
	}

	function handlePageChange(nextPage) {
		updateUrlParams({
			page: nextPage <= 1 ? null : nextPage,
		});
	}

	return (
		<section className="reminders-page">
			<div className="page-header">
				<div className="page-header-left">
					<p className="reminders-page__eyebrow">Reminder management</p>
					<h2>Reminders</h2>
					<p>
						Track tax, insurance, NCT, service, and follow-up reminders across
						customers and vehicles.
					</p>
				</div>

				<div className="reminders-page__actions">
					<Button variant="secondary">Export</Button>

					<Link href="/reminders/new">
						<Button variant="primary" leftIcon={<Plus size={18} />}>
							New reminder
						</Button>
					</Link>
				</div>
			</div>

			<RemindersStats stats={stats} />

			<div className="reminders-table-shell card">
				<RemindersTableToolbar
					search={searchInput}
					onSearchChange={setSearchInput}
					onSearchSubmit={handleSearchSubmit}
					onClearSearch={handleClearSearch}
					status={currentStatus}
					onStatusChange={handleStatusChange}
					type={currentType}
					onTypeChange={handleTypeChange}
					timing={currentTiming}
					onTimingChange={handleTimingChange}
					isPending={isPending}
				/>

				<RemindersTable
					reminders={reminders}
					onRowClick={(reminderId) => router.push(`/reminders/${reminderId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={totalCount}
					itemsPerPage={pageSize}
					onPageChange={handlePageChange}
					label="reminders"
				/>
			</div>
		</section>
	);
}
