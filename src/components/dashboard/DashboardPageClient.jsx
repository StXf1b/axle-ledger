"use client";

import Link from "next/link";
import {
	Clock3,
	Users,
	CarFront,
	Wrench,
	Bell,
	FileText,
	ArrowUpRight,
	ArrowDownRight,
	Minus,
	ArrowRight,
	UserRoundPlus,
	FolderUp,
	BadgeAlert,
	ShieldAlert,
	ChevronRight,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import "./DashboardPageClient.css";

const KPI_ICONS = {
	customers: Users,
	vehicles: CarFront,
	workLogs: Wrench,
	activeReminders: Bell,
};

const ACTION_ICONS = {
	customer: UserRoundPlus,
	vehicle: CarFront,
	workLog: Wrench,
	reminder: Bell,
	document: FolderUp,
};

const REMINDER_TYPE_ICONS = {
	TAX: FileText,
	INSURANCE: ShieldAlert,
	NCT: BadgeAlert,
	SERVICE: Wrench,
	FOLLOW_UP: Bell,
	CUSTOM: Bell,
};

const ACTIVITY_ICONS = {
	customer: Users,
	vehicle: CarFront,
	workLog: Wrench,
	reminder: Bell,
	document: FileText,
};

function TrendBadge({ change }) {
	if (!change) return null;

	const isUp = change.direction === "up";
	const isDown = change.direction === "down";

	return (
		<span
			className={`dashboard-trend-badge ${
				isUp
					? "dashboard-trend-badge--up"
					: isDown
						? "dashboard-trend-badge--down"
						: "dashboard-trend-badge--flat"
			}`}
		>
			{isUp ? (
				<ArrowUpRight size={14} />
			) : isDown ? (
				<ArrowDownRight size={14} />
			) : (
				<Minus size={14} />
			)}
			{change.percent}%
		</span>
	);
}

function SparkTooltip({ active, payload }) {
	if (!active || !payload?.length) return null;

	return (
		<div className="dashboard-chart-tooltip">
			<p>{payload[0]?.payload?.label}</p>
			<strong>{payload[0]?.value || 0}</strong>
		</div>
	);
}

function KpiCard({ item }) {
	const Icon = KPI_ICONS[item.key] || FileText;

	return (
		<div className="dashboard-kpi-card">
			<div className="dashboard-kpi-card__noise" />
			<div className="dashboard-kpi-card__top">
				<div className="dashboard-kpi-card__title-wrap">
					<span className="dashboard-kpi-card__icon">
						<Icon size={18} />
					</span>
					<p className="dashboard-kpi-card__label">{item.label}</p>
				</div>

				<TrendBadge change={item.change} />
			</div>

			<div className="dashboard-kpi-card__body">
				<h3 className="dashboard-kpi-card__value">{item.totalLabel}</h3>
				<p className="dashboard-kpi-card__subvalue">{item.newThisMonthLabel}</p>
			</div>

			<div className="dashboard-kpi-card__chart">
				<ResponsiveContainer width="100%" height={92}>
					<AreaChart data={item.series}>
						<defs>
							<linearGradient
								id={`dashboard-kpi-fill-${item.key}`}
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop offset="0%" stopColor="#60a5fa" stopOpacity={0.28} />
								<stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
							</linearGradient>
						</defs>

						<Tooltip content={<SparkTooltip />} cursor={false} />
						<Area
							type="monotone"
							dataKey="value"
							stroke="#60a5fa"
							strokeWidth={2.5}
							fill={`url(#dashboard-kpi-fill-${item.key})`}
							dot={false}
							activeDot={{ r: 4, strokeWidth: 0, fill: "#bfdbfe" }}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

function QuickActionsBar({ actions }) {
	return (
		<div className="dashboard-panel dashboard-quick-actions">
			<div className="dashboard-panel__heading">
				<h3>Quick Actions</h3>
				<p>Fast access to the most common workflow steps.</p>
			</div>

			<div className="dashboard-quick-actions__grid">
				{actions.map((action) => {
					const Icon = ACTION_ICONS[action.icon] || FileText;

					return (
						<Link
							key={action.key}
							href={action.href}
							className="dashboard-quick-action"
						>
							<span className="dashboard-quick-action__icon">
								<Icon size={18} />
							</span>

							<span className="dashboard-quick-action__label">
								{action.label}
							</span>

							<span className="dashboard-quick-action__arrow">
								<ChevronRight size={16} />
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}

function ReminderBucketCard({
	title,
	subtitle,
	total,
	items,
	viewAllHref,
	emptyTitle,
	emptyText,
}) {
	return (
		<div className="dashboard-panel dashboard-list-card">
			<div className="dashboard-list-card__header">
				<div>
					<div className="dashboard-list-card__title-row">
						<h3 className="dashboard-list-card__title">{title}</h3>
						<span className="dashboard-count-pill">{total}</span>
					</div>
					<p className="dashboard-list-card__subtitle">{subtitle}</p>
				</div>

				<Link href={viewAllHref} className="dashboard-list-card__view-all">
					View all
				</Link>
			</div>

			{items.length === 0 ? (
				<div className="dashboard-empty-state">
					<p className="dashboard-empty-state__title">{emptyTitle}</p>
					<p className="dashboard-empty-state__text">{emptyText}</p>
				</div>
			) : (
				<div className="dashboard-reminder-list">
					{items.map((item) => {
						const Icon = REMINDER_TYPE_ICONS[item.type] || Bell;

						return (
							<Link
								key={item.id}
								href={item.href}
								className="dashboard-reminder-item"
							>
								<div className="dashboard-reminder-item__left">
									<span className="dashboard-reminder-item__icon">
										<Icon size={16} />
									</span>

									<div className="dashboard-reminder-item__content">
										<p className="dashboard-reminder-item__title">
											{item.title}
										</p>
										<p className="dashboard-reminder-item__meta">{item.meta}</p>
									</div>
								</div>

								<div className="dashboard-reminder-item__right">
									<p className="dashboard-reminder-item__type">
										{item.typeLabel}
									</p>
									<p
										className={`dashboard-reminder-item__status ${item.statusLabel.includes("overdue") === true ? "dashboard-reminder-item__status--overdue" : ""}`}
									>
										{item.statusLabel}
									</p>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}

function RecentActivityCard({ items }) {
	return (
		<div className="dashboard-panel dashboard-activity-card">
			<div className="dashboard-list-card__header">
				<div>
					<div className="dashboard-list-card__title-row">
						<h3 className="dashboard-list-card__title">Recent Activity</h3>
					</div>
					<p className="dashboard-list-card__subtitle">
						Live updates across customers, vehicles, reminders, documents, and
						work logs.
					</p>
				</div>

				<Link href="/recent-activity" className="dashboard-list-card__view-all">
					See all
				</Link>
			</div>

			{items.length === 0 ? (
				<div className="dashboard-empty-state">
					<p className="dashboard-empty-state__title">No recent activity</p>
					<p className="dashboard-empty-state__text">
						Activity will appear here once records start being created.
					</p>
				</div>
			) : (
				<div className="dashboard-activity-list">
					{items.map((item) => {
						const Icon = ACTIVITY_ICONS[item.type] || FileText;

						return (
							<Link
								key={item.id}
								href={item.href}
								className="dashboard-activity-item"
							>
								<div className="dashboard-activity-item__left">
									<span className="dashboard-activity-item__icon">
										<Icon size={16} />
									</span>

									<div className="dashboard-activity-item__content">
										<p className="dashboard-activity-item__title">
											{item.title}
										</p>
										<p className="dashboard-activity-item__meta">{item.meta}</p>
									</div>
								</div>

								<div className="dashboard-activity-item__right">
									<span className="dashboard-time-pill">{item.timeLabel}</span>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default function DashboardPageClient({ dashboardData }) {
	if (!dashboardData) {
		return (
			<section className="dashboard-page">
				<div className="dashboard-panel dashboard-empty-shell">
					<h2>Dashboard unavailable</h2>
					<p className="text-muted">
						We could not load your dashboard data right now.
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className="dashboard-page">
			<div className="dashboard-shell">
				<div className="dashboard-hero">
					<div className="dashboard-hero__content">
						<div className="dashboard-hero__eyebrow">Workshop Overview</div>
						<h1 className="dashboard-hero__title">AxleLedger Dashboard</h1>
						<p className="dashboard-hero__subtitle">
							A cleaner operations view for customers, vehicles, reminders, work
							logs, and recent activity.
						</p>
					</div>

					<div className="dashboard-hero__right">
						<div className="dashboard-updated-chip">
							<Clock3 size={16} />
							<span>{dashboardData.updatedAtLabel}</span>
						</div>
					</div>
				</div>

				<div className="dashboard-kpi-grid">
					{dashboardData.kpis.map((item) => (
						<KpiCard key={item.key} item={item} />
					))}
				</div>

				<QuickActionsBar actions={dashboardData.quickActions} />

				<div className="dashboard-two-col">
					<ReminderBucketCard
						title="Overdue Reminders"
						subtitle="Open reminders that have already passed their due date."
						total={dashboardData.overdue.total}
						items={dashboardData.overdue.items}
						viewAllHref="/reminders?timing=OVERDUE"
						emptyTitle="No overdue reminders"
						emptyText="Everything looks under control right now."
					/>

					<ReminderBucketCard
						title="Due Soon"
						subtitle="Upcoming reminders that need attention in the next 14 days."
						total={dashboardData.dueSoon.total}
						items={dashboardData.dueSoon.items}
						viewAllHref="/reminders?timing=SOON"
						emptyTitle="Nothing due soon"
						emptyText="There are no urgent reminders coming up."
					/>
				</div>

				<RecentActivityCard items={dashboardData.recentActivity} />

				<div className="dashboard-footer-link">
					<Link href="/recent-activity" className="dashboard-inline-link">
						View all recent activity
						<ArrowRight size={16} />
					</Link>
				</div>
			</div>
		</section>
	);
}
