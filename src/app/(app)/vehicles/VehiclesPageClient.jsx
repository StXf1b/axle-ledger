"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Plus,
	Search,
	SlidersHorizontal,
	CarFront,
	AlertTriangle,
	Wrench,
	UserRound,
} from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import VehiclesTable from "@/components/vehicles/VehiclesTable";

const ITEMS_PER_PAGE = 10;

export default function VehiclesPageClient({ initialVehicles }) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("All");
	const [currentPage, setCurrentPage] = useState(1);

	const filteredVehicles = useMemo(() => {
		const value = search.trim().toLowerCase();

		return initialVehicles.filter((vehicle) => {
			const customerName = vehicle.customer
				? `${vehicle.customer.firstName || ""} ${vehicle.customer.lastName || ""} ${vehicle.customer.companyName || ""}`.toLowerCase()
				: "";

			const matchesSearch =
				!value ||
				(vehicle.registration || "").toLowerCase().includes(value) ||
				(vehicle.make || "").toLowerCase().includes(value) ||
				(vehicle.model || "").toLowerCase().includes(value) ||
				(vehicle.vin || "").toLowerCase().includes(value) ||
				customerName.includes(value);

			const matchesStatus = status === "All" ? true : vehicle.status === status;

			return matchesSearch && matchesStatus;
		});
	}, [initialVehicles, search, status]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE),
	);

	const paginatedVehicles = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;

		return filteredVehicles.slice(startIndex, endIndex);
	}, [filteredVehicles, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search, status]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const stats = useMemo(() => {
		const now = new Date();

		return {
			total: initialVehicles.length,
			active: initialVehicles.filter((v) => v.status === "ACTIVE").length,
			dueSoon: initialVehicles.filter((v) => {
				if (!v.serviceDueAt) return false;
				const due = new Date(v.serviceDueAt);
				const diff = due.getTime() - now.getTime();
				return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 30;
			}).length,
			unassigned: initialVehicles.filter((v) => !v.customer).length,
		};
	}, [initialVehicles]);

	return (
		<section className="vehicles-page">
			<div className="vehicles-page__header">
				<div className="vehicles-page__header-text">
					<p className="vehicles-page__eyebrow">Vehicle management</p>
					<h2 className="vehicles-page__title">Vehicles</h2>
					<p className="vehicles-page__subtitle">
						Track registrations, ownership, service deadlines, and vehicle
						records in one place.
					</p>
				</div>

				<div className="vehicles-page__actions">
					<Button variant="secondary">Export</Button>

					<Link href="/vehicles/new">
						<Button variant="primary" leftIcon={<Plus size={18} />}>
							New vehicle
						</Button>
					</Link>
				</div>
			</div>

			<div className="vehicles-stats-grid">
				<div className="vehicles-stat-card">
					<div className="vehicles-stat-card__top">
						<span className="vehicles-stat-card__icon">
							<CarFront size={18} />
						</span>
						<p className="vehicles-stat-card__label">Total vehicles</p>
					</div>
					<h3 className="vehicles-stat-card__value">{stats.total}</h3>
				</div>

				<div className="vehicles-stat-card">
					<div className="vehicles-stat-card__top">
						<span className="vehicles-stat-card__icon">
							<UserRound size={18} />
						</span>
						<p className="vehicles-stat-card__label">Active vehicles</p>
					</div>
					<h3 className="vehicles-stat-card__value">{stats.active}</h3>
				</div>

				<div className="vehicles-stat-card">
					<div className="vehicles-stat-card__top">
						<span className="vehicles-stat-card__icon">
							<Wrench size={18} />
						</span>
						<p className="vehicles-stat-card__label">Service due soon</p>
					</div>
					<h3 className="vehicles-stat-card__value">{stats.dueSoon}</h3>
				</div>

				<div className="vehicles-stat-card">
					<div className="vehicles-stat-card__top">
						<span className="vehicles-stat-card__icon">
							<AlertTriangle size={18} />
						</span>
						<p className="vehicles-stat-card__label">Unassigned</p>
					</div>
					<h3 className="vehicles-stat-card__value">{stats.unassigned}</h3>
				</div>
			</div>

			<div className="vehicles-table-shell card">
				<div className="vehicles-toolbar">
					<div className="vehicles-toolbar__left">
						<div className="vehicles-search">
							<Search size={18} className="vehicles-search__icon" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search registration, make, model, VIN, customer..."
							/>
						</div>

						<div className="vehicles-filter">
							<SlidersHorizontal size={16} />
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value)}
							>
								<option value="All">All statuses</option>
								<option value="ACTIVE">Active</option>
								<option value="SOLD">Sold</option>
								<option value="ARCHIVED">Archived</option>
							</select>
						</div>
					</div>
				</div>

				<VehiclesTable
					vehicles={paginatedVehicles}
					onRowClick={(vehicleId) => router.push(`/vehicles/${vehicleId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredVehicles.length}
					itemsPerPage={ITEMS_PER_PAGE}
					onPageChange={setCurrentPage}
					label="vehicles"
				/>
			</div>
		</section>
	);
}
