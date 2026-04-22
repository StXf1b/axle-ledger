"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import RemindersStats from "@/components/reminders/RemindersStats";
import RemindersTableToolbar from "@/components/reminders/RemindersTableToolbar";
import RemindersTable from "@/components/reminders/RemindersTable";
import { getReminderTiming } from "@/lib/reminder-utils";
import "./RemindersPageClient.css";

const ITEMS_PER_PAGE = 10;

export default function RemindersPageClient({ initialReminders }) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("All");
	const [type, setType] = useState("All");
	const [timing, setTiming] = useState("All");
	const [currentPage, setCurrentPage] = useState(1);

	const filteredReminders = useMemo(() => {
		const value = search.trim().toLowerCase();

		return initialReminders.filter((reminder) => {
			const customerName = reminder.customer
				? `${reminder.customer.firstName || ""} ${reminder.customer.lastName || ""} ${reminder.customer.companyName || ""}`.toLowerCase()
				: "";

			const vehicleLabel = reminder.vehicle
				? `${reminder.vehicle.registration || ""} ${reminder.vehicle.make || ""} ${reminder.vehicle.model || ""}`.toLowerCase()
				: "";

			const typeText = (reminder.type || "").toLowerCase().replaceAll("_", " ");
			const timingMeta = getReminderTiming(reminder);

			const matchesSearch =
				!value ||
				(reminder.title || "").toLowerCase().includes(value) ||
				(reminder.type || "").toLowerCase().includes(value) ||
				typeText.includes(value) ||
				customerName.includes(value) ||
				vehicleLabel.includes(value) ||
				(reminder.notes || "").toLowerCase().includes(value);

			const matchesStatus =
				status === "All" ? true : reminder.status === status;

			const matchesType = type === "All" ? true : reminder.type === type;

			const matchesTiming =
				timing === "All"
					? true
					: timing === "OVERDUE"
						? timingMeta.key === "overdue"
						: timing === "TODAY"
							? timingMeta.key === "today"
							: timing === "SOON"
								? timingMeta.key === "soon"
								: timing === "UPCOMING"
									? timingMeta.key === "upcoming"
									: timing === "COMPLETED"
										? reminder.status === "COMPLETED"
										: true;

			return matchesSearch && matchesStatus && matchesType && matchesTiming;
		});
	}, [initialReminders, search, status, type, timing]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredReminders.length / ITEMS_PER_PAGE),
	);

	const paginatedReminders = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredReminders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	}, [filteredReminders, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search, status, type, timing]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const stats = useMemo(() => {
		const total = initialReminders.length;
		const open = initialReminders.filter(
			(item) => item.status === "OPEN",
		).length;
		const completed = initialReminders.filter(
			(item) => item.status === "COMPLETED",
		).length;
		const overdue = initialReminders.filter(
			(item) => getReminderTiming(item).key === "overdue",
		).length;
		const dueSoon = initialReminders.filter((item) => {
			const key = getReminderTiming(item).key;
			return key === "today" || key === "soon";
		}).length;

		return {
			total,
			open,
			completed,
			overdue,
			dueSoon,
		};
	}, [initialReminders]);

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

				<div className="page-header-right">
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
					search={search}
					onSearchChange={setSearch}
					status={status}
					onStatusChange={setStatus}
					type={type}
					onTypeChange={setType}
					timing={timing}
					onTimingChange={setTiming}
				/>

				<RemindersTable
					reminders={paginatedReminders}
					onRowClick={(reminderId) => router.push(`/reminders/${reminderId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredReminders.length}
					itemsPerPage={ITEMS_PER_PAGE}
					onPageChange={setCurrentPage}
					label="reminders"
				/>
			</div>
		</section>
	);
}
