"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import WorkLogsStats from "@/components/work-logs/WorkLogsStats";
import WorkLogsTableToolbar from "@/components/work-logs/WorkLogsTableToolbar";
import WorkLogsTable from "@/components/work-logs/WorkLogsTable";
import "./WorkLogsPageClient.css";

export default function WorkLogsPageClient({
	workLogs,
	totalCount,
	stats,
	staffOptions,
	currentPage,
	pageSize,
	currentSearch,
	currentPerformedBy,
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

	function handlePerformedByChange(nextPerformedBy) {
		updateUrlParams({
			performedBy: nextPerformedBy,
			page: 1,
		});
	}

	function handlePageChange(nextPage) {
		updateUrlParams({
			page: nextPage <= 1 ? null : nextPage,
		});
	}

	const newWorkLogHref = `/work-logs/new${
		currentCustomerId || currentVehicleId
			? `?${new URLSearchParams({
					...(currentCustomerId ? { customerId: currentCustomerId } : {}),
					...(currentVehicleId ? { vehicleId: currentVehicleId } : {}),
				}).toString()}`
			: ""
	}`;

	return (
		<section className="work-logs-page">
			<div className="page-header">
				<div className="page-header-left">
					<p className="work-logs-page__eyebrow">Workshop operations</p>
					<h2>Work Logs</h2>
					<p>
						Track completed work, labour, parts, odometer readings, and service
						history across your workshop.
					</p>
				</div>

				<div className="customers-page__actions">
					<Button variant="secondary">Export</Button>

					<Link href={newWorkLogHref}>
						<Button variant="primary" leftIcon={<Plus size={18} />}>
							New work log
						</Button>
					</Link>
				</div>
			</div>

			<WorkLogsStats stats={stats} />

			<div className="work-logs-table-shell card">
				<WorkLogsTableToolbar
					search={searchInput}
					onSearchChange={setSearchInput}
					onSearchSubmit={handleSearchSubmit}
					onClearSearch={handleClearSearch}
					performedBy={currentPerformedBy}
					onPerformedByChange={handlePerformedByChange}
					staffOptions={staffOptions}
					isPending={isPending}
				/>

				<WorkLogsTable
					workLogs={workLogs}
					onRowClick={(workLogId) => router.push(`/work-logs/${workLogId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={totalCount}
					itemsPerPage={pageSize}
					onPageChange={handlePageChange}
					label="work logs"
				/>
			</div>
		</section>
	);
}
