"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	Activity,
	Search,
	SlidersHorizontal,
	Users,
	CarFront,
	Wrench,
	Bell,
	FileText,
	CheckCircle2,
	Clock3,
	X,
} from "lucide-react";

import TablePagination from "@/components/ui/TablePagination";
import "./RecentActivityPageClient.css";

const DEFAULT_PERIOD = "7D";

const GROUP_ICONS = {
	CUSTOMER: Users,
	VEHICLE: CarFront,
	WORK_LOG: Wrench,
	REMINDER: Bell,
	DOCUMENT: FileText,
};

function StatCard({ label, value, icon: Icon }) {
	return (
		<div className="recent-activity-stat-card">
			<div className="recent-activity-stat-card__top">
				<span className="recent-activity-stat-card__icon">
					<Icon size={16} />
				</span>
				<p className="recent-activity-stat-card__label">{label}</p>
			</div>

			<h3 className="recent-activity-stat-card__value">{value}</h3>
		</div>
	);
}

function ActivitySearchForm({
	initialSearch,
	isPending,
	onSearchSubmit,
	onClearSearch,
}) {
	const [searchInput, setSearchInput] = useState(initialSearch);

	function handleSubmit(event) {
		event.preventDefault();
		onSearchSubmit(searchInput.trim());
	}

	function handleClear() {
		setSearchInput("");
		onClearSearch();
	}

	return (
		<form className="recent-activity-search" onSubmit={handleSubmit}>
			<Search size={18} className="recent-activity-search__icon" />
			<input
				type="text"
				value={searchInput}
				onChange={(event) => setSearchInput(event.target.value)}
				placeholder="Search..."
			/>

			{searchInput ? (
				<button
					type="button"
					className="recent-activity-search__clear"
					onClick={handleClear}
					aria-label="Clear search"
				>
					<X size={16} />
				</button>
			) : null}

			<button
				type="submit"
				className="recent-activity-search__submit"
				disabled={isPending}
			>
				Search
			</button>
		</form>
	);
}

