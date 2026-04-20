"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import CustomersStats from "@/components/customers/CustomersStats";
import CustomersTableToolbar from "@/components/customers/CustomersTableToolbar";
import CustomersTable from "@/components/customers/CustomersTable";

const ITEMS_PER_PAGE = 10;

export default function CustomersPageClient({ initialCustomers }) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("All");
	const [currentPage, setCurrentPage] = useState(1);

	const filteredCustomers = useMemo(() => {
		const value = search.trim().toLowerCase();

		return initialCustomers.filter((customer) => {
			const fullName =
				`${customer.firstName || ""} ${customer.lastName || ""}`.toLowerCase();

			const vehicleSearchText = (customer.vehicles || [])
				.map((v) => `${v.registration || ""} ${v.make || ""} ${v.model || ""}`)
				.join(" ")
				.toLowerCase();

			const tagsText = (customer.tags || []).join(" ").toLowerCase();

			const matchesSearch =
				!value ||
				fullName.includes(value) ||
				(customer.companyName || "").toLowerCase().includes(value) ||
				(customer.phone || "").toLowerCase().includes(value) ||
				(customer.email || "").toLowerCase().includes(value) ||
				vehicleSearchText.includes(value) ||
				tagsText.includes(value);

			const matchesStatus =
				status === "All" ? true : customer.status === status;

			return matchesSearch && matchesStatus;
		});
	}, [initialCustomers, search, status]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE),
	);

	const paginatedCustomers = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;

		return filteredCustomers.slice(startIndex, endIndex);
	}, [filteredCustomers, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search, status]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const stats = useMemo(() => {
		return {
			totalCustomers: initialCustomers.length,
			activeCustomers: initialCustomers.filter((c) => c.status === "ACTIVE")
				.length,
			businessCustomers: initialCustomers.filter((c) => c.companyName).length,
			linkedVehicles: initialCustomers.reduce(
				(total, customer) => total + customer.vehicles.length,
				0,
			),
		};
	}, [initialCustomers]);

	return (
		<section className="customers-page">
			<div className="customers-page__header">
				<div className="customers-page__header-text">
					<p className="customers-page__eyebrow">Customer management</p>
					<h2 className="customers-page__title">Customers</h2>
					<p className="customers-page__subtitle">
						View and manage all customer records, contact details, linked
						vehicles, and account notes from one place.
					</p>
				</div>

				<div className="customers-page__actions">
					<Button variant="secondary">Import</Button>

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
					search={search}
					onSearchChange={setSearch}
					status={status}
					onStatusChange={setStatus}
				/>

				<CustomersTable
					customers={paginatedCustomers}
					onRowClick={(customerId) => router.push(`/customers/${customerId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredCustomers.length}
					itemsPerPage={ITEMS_PER_PAGE}
					onPageChange={setCurrentPage}
					label="customers"
				/>
			</div>
		</section>
	);
}
