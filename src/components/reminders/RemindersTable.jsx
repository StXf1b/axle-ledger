"use client";

import {
	formatReminderDate,
	formatReminderType,
	getReminderTiming,
	formatReminderStatus,
} from "@/lib/reminder-utils";

function getCustomerLabel(customer) {
	if (!customer) return "—";

	return (
		customer.companyName ||
		`${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
		"—"
	);
}

function getVehicleLabel(vehicle) {
	if (!vehicle) return "—";
	return `${vehicle.registration} · ${vehicle.make} ${vehicle.model}`;
}

function getStatusBadgeClass(status) {
	switch (status) {
		case "OPEN":
			return "badge-info";
		case "COMPLETED":
			return "badge-success";
		case "CANCELLED":
			return "badge-neutral";
		default:
			return "badge-neutral";
	}
}

function formatCompletedText(reminder) {
	if (reminder.status !== "COMPLETED") return null;
	return reminder.completedAt
		? `Completed on ${formatReminderDate(reminder.completedAt)}`
		: "Completed";
}

export default function RemindersTable({ reminders, onRowClick }) {
	if (!reminders.length) {
		return (
			<div className="empty-state">
				<p className="empty-state-title">No reminders found</p>
				<p className="empty-state-text">
					Try adjusting your filters or create your first reminder.
				</p>
			</div>
		);
	}

	return (
		<div className="table-wrap">
			<table className="table">
				<thead>
					<tr>
						<th>Reminder</th>
						<th>Type</th>
						<th>Vehicle</th>
						<th>Customer</th>
						<th>Due</th>
						<th>Status</th>
					</tr>
				</thead>

				<tbody>
					{reminders.map((reminder) => {
						const timing = getReminderTiming(reminder);
						const completedText = formatCompletedText(reminder);

						return (
							<tr
								key={reminder.id}
								onClick={() => onRowClick(reminder.id)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onRowClick(reminder.id);
									}
								}}
								tabIndex={0}
								style={{ cursor: "pointer" }}
								aria-label={`Open ${reminder.title}`}
							>
								<td>
									<div className="stack-sm">
										<strong style={{ color: "var(--text)" }}>
											{reminder.title}
										</strong>
										<span className="text-muted">
											{reminder.notes
												? reminder.notes.length > 72
													? `${reminder.notes.slice(0, 72)}...`
													: reminder.notes
												: "No notes added"}
										</span>
									</div>
								</td>

								<td>
									<span className="badge badge-neutral">
										{formatReminderType(reminder.type)}
									</span>
								</td>

								<td>{getVehicleLabel(reminder.vehicle)}</td>

								<td>{getCustomerLabel(reminder.customer)}</td>

								<td>
									<div className="stack-sm">
										<span style={{ color: "var(--text)" }}>
											{formatReminderDate(reminder.dueAt)}
										</span>

										<span className={timing.badgeClass + " badge-table"}>
											{completedText || timing.label}
										</span>
									</div>
								</td>

								<td>
									<span
										className={`badge ${getStatusBadgeClass(reminder.status)}`}
									>
										{formatReminderStatus(reminder.status)}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