export default function RecentActivityPageClient({ pageData }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const resultCountLabel = useMemo(() => {
		if (!pageData?.pagination) return "0 activity logs";
		return `${pageData.pagination.totalItems} activity log${
			pageData.pagination.totalItems === 1 ? "" : "s"
		}`;
	}, [pageData]);

	const updateUrlParams = useCallback(
		(updates) => {
			const params = new URLSearchParams(searchParams.toString());

			Object.entries(updates).forEach(([key, value]) => {
				const shouldDelete =
					value === null ||
					value === undefined ||
					value === "" ||
					(key === "group" && value === "ALL") ||
					(key === "period" && value === DEFAULT_PERIOD) ||
					(key === "page" && Number(value) <= 1);

				if (shouldDelete) {
					params.delete(key);
					return;
				}

				params.set(key, String(value));
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

	if (!pageData) {
		return (
			<section className="recent-activity-page">
				<div className="card">
					<p className="text-muted">Could not load recent activity.</p>
				</div>
			</section>
		);
	}

	const currentGroup = pageData.filters.group;
	const currentPeriod = pageData.filters.period || DEFAULT_PERIOD;
	const currentSearch = pageData.filters.search || "";

	function handleSearchSubmit(trimmedValue) {
		if (trimmedValue === currentSearch) return;

		updateUrlParams({
			search: trimmedValue || null,
			page: 1,
		});
	}

	function handleClearSearch() {
		if (!currentSearch) return;

		updateUrlParams({
			search: null,
			page: 1,
		});
	}

	function handleGroupChange(nextGroup) {
		updateUrlParams({
			group: nextGroup,
			page: 1,
		});
	}

	function handlePeriodChange(nextPeriod) {
		updateUrlParams({
			period: nextPeriod,
			page: 1,
		});
	}

	function handlePageChange(nextPage) {
		updateUrlParams({
			page: nextPage <= 1 ? null : nextPage,
		});
	}

	return (
		<section className="recent-activity-page">
			<div className="recent-activity-page__header">
				<div className="recent-activity-page__header-text">
					<p className="recent-activity-page__eyebrow">Activity log</p>
					<h2 className="recent-activity-page__title">Recent Activity</h2>
					<p className="recent-activity-page__subtitle">
						Review customer, vehicle, work log, reminder, and document changes
						across your workspace.
					</p>
				</div>

				<div className="recent-activity-page__actions">
					<div className="recent-activity-chip">
						<Clock3 size={16} />
						<span>{pageData.timeframeLabel}</span>
					</div>
				</div>
			</div>

			<div className="recent-activity-stats-grid">
				<StatCard
					label="Total activity"
					value={pageData.stats.total}
					icon={Activity}
				/>
				<StatCard label="Today" value={pageData.stats.today} icon={Clock3} />
				<StatCard
					label="Work logs"
					value={pageData.stats.workLogs}
					icon={Wrench}
				/>
				<StatCard
					label="Reminders"
					value={pageData.stats.reminders}
					icon={Bell}
				/>
				<StatCard
					label="Documents"
					value={pageData.stats.documents}
					icon={FileText}
				/>
			</div>

			<div className="recent-activity-table-shell card">
				<div className="recent-activity-toolbar">
					<div className="recent-activity-toolbar__left">
						<ActivitySearchForm
							key={currentSearch}
							initialSearch={currentSearch}
							isPending={isPending}
							onSearchSubmit={handleSearchSubmit}
							onClearSearch={handleClearSearch}
						/>

						<div className="recent-activity-filter">
							<SlidersHorizontal size={16} />
							<select
								value={currentGroup}
								onChange={(event) => handleGroupChange(event.target.value)}
								aria-label="Filter by activity type"
							>
								{pageData.filterOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>

						<div className="recent-activity-filter">
							<Clock3 size={16} />
							<select
								value={currentPeriod}
								onChange={(event) => handlePeriodChange(event.target.value)}
								aria-label="Filter by activity period"
							>
								{pageData.periodOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="recent-activity-toolbar__right">
						<p>{resultCountLabel}</p>
					</div>
				</div>

				<div className="recent-activity-feed">
					<div className="recent-activity-feed__header">
						<div>
							<h3 className="recent-activity-feed__title">Activity feed</h3>
							<p className="recent-activity-feed__subtitle">
								Chronological activity across your workspace for{" "}
								{pageData.timeframeLabel.toLowerCase()}.
							</p>
						</div>
					</div>

					{pageData.items.length === 0 ? (
						<div className="recent-activity-empty">
							<p className="recent-activity-empty__title">
								No matching activity
							</p>
							<p className="recent-activity-empty__text">
								Try a different search, activity type, or time period.
							</p>
						</div>
					) : (
						<div className="recent-activity-list">
							{pageData.items.map((item) => {
								const Icon =
									item.event === "COMPLETED"
										? CheckCircle2
										: GROUP_ICONS[item.group] || Activity;

								return (
									<Link
										key={item.id}
										href={item.href}
										className="recent-activity-item"
									>
										<div className="recent-activity-item__left">
											<span className="recent-activity-item__icon">
												<Icon size={18} />
											</span>

											<div className="recent-activity-item__content">
												<div className="recent-activity-item__row">
													<p className="recent-activity-item__title">
														{item.title}
													</p>
													<span className="recent-activity-item__badge">
														{item.badge}
													</span>
												</div>

												<p className="recent-activity-item__subtitle">
													{item.subtitle}
												</p>

												<p className="recent-activity-item__meta">
													{item.meta}
												</p>
											</div>
										</div>

										<div className="recent-activity-item__right">
											<p className="recent-activity-item__time">
												{item.timeLabel}
											</p>
											<p className="recent-activity-item__time-full">
												{item.timeFull}
											</p>
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</div>

				<TablePagination
					currentPage={pageData.pagination.currentPage}
					totalPages={pageData.pagination.totalPages}
					totalItems={pageData.pagination.totalItems}
					itemsPerPage={pageData.pagination.pageSize}
					onPageChange={handlePageChange}
					label="activity logs"
				/>
			</div>
		</section>
	);
}
