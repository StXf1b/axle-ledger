"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import WorkLogsStats from "@/components/work-logs/WorkLogsStats";
import WorkLogsTableToolbar from "@/components/work-logs/WorkLogsTableToolbar";
import WorkLogsTable from "@/components/work-logs/WorkLogsTable";
import "./WorkLogsPageClient.css";

const ITEMS_PER_PAGE = 10;

export default function WorkLogsPageClient({ initialWorkLogs }) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [performedBy, setPerformedBy] = useState("All");
	const [currentPage, setCurrentPage] = useState(1);

	const staffOptions = useMemo(() => {
		const map = new Map();

		initialWorkLogs.forEach((log) => {
			if (log.performedByUser?.id) {
				map.set(
					log.performedByUser.id,
					log.performedByUser.fullName ||
						log.performedByUser.email ||
						"Unknown",
				);
			}
		});

		return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
	}, [initialWorkLogs]);

	const filteredWorkLogs = useMemo(() => {
		const value = search.trim().toLowerCase();

		return initialWorkLogs.filter((log) => {
			const customerText = log.customer
				? `${log.customer.firstName || ""} ${log.customer.lastName || ""} ${log.customer.companyName || ""}`.toLowerCase()
				: "";

			const vehicleText = log.vehicle
				? `${log.vehicle.registration || ""} ${log.vehicle.make || ""} ${log.vehicle.model || ""}`.toLowerCase()
				: "";

			const performedByText = (
				log.performedByUser?.fullName ||
				log.performedByUser?.email ||
				""
			).toLowerCase();

			const matchesSearch =
				!value ||
				(log.title || "").toLowerCase().includes(value) ||
				(log.description || "").toLowerCase().includes(value) ||
				(log.notes || "").toLowerCase().includes(value) ||
				customerText.includes(value) ||
				vehicleText.includes(value) ||
				performedByText.includes(value);

			const matchesPerformedBy =
				performedBy === "All" ? true : log.performedByUser?.id === performedBy;

			return matchesSearch && matchesPerformedBy;
		});
	}, [initialWorkLogs, search, performedBy]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredWorkLogs.length / ITEMS_PER_PAGE),
	);

	const paginatedWorkLogs = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredWorkLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	}, [filteredWorkLogs, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search, performedBy]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const stats = useMemo(() => {
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();

		const totalLogs = initialWorkLogs.length;
		const logsThisMonth = initialWorkLogs.filter((log) => {
			const date = new Date(log.completedAt);
			return (
				date.getMonth() === currentMonth && date.getFullYear() === currentYear
			);
		}).length;

		const labourTotal = initialWorkLogs.reduce(
			(total, log) => total + Number(log.labourCharge || 0),
			0,
		);

		const partsTotal = initialWorkLogs.reduce(
			(total, log) => total + Number(log.partsCharge || 0),
			0,
		);

		const billedTotal = initialWorkLogs.reduce(
			(total, log) => total + Number(log.totalCharge || 0),
			0,
		);

		return {
			totalLogs,
			logsThisMonth,
			labourTotal,
			partsTotal,
			billedTotal,
		};
	}, [initialWorkLogs]);

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

				<div className="page-header-right">
					<Button variant="secondary">Export</Button>

					<Link href="/work-logs/new">
						<Button variant="primary" leftIcon={<Plus size={18} />}>
							New work log
						</Button>
					</Link>
				</div>
			</div>

			<WorkLogsStats stats={stats} />

			<div className="work-logs-table-shell card">
				<WorkLogsTableToolbar
					search={search}
					onSearchChange={setSearch}
					performedBy={performedBy}
					onPerformedByChange={setPerformedBy}
					staffOptions={staffOptions}
				/>

				<WorkLogsTable
					workLogs={paginatedWorkLogs}
					onRowClick={(workLogId) => router.push(`/work-logs/${workLogId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredWorkLogs.length}
					itemsPerPage={ITEMS_PER_PAGE}
					onPageChange={setCurrentPage}
					label="work logs"
				/>
			</div>
		</section>
	);
}
