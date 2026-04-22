"use client";

import {
	formatCurrency,
	formatOdometer,
	formatWorkLogDate,
	getCustomerLabel,
	getVehicleLabel,
} from "@/lib/work-log-utils";

export default function WorkLogsTable({ workLogs, onRowClick }) {
	if (!workLogs.length) {
		return (
			<div className="empty-state">
				<p className="empty-state-title">No work logs found</p>
				<p className="empty-state-text">
					Create your first work log to start building service history.
				</p>
			</div>
		);
	}

	return (
		<div className="table-wrap">
			<table className="table">
				<thead>
					<tr>
						<th>Work</th>
						<th>Vehicle</th>
						<th>Customer</th>
						<th>Completed</th>
						<th>Odometer</th>
						<th>Performed by</th>
						<th>Total</th>
					</tr>
				</thead>

				<tbody>
					{workLogs.map((log) => (
						<tr
							key={log.id}
							onClick={() => onRowClick(log.id)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onRowClick(log.id);
								}
							}}
							tabIndex={0}
							style={{ cursor: "pointer" }}
							aria-label={`Open ${log.title}`}
						>
							<td>
								<div className="stack-sm">
									<strong style={{ color: "var(--text)" }}>{log.title}</strong>
									<span className="text-muted">
										{log.description
											? log.description.length > 70
												? `${log.description.slice(0, 70)}...`
												: log.description
											: "No description"}
									</span>
								</div>
							</td>
							<td>{getVehicleLabel(log.vehicle)}</td>
							<td>{getCustomerLabel(log.customer)}</td>
							<td>{formatWorkLogDate(log.completedAt)}</td>
							<td>{formatOdometer(log.odometerValue, log.odometerUnit)}</td>
							<td>
								{log.performedByUser?.fullName ||
									log.performedByUser?.email ||
									"—"}
							</td>
							<td>{formatCurrency(log.totalCharge)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
