"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	Activity,
	ArrowLeft,
	Search,
	SlidersHorizontal,
	Users,
	CarFront,
	Wrench,
	Bell,
	FileText,
	CheckCircle2,
	Clock3,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import "./RecentActivityPageClient.css";

const GROUP_ICONS = {
	CUSTOMER: Users,
	VEHICLE: CarFront,
	WORK_LOG: Wrench,
	REMINDER: Bell,
	DOCUMENT: FileText,
};

function buildUrl(pathname, searchParams, updates) {
	const params = new URLSearchParams(searchParams.toString());

	Object.entries(updates).forEach(([key, value]) => {
		if (value == null || value === "" || value === "ALL") {
			params.delete(key);
			return;
		}

		params.set(key, String(value));
	});

	const queryString = params.toString();
	return queryString ? `${pathname}?${queryString}` : pathname;
}

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

function Pagination({ pagination, pathname, searchParams }) {
	if (!pagination || pagination.totalPages <= 1) return null;

	const pageNumbers = [];
	const start = Math.max(1, pagination.currentPage - 1);
	const end = Math.min(pagination.totalPages, pagination.currentPage + 1);

	for (let i = start; i <= end; i += 1) {
		pageNumbers.push(i);
	}

	return (
		<div className="recent-activity-pagination">
			<Link
				href={buildUrl(pathname, searchParams, {
					page: Math.max(1, pagination.currentPage - 1),
				})}
				aria-disabled={pagination.currentPage === 1}
				className={`recent-activity-pagination__btn ${
					pagination.currentPage === 1
						? "recent-activity-pagination__btn--disabled"
						: ""
				}`}
			>
				<ChevronLeft size={16} />
				Previous
			</Link>

			<div className="recent-activity-pagination__pages">
				{pageNumbers.map((page) => (
					<Link
						key={page}
						href={buildUrl(pathname, searchParams, { page })}
						className={`recent-activity-pagination__page ${
							page === pagination.currentPage
								? "recent-activity-pagination__page--active"
								: ""
						}`}
					>
						{page}
					</Link>
				))}
			</div>

			<Link
				href={buildUrl(pathname, searchParams, {
					page: Math.min(pagination.totalPages, pagination.currentPage + 1),
				})}
				aria-disabled={pagination.currentPage === pagination.totalPages}
				className={`recent-activity-pagination__btn ${
					pagination.currentPage === pagination.totalPages
						? "recent-activity-pagination__btn--disabled"
						: ""
				}`}
			>
				Next
				<ChevronRight size={16} />
			</Link>
		</div>
	);
}

export default function RecentActivityPageClient({ pageData }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [searchInput, setSearchInput] = useState(
		pageData?.filters?.search || "",
	);

	const resultCountLabel = useMemo(() => {
		if (!pageData?.pagination) return "0 results";
		return `${pageData.pagination.totalItems} result${
			pageData.pagination.totalItems === 1 ? "" : "s"
		}`;
	}, [pageData]);

	if (!pageData) {
		return (
			<section className="recent-activity-page">
				<div className="card">
					<p className="text-muted">Could not load recent activity.</p>
				</div>
			</section>
		);
	}

	function handleSubmit(event) {
		event.preventDefault();

		router.push(
			buildUrl(pathname, searchParams, {
				search: searchInput.trim(),
				page: 1,
			}),
		);
	}

	function handleGroupChange(event) {
		router.push(
			buildUrl(pathname, searchParams, {
				group: event.target.value,
				page: 1,
			}),
		);
	}

	function handleClear() {
		setSearchInput("");
		router.push(pathname);
	}

	return (
		<section className="recent-activity-page">
			<div className="recent-activity-page__header">
				<div className="recent-activity-page__header-right">
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

			<div className="recent-activity-toolbar card">
				<form onSubmit={handleSubmit} className="recent-activity-toolbar__form">
					<div className="recent-activity-search">
						<Search size={18} className="recent-activity-search__icon" />
						<input
							type="text"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="Search activity title, linked customer, vehicle, file, or staff..."
						/>
					</div>

					<div className="recent-activity-filter">
						<SlidersHorizontal size={16} />
						<select value={pageData.filters.group} onChange={handleGroupChange}>
							{pageData.filterOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<button type="submit" className="btn btn-primary btn-sm">
						Apply
					</button>

					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={handleClear}
					>
						Clear
					</button>
				</form>

				<div className="recent-activity-toolbar__meta">
					<p>{resultCountLabel}</p>
				</div>
			</div>

			<div className="recent-activity-feed card">
				<div className="recent-activity-feed__header">
					<div>
						<h3 className="recent-activity-feed__title">Activity feed</h3>
						<p className="recent-activity-feed__subtitle">
							Chronological activity across your workspace for the last 7 days.
						</p>
					</div>
				</div>

				{pageData.items.length === 0 ? (
					<div className="recent-activity-empty">
						<p className="recent-activity-empty__title">No matching activity</p>
						<p className="recent-activity-empty__text">
							Try a different filter or search term.
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

											<p className="recent-activity-item__meta">{item.meta}</p>
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

				<Pagination
					pagination={pageData.pagination}
					pathname={pathname}
					searchParams={searchParams}
				/>
			</div>
		</section>
	);
}
