import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilLine, CarFront, UserRound, Wrench } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import {
	formatCurrency,
	formatOdometer,
	formatWorkLogDate,
	formatWorkLogDateTime,
	getCustomerLabel,
	getVehicleLabel,
} from "@/lib/work-log-utils";

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

export default async function WorkLogDetailPage({ params }) {
	const { workLogId } = await params;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const workLog = await db.workLog.findFirst({
		where: {
			id: workLogId,
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
			performedByUser: {
				select: {
					id: true,
					fullName: true,
					email: true,
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

	if (!workLog) {
		notFound();
	}

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Work Logs</p>
					<h2>{workLog.title}</h2>
					<p>
						Completed {formatWorkLogDate(workLog.completedAt)} · Total{" "}
						{formatCurrency(workLog.totalCharge)}
					</p>
				</div>

				<div className="page-header-right">
					<Link href={`/work-logs/${workLog.id}/edit`}>
						<button className="btn btn-secondary">
							<PencilLine size={18} />
							Edit work log
						</button>
					</Link>
				</div>
			</div>

			<div className="content-grid two-col">
				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Work details</p>
							<p className="card-subtitle">
								Completed work, date, odometer, and charge summary
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow label="Title" value={workLog.title} />
						<InfoRow
							label="Completed date"
							value={formatWorkLogDate(workLog.completedAt)}
						/>
						<InfoRow
							label="Odometer"
							value={formatOdometer(
								workLog.odometerValue,
								workLog.odometerUnit,
							)}
						/>
						<InfoRow
							label="Labour"
							value={formatCurrency(workLog.labourCharge)}
						/>
						<InfoRow
							label="Parts"
							value={formatCurrency(workLog.partsCharge)}
						/>
						<InfoRow
							label="Total"
							value={formatCurrency(workLog.totalCharge)}
						/>
					</div>
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Linked records</p>
							<p className="card-subtitle">
								Customer and vehicle linked to this work log
							</p>
						</div>
					</div>

					<div className="stack-md">
						<div className="card-muted stack-sm">
							<div
								style={{ display: "flex", alignItems: "center", gap: "10px" }}
							>
								<UserRound size={16} />
								<strong style={{ color: "var(--text)" }}>Customer</strong>
							</div>

							{workLog.customer ? (
								<Link href={`/customers/${workLog.customer.id}`}>
									<span style={{ color: "var(--primary)" }}>
										{getCustomerLabel(workLog.customer)}
									</span>
								</Link>
							) : (
								<span className="text-faint">Not linked</span>
							)}
						</div>

						<div className="card-muted stack-sm">
							<div
								style={{ display: "flex", alignItems: "center", gap: "10px" }}
							>
								<CarFront size={16} />
								<strong style={{ color: "var(--text)" }}>Vehicle</strong>
							</div>

							{workLog.vehicle ? (
								<Link href={`/vehicles/${workLog.vehicle.id}`}>
									<span style={{ color: "var(--primary)" }}>
										{getVehicleLabel(workLog.vehicle)}
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
							<p className="card-title">Service planning</p>
							<p className="card-subtitle">
								Optional next-service targets captured with this log
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow
							label="Next service due date"
							value={formatWorkLogDate(workLog.nextServiceDueAt)}
						/>
						<InfoRow
							label="Next service odometer"
							value={formatOdometer(
								workLog.nextServiceOdometer,
								workLog.nextServiceOdometerUnit,
							)}
						/>
					</div>
				</div>

				<div className="card stack-md">
					<div className="card-header">
						<div>
							<p className="card-title">Audit</p>
							<p className="card-subtitle">
								Who performed the work and who created the log
							</p>
						</div>
					</div>

					<div className="stack-sm">
						<InfoRow
							label="Performed by"
							value={
								workLog.performedByUser?.fullName ||
								workLog.performedByUser?.email ||
								"Unknown"
							}
						/>
						<InfoRow
							label="Created by"
							value={
								workLog.createdByUser?.fullName ||
								workLog.createdByUser?.email ||
								"Unknown"
							}
						/>
						<InfoRow
							label="Created"
							value={formatWorkLogDateTime(workLog.createdAt)}
						/>
						<InfoRow
							label="Updated"
							value={formatWorkLogDateTime(workLog.updatedAt)}
						/>
					</div>
				</div>
			</div>

			<div className="card stack-md">
				<div className="card-header">
					<div>
						<p className="card-title">Description</p>
						<p className="card-subtitle">What work was carried out</p>
					</div>
				</div>

				{workLog.description ? (
					<p>{workLog.description}</p>
				) : (
					<p className="text-faint">No description added for this work log.</p>
				)}
			</div>

			<div className="card stack-md">
				<div className="card-header">
					<div>
						<p className="card-title">Notes</p>
						<p className="card-subtitle">Internal workshop notes</p>
					</div>
				</div>

				{workLog.notes ? (
					<p>{workLog.notes}</p>
				) : (
					<p className="text-faint">No internal notes added.</p>
				)}
			</div>
		</section>
	);
}
