import Link from "next/link";
import {
	ArrowRight,
	Plus,
	Wrench,
	UserRound,
	BadgeEuro,
	Gauge,
} from "lucide-react";
import {
	formatCurrency,
	formatOdometer,
	formatWorkLogDate,
} from "@/lib/work-log-utils";
import "./ServiceHistoryCard.css";

export default function ServiceHistoryCard({
	workLogs = [],
	vehicleId,
	customerId = null,
	maxItems = 5,
}) {
	const visibleLogs = workLogs.slice(0, maxItems);
	const hasMore = workLogs.length > maxItems;

	const createParams = new URLSearchParams();
	createParams.set("vehicleId", vehicleId);
	if (customerId) {
		createParams.set("customerId", customerId);
	}

	const listParams = new URLSearchParams();
	listParams.set("vehicleId", vehicleId);

	const createHref = `/work-logs/new?${createParams.toString()}`;
	const viewAllHref = `/work-logs?${listParams.toString()}`;

	return (
		<div className="service-history-card card">
			<div className="service-history-card__header">
				<div className="service-history-card__header-left">
					<p className="service-history-card__eyebrow">Work Logs</p>
					<h3 className="service-history-card__title">Service History</h3>
					<p className="service-history-card__subtitle">
						Recent completed work associated with this vehicle.
					</p>
				</div>

				<div className="service-history-card__header-right">
					<Link href="/documents" className="btn btn-secondary btn-sm">
						View all
					</Link>
					<Link href={createHref} className="btn btn-primary btn-sm">
						<Plus size={16} />
						Add work log
					</Link>
				</div>
			</div>

			{visibleLogs.length === 0 ? (
				<div className="empty-state">
					<p className="empty-state-title">No service history yet</p>
					<p className="empty-state-text">
						Add the first work log to start tracking completed jobs, odometer
						readings, and charge history for this vehicle.
					</p>
				</div>
			) : (
				<div className="service-history-list">
					{visibleLogs.map((log) => (
						<Link
							key={log.id}
							href={`/work-logs/${log.id}`}
							className="service-history-item"
						>
							<div className="service-history-item__top">
								<div className="service-history-item__title-wrap">
									<span className="service-history-item__icon">
										<Wrench size={16} />
									</span>

									<div className="service-history-item__title-block">
										<p className="service-history-item__title">{log.title}</p>
										<p className="service-history-item__meta">
											Completed {formatWorkLogDate(log.completedAt)}
										</p>
									</div>
								</div>

								<div className="service-history-item__price">
									<BadgeEuro size={15} />
									<span>{formatCurrency(log.totalCharge)}</span>
								</div>
							</div>

							<div className="service-history-item__details">
								<div className="service-history-item__detail">
									<Gauge size={15} />
									<span>
										{formatOdometer(log.odometerValue, log.odometerUnit)}
									</span>
								</div>

								<div className="service-history-item__detail">
									<UserRound size={15} />
									<span>
										{log.performedByUser?.fullName ||
											log.performedByUser?.email ||
											"Unknown"}
									</span>
								</div>
							</div>

							{log.description ? (
								<p className="service-history-item__description">
									{log.description.length > 120
										? `${log.description.slice(0, 120)}...`
										: log.description}
								</p>
							) : null}

							<div className="service-history-item__footer">
								<span>Open work log</span>
								<ArrowRight size={16} />
							</div>
						</Link>
					))}
				</div>
			)}

			{hasMore ? (
				<div className="service-history-card__footer">
					<Link href={viewAllHref} className="btn btn-secondary btn-sm">
						See all service history
					</Link>
				</div>
			) : null}
		</div>
	);
}
