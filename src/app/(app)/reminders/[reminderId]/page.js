import Link from "next/link";
import { notFound } from "next/navigation";
import {
	BellRing,
	CalendarDays,
	CarFront,
	UserRound,
	ClipboardList,
	ArrowLeft,
} from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import ReminderDetailActions from "@/components/reminders/ReminderDetailActions";
import {
	formatReminderDate,
	formatReminderStatus,
	formatReminderType,
	getReminderTiming,
} from "@/lib/reminder-utils";

function InfoRow({ label, value }) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				gap: "16px",
				flexWrap: "wrap",
				padding: "10px 0",
				borderBottom: "1px solid var(--border)",
			}}
		>
			<span className="text-muted">{label}</span>
			<span style={{ color: "var(--text)", textAlign: "right" }}>
				{value || "—"}
			</span>
		</div>
	);
}

function formatAuditDate(dateValue) {
	if (!dateValue) return "—";

	return new Date(dateValue).toLocaleString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default async function ReminderDetailPage({ params }) {
	const { reminderId } = await params;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const reminder = await db.reminder.findFirst({
		where: {
			id: reminderId,
			workspaceId,
		},
		include: {
			customer: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					companyName: true,
				},
			},
			vehicle: {
				select: {
					id: true,
					registration: true,
					make: true,
					model: true,
				},
			},
			createdByUser: {
				select: {
					id: true,
					fullName: true,
					email: true,
				},
			},
		},
	});

	if (!reminder) {
		notFound();
	}

	const timing = getReminderTiming(reminder);

	const customerLabel = reminder.customer
		? reminder.customer.companyName ||
			`${reminder.customer.firstName || ""} ${reminder.customer.lastName || ""}`.trim()
		: null;

	const vehicleLabel = reminder.vehicle
		? `${reminder.vehicle.registration} · ${reminder.vehicle.make} ${reminder.vehicle.model}`
		: null;

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<Link href="/reminders" className="vehicle-detail-back">
						<ArrowLeft size={16} />
						Back to reminders
					</Link>
					<p className="text-muted">Reminders</p>
					<h2>{reminder.title}</h2>
					<p>
						{formatReminderType(reminder.type)} · Due{" "}
						{formatReminderDate(reminder.dueAt)}
					</p>
				</div>

				<div className="page-header-right">
					<ReminderDetailActions reminder={reminder} />
				</div>
			</div>

			<div className="content-grid two-col">
				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Reminder details</p>
							<p className="card-subtitle">
								Type, status, due date, and timing overview
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow label="Title" value={reminder.title} />
						<InfoRow label="Type" value={formatReminderType(reminder.type)} />
						<InfoRow
							label="Status"
							value={formatReminderStatus(reminder.status)}
						/>
						<InfoRow
							label="Due date"
							value={formatReminderDate(reminder.dueAt)}
						/>
						<InfoRow label="Timing" value={timing.label} />
						<InfoRow
							label="Completed at"
							value={formatAuditDate(reminder.completedAt)}
						/>
					</div>
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Linked records</p>
							<p className="card-subtitle">
								Customer and vehicle associations for this reminder
							</p>
						</div>
					</div>

					<div className="stack-md">
						<div className="card-muted stack-sm">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "10px",
								}}
							>
								<UserRound size={16} />
								<strong style={{ color: "var(--text)" }}>Customer</strong>
							</div>

							{reminder.customer ? (
								<Link href={`/customers/${reminder.customer.id}`}>
									<span style={{ color: "var(--primary)" }}>
										{customerLabel}
									</span>
								</Link>
							) : (
								<span className="text-faint">Not linked</span>
							)}
						</div>

						<div className="card-muted stack-sm">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "10px",
								}}
							>
								<CarFront size={16} />
								<strong style={{ color: "var(--text)" }}>Vehicle</strong>
							</div>

							{reminder.vehicle ? (
								<Link href={`/vehicles/${reminder.vehicle.id}`}>
									<span style={{ color: "var(--primary)" }}>
										{vehicleLabel}
									</span>
								</Link>
							) : (
								<span className="text-faint">Not linked</span>
							)}
						</div>
					</div>
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Notes</p>
							<p className="card-subtitle">
								Internal workshop context for this reminder
							</p>
						</div>
					</div>

					{reminder.notes ? (
						<p>{reminder.notes}</p>
					) : (
						<p className="text-faint">No notes added for this reminder yet.</p>
					)}
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Audit</p>
							<p className="card-subtitle">
								Creation and update details for this record
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow
							label="Created by"
							value={
								reminder.createdByUser?.fullName ||
								reminder.createdByUser?.email ||
								"Unknown"
							}
						/>
						<InfoRow
							label="Created"
							value={formatAuditDate(reminder.createdAt)}
						/>
						<InfoRow
							label="Updated"
							value={formatAuditDate(reminder.updatedAt)}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
