import Link from "next/link";
import {
	ArrowRight,
	BellRing,
	CarFront,
	ClipboardList,
	FileText,
	PackageOpen,
	ReceiptText,
	Users,
	Wrench,
	CircleAlert,
	Clock3,
	Activity,
} from "lucide-react";

import "./DashboardPageView.css";

function formatDate(value) {
	if (!value) return "—";

	return new Date(value).toLocaleDateString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatDateTime(value) {
	if (!value) return "—";

	return new Date(value).toLocaleString("en-IE", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatCustomer(customer) {
	if (!customer) return null;
	if (customer.companyName) return customer.companyName;
	return (
		`${customer.firstName || ""} ${customer.lastName || ""}`.trim() || null
	);
}

function formatVehicle(vehicle) {
	if (!vehicle) return null;
	return `${vehicle.registration} · ${vehicle.make} ${vehicle.model}`;
}

function formatCurrency(value) {
	const numeric = Number(value || 0);

	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
	}).format(numeric);
}

function QuickActionCard({ href, icon, title, text }) {
	const Icon = icon;

	return (
		<Link href={href} className="dashboard-quick-action">
			<span className="dashboard-quick-action__icon">
				<Icon size={18} />
			</span>

			<div className="dashboard-quick-action__body">
				<p className="dashboard-quick-action__title">{title}</p>
				<p className="dashboard-quick-action__text">{text}</p>
			</div>

			<ArrowRight size={16} className="dashboard-quick-action__arrow" />
		</Link>
	);
}

function KpiCard({ icon, label, value }) {
	const Icon = icon;

	return (
		<div className="dashboard-kpi-card">
			<div className="dashboard-kpi-card__top">
				<span className="dashboard-kpi-card__icon">
					<Icon size={18} />
				</span>
				<p className="dashboard-kpi-card__label">{label}</p>
			</div>

			<h3 className="dashboard-kpi-card__value">{value}</h3>
		</div>
	);
}

function WidgetCard({ title, subtitle, children, wide = false }) {
	return (
		<div
			className={`dashboard-widget card ${wide ? "dashboard-widget--wide" : ""}`}
		>
			<div className="dashboard-widget__header">
				<div>
					<h3 className="dashboard-widget__title">{title}</h3>
					<p className="dashboard-widget__subtitle">{subtitle}</p>
				</div>
			</div>

			<div className="dashboard-widget__body">{children}</div>
		</div>
	);
}

export default function DashboardPageView({ data }) {
	const { workspaceName, settings, kpis } = data;

	const quickActions = [
		settings.showQuickAddVehicle
			? {
					href: "/vehicles/new",
					icon: CarFront,
					title: "Add vehicle",
					text: "Register a new vehicle and link it to a customer.",
				}
			: null,
		settings.showQuickAddCustomer
			? {
					href: "/customers/new",
					icon: Users,
					title: "Add customer",
					text: "Create a new customer or fleet account record.",
				}
			: null,
		settings.showQuickAddReminder
			? {
					href: "/reminders/new",
					icon: BellRing,
					title: "Add reminder",
					text: "Track service, tax, insurance, or follow-up actions.",
				}
			: null,
		settings.showQuickUploadDoc
			? {
					href: "/documents/new",
					icon: FileText,
					title: "Upload document",
					text: "Store invoices, service records, or supporting files.",
				}
			: null,
		settings.showQuickAddWorkLog
			? {
					href: "/work-logs/new",
					icon: Wrench,
					title: "Add work log",
					text: "Record completed work, odometer, and charge totals.",
				}
			: null,
	].filter(Boolean);

	return (
		<section
			className={`dashboard-view ${settings.compactLayout ? "dashboard-view--compact" : ""}`}
		>
			<div className="dashboard-hero card">
				<div className="dashboard-hero__left">
					<p className="dashboard-hero__eyebrow">Workshop dashboard</p>
					<h2 className="dashboard-hero__title">{workspaceName}</h2>
					<p className="dashboard-hero__subtitle">
						Monitor reminders, work completed, vehicle status, and daily
						workshop activity from one operational view.
					</p>
				</div>

				<div className="dashboard-hero__right">
					<Link href="/settings" className="btn btn-secondary">
						Dashboard settings
					</Link>
				</div>
			</div>

			<div className="dashboard-kpi-grid">
				<KpiCard icon={Users} label="Customers" value={kpis.customersCount} />
				<KpiCard icon={CarFront} label="Vehicles" value={kpis.vehiclesCount} />
				<KpiCard
					icon={BellRing}
					label="Open reminders"
					value={kpis.openRemindersCount}
				/>
				<KpiCard
					icon={FileText}
					label="Documents"
					value={kpis.documentsCount}
				/>
				<KpiCard
					icon={Wrench}
					label="Work logs this month"
					value={kpis.workLogsThisMonthCount}
				/>
			</div>

			{settings.showWelcomeTips ? (
				<div className="dashboard-welcome card">
					<div className="dashboard-welcome__header">
						<div>
							<h3 className="dashboard-widget__title">Welcome tips</h3>
							<p className="dashboard-widget__subtitle">
								A quick checklist to keep the workspace data useful and up to
								date.
							</p>
						</div>
					</div>

					<div className="dashboard-welcome__tips">
						<div className="dashboard-welcome__tip">
							<span className="dashboard-welcome__tip-icon">
								<CarFront size={16} />
							</span>
							<div>
								<p className="dashboard-welcome__tip-title">
									Keep vehicles linked
								</p>
								<p className="dashboard-welcome__tip-text">
									Link vehicles to customers so reminders, work logs, and
									documents stay connected.
								</p>
							</div>
						</div>

						<div className="dashboard-welcome__tip">
							<span className="dashboard-welcome__tip-icon">
								<Wrench size={16} />
							</span>
							<div>
								<p className="dashboard-welcome__tip-title">
									Log completed work quickly
								</p>
								<p className="dashboard-welcome__tip-text">
									Use work logs to keep service history accurate and odometer
									readings moving forward.
								</p>
							</div>
						</div>

						<div className="dashboard-welcome__tip">
							<span className="dashboard-welcome__tip-icon">
								<BellRing size={16} />
							</span>
							<div>
								<p className="dashboard-welcome__tip-title">
									Track upcoming due dates
								</p>
								<p className="dashboard-welcome__tip-text">
									Use reminders for service, NCT, tax, insurance, and customer
									follow-up.
								</p>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{quickActions.length > 0 ? (
				<div className="dashboard-quick-actions card">
					<div className="dashboard-widget__header">
						<div>
							<h3 className="dashboard-widget__title">Quick actions</h3>
							<p className="dashboard-widget__subtitle">
								Common actions for day-to-day workshop operations.
							</p>
						</div>
					</div>

					<div className="dashboard-quick-actions__grid">
						{quickActions.map((action) => (
							<QuickActionCard key={action.href} {...action} />
						))}
					</div>
				</div>
			) : null}

			<div className="dashboard-widgets-grid">
				{settings.showWidgetOverdue ? (
					<WidgetCard
						title="Overdue reminders"
						subtitle="Items that need attention now."
					>
						{data.overdueReminders.length ? (
							<div className="dashboard-list">
								{data.overdueReminders.map((item) => (
									<Link
										key={item.id}
										href={`/reminders/${item.id}`}
										className="dashboard-list-item"
									>
										<div className="dashboard-list-item__left">
											<span className="dashboard-list-item__icon dashboard-list-item__icon--danger">
												<CircleAlert size={16} />
											</span>
											<div>
												<p className="dashboard-list-item__title">
													{item.title}
												</p>
												<p className="dashboard-list-item__meta">
													{formatVehicle(item.vehicle) ||
														formatCustomer(item.customer) ||
														"No linked record"}
												</p>
											</div>
										</div>

										<div className="dashboard-list-item__right">
											<span className="badge badge-danger">
												{formatDate(item.dueAt)}
											</span>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="dashboard-empty">
								<p className="dashboard-empty__title">No overdue reminders</p>
								<p className="dashboard-empty__text">
									You are clear on overdue reminder items right now.
								</p>
							</div>
						)}
					</WidgetCard>
				) : null}

				{settings.showWidgetDueSoon ? (
					<WidgetCard
						title="Due soon"
						subtitle="Upcoming reminder items within the next 7 days."
					>
						{data.dueSoonReminders.length ? (
							<div className="dashboard-list">
								{data.dueSoonReminders.map((item) => (
									<Link
										key={item.id}
										href={`/reminders/${item.id}`}
										className="dashboard-list-item"
									>
										<div className="dashboard-list-item__left">
											<span className="dashboard-list-item__icon dashboard-list-item__icon--warning">
												<Clock3 size={16} />
											</span>
											<div>
												<p className="dashboard-list-item__title">
													{item.title}
												</p>
												<p className="dashboard-list-item__meta">
													{formatVehicle(item.vehicle) ||
														formatCustomer(item.customer) ||
														"No linked record"}
												</p>
											</div>
										</div>

										<div className="dashboard-list-item__right">
											<span className="badge badge-warning">
												{formatDate(item.dueAt)}
											</span>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="dashboard-empty">
								<p className="dashboard-empty__title">Nothing due soon</p>
								<p className="dashboard-empty__text">
									No reminder items are due in the next week.
								</p>
							</div>
						)}
					</WidgetCard>
				) : null}

				{settings.showWidgetStatus ? (
					<WidgetCard
						title="Vehicle status summary"
						subtitle="Current vehicle breakdown by operational status."
					>
						<div className="dashboard-status-summary">
							<div className="dashboard-status-summary__item">
								<div>
									<p className="dashboard-status-summary__label">Active</p>
									<h4 className="dashboard-status-summary__value">
										{data.vehicleStatus.active}
									</h4>
								</div>
								<span className="badge badge-success">Active</span>
							</div>

							<div className="dashboard-status-summary__item">
								<div>
									<p className="dashboard-status-summary__label">Sold</p>
									<h4 className="dashboard-status-summary__value">
										{data.vehicleStatus.sold}
									</h4>
								</div>
								<span className="badge badge-warning">Sold</span>
							</div>

							<div className="dashboard-status-summary__item">
								<div>
									<p className="dashboard-status-summary__label">Archived</p>
									<h4 className="dashboard-status-summary__value">
										{data.vehicleStatus.archived}
									</h4>
								</div>
								<span className="badge badge-neutral">Archived</span>
							</div>
						</div>
					</WidgetCard>
				) : null}

				{settings.showWidgetRecentWorkLogs ? (
					<WidgetCard
						title="Recent work logs"
						subtitle="Latest completed workshop entries."
					>
						{data.recentWorkLogs.length ? (
							<div className="dashboard-list">
								{data.recentWorkLogs.map((item) => (
									<Link
										key={item.id}
										href={`/work-logs/${item.id}`}
										className="dashboard-list-item"
									>
										<div className="dashboard-list-item__left">
											<span className="dashboard-list-item__icon dashboard-list-item__icon--primary">
												<Wrench size={16} />
											</span>
											<div>
												<p className="dashboard-list-item__title">
													{item.title}
												</p>
												<p className="dashboard-list-item__meta">
													{formatVehicle(item.vehicle) ||
														formatCustomer(item.customer) ||
														"No linked record"}
													{" · "}
													{item.performedByUser?.fullName ||
														item.performedByUser?.email ||
														"Unknown"}
												</p>
											</div>
										</div>

										<div className="dashboard-list-item__right dashboard-list-item__right--stack">
											<span className="dashboard-list-item__amount">
												{formatCurrency(item.totalCharge)}
											</span>
											<span className="text-muted">
												{formatDate(item.completedAt)}
											</span>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="dashboard-empty">
								<p className="dashboard-empty__title">No work logs yet</p>
								<p className="dashboard-empty__text">
									Start recording workshop activity to build service history.
								</p>
							</div>
						)}
					</WidgetCard>
				) : null}

				{settings.showWidgetRecent ? (
					<WidgetCard
						title="Recent activity"
						subtitle="Latest movement across work logs, documents, and reminders."
						wide
					>
						{data.recentActivity.length ? (
							<div className="timeline">
								{data.recentActivity.map((item) => (
									<Link
										key={item.id}
										href={item.href}
										className="timeline-item dashboard-timeline-item"
									>
										<div className="dashboard-timeline-item__top">
											<p className="timeline-title">{item.title}</p>
											<span className="dashboard-timeline-item__type">
												{item.type === "work_log"
													? "Work log"
													: item.type === "document"
														? "Document"
														: "Reminder"}
											</span>
										</div>

										<p className="timeline-meta">
											{item.meta} · {formatDateTime(item.date)}
										</p>
									</Link>
								))}
							</div>
						) : (
							<div className="dashboard-empty">
								<p className="dashboard-empty__title">No recent activity</p>
								<p className="dashboard-empty__text">
									Recent work logs, documents, and reminders will appear here.
								</p>
							</div>
						)}
					</WidgetCard>
				) : null}
			</div>
		</section>
	);
}
