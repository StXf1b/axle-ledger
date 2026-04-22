import Link from "next/link";
import { BellRing, Plus, ArrowRight, CarFront, UserRound } from "lucide-react";
import {
	formatReminderDate,
	formatReminderStatus,
	formatReminderType,
	getReminderTiming,
} from "@/lib/reminder-utils";
import "./LinkedRemindersCard.css";

function sortReminders(reminders) {
	return [...reminders].sort((a, b) => {
		const aOpen = a.status === "OPEN" ? 0 : 1;
		const bOpen = b.status === "OPEN" ? 0 : 1;

		if (aOpen !== bOpen) return aOpen - bOpen;

		const aDate = a.dueAt ? new Date(a.dueAt).getTime() : 0;
		const bDate = b.dueAt ? new Date(b.dueAt).getTime() : 0;

		return aDate - bDate;
	});
}

function getStatusClass(status) {
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

function getCustomerLabel(customer) {
	if (!customer) return null;

	return (
		customer.companyName ||
		`${customer.firstName || ""} ${customer.lastName || ""}`.trim()
	);
}

function getVehicleLabel(vehicle) {
	if (!vehicle) return null;
	return `${vehicle.registration} · ${vehicle.make} ${vehicle.model}`;
}

export default function LinkedRemindersCard({
	title = "Linked reminders",
	subtitle = "Track reminders associated with this record.",
	reminders = [],
	customerId = null,
	vehicleId = null,
	showCustomer = false,
	showVehicle = false,
	maxItems = 6,
}) {
	const sortedReminders = sortReminders(reminders);
	const visibleReminders = sortedReminders.slice(0, maxItems);

	const createHref = `/reminders/new?${new URLSearchParams({
		...(customerId ? { customerId } : {}),
		...(vehicleId ? { vehicleId } : {}),
	}).toString()}`;

	return (
		<div className="linked-reminders-card card">
			<div className="linked-reminders-card__header">
				<div className="linked-reminders-card__header-left">
					<p className="linked-reminders-card__eyebrow">Reminders</p>
					<h3 className="linked-reminders-card__title">{title}</h3>
					<p className="linked-reminders-card__subtitle">{subtitle}</p>
				</div>

				<div className="linked-reminders-card__header-right">
					<Link href="/reminders" className="btn btn-secondary btn-sm">
						View all
					</Link>

					<Link href={createHref} className="btn btn-primary btn-sm">
						<Plus size={16} />
						Add reminder
					</Link>
				</div>
			</div>

			{visibleReminders.length === 0 ? (
				<div className="empty-state">
					<p className="empty-state-title">No reminders linked yet</p>
					<p className="empty-state-text">
						Create a reminder for service, tax, insurance, NCT, or follow-up
						work.
					</p>
				</div>
			) : (
				<div className="linked-reminders-list">
					{visibleReminders.map((reminder) => {
						const timing = getReminderTiming(reminder);
						const customerLabel = getCustomerLabel(reminder.customer);
						const vehicleLabel = getVehicleLabel(reminder.vehicle);

						return (
							<Link
								key={reminder.id}
								href={`/reminders/${reminder.id}`}
								className="linked-reminders-item"
							>
								<div className="linked-reminders-item__top">
									<div className="linked-reminders-item__title-wrap">
										<span className="linked-reminders-item__icon">
											<BellRing size={16} />
										</span>

										<div className="linked-reminders-item__title-block">
											<p className="linked-reminders-item__title">
												{reminder.title}
											</p>
											<p className="linked-reminders-item__meta">
												{formatReminderType(reminder.type)} · Due{" "}
												{formatReminderDate(reminder.dueAt)}
											</p>
										</div>
									</div>

									<div className="linked-reminders-item__badges">
										<span className={`badge ${timing.badgeClass}`}>
											{timing.label}
										</span>
										<span
											className={`badge ${getStatusClass(reminder.status)}`}
										>
											{formatReminderStatus(reminder.status)}
										</span>
									</div>
								</div>

								{showVehicle && vehicleLabel ? (
									<div className="linked-reminders-item__relation">
										<CarFront size={15} />
										<span>{vehicleLabel}</span>
									</div>
								) : null}

								{showCustomer && customerLabel ? (
									<div className="linked-reminders-item__relation">
										<UserRound size={15} />
										<span>{customerLabel}</span>
									</div>
								) : null}

								{reminder.notes ? (
									<p className="linked-reminders-item__notes">
										{reminder.notes.length > 120
											? `${reminder.notes.slice(0, 120)}...`
											: reminder.notes}
									</p>
								) : null}

								<div className="linked-reminders-item__footer">
									<span>Open reminder</span>
									<ArrowRight size={16} />
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
