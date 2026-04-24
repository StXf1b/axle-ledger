"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	Plus,
	Search,
	SlidersHorizontal,
	CarFront,
	AlertTriangle,
	Wrench,
	UserRound,
	X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import TablePagination from "@/components/ui/TablePagination";
import VehiclesTable from "@/components/vehicles/VehiclesTable";

export default function VehiclesPageClient({
	vehicles,
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
						<form className="vehicles-search" onSubmit={handleSearchSubmit}>
							<Search size={18} className="vehicles-search__icon" />
							<input
								type="text"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Search..."
							/>

							{searchInput ? (
								<button
									type="button"
									className="vehicles-search__clear"
									onClick={handleClearSearch}
									aria-label="Clear search"
								>
									<X size={16} />
								</button>
							) : null}

							<button
								type="submit"
								className="vehicles-search__submit"
								disabled={isPending}
							>
								Search
							</button>
						</form>

						<div className="vehicles-filter">
							<SlidersHorizontal size={16} />
							<select
								value={currentStatus}
								onChange={(e) => handleStatusChange(e.target.value)}
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
					vehicles={vehicles}
					onRowClick={(vehicleId) => router.push(`/vehicles/${vehicleId}`)}
				/>

				<TablePagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={totalCount}
					itemsPerPage={pageSize}
					onPageChange={handlePageChange}
					label="vehicles"
				/>
			</div>
		</section>
	);
}
