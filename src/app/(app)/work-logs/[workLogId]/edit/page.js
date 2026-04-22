import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import WorkLogForm from "@/components/work-logs/WorkLogForm";

export default async function EditWorkLogPage({ params }) {
	const { workLogId } = await params;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const [workLog, customers, vehicles, members] = await Promise.all([
		db.workLog.findFirst({
			where: {
				id: workLogId,
				workspaceId,
			},
		}),
		db.customer.findMany({
			where: { workspaceId },
			orderBy: [
				{ companyName: "asc" },
				{ lastName: "asc" },
				{ firstName: "asc" },
			],
			select: {
				id: true,
				firstName: true,
				lastName: true,
				companyName: true,
			},
		}),
		db.vehicle.findMany({
			where: { workspaceId },
			orderBy: [{ registration: "asc" }],
			select: {
				id: true,
				registration: true,
				make: true,
				model: true,
				customerId: true,
				odometerValue: true,
				odometerUnit: true,
			},
		}),
		db.workspaceMember.findMany({
			where: { workspaceId },
			include: {
				user: {
					select: {
						id: true,
						fullName: true,
						email: true,
					},
				},
			},
			orderBy: [{ createdAt: "asc" }],
		}),
	]);

	if (!workLog) {
		notFound();
	}

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Work Logs</p>
					<h2>Edit work log</h2>
					<p>Update the completed work entry, odometer, and charge details.</p>
				</div>
			</div>

			<div className="card">
				<WorkLogForm
					mode="edit"
					workLogId={workLog.id}
					initialData={{
						...workLog,
						completedAt: workLog.completedAt?.toISOString() || null,
						nextServiceDueAt: workLog.nextServiceDueAt?.toISOString() || null,
						createdAt: workLog.createdAt.toISOString(),
						updatedAt: workLog.updatedAt.toISOString(),
						labourCharge: workLog.labourCharge?.toString() || "0",
						partsCharge: workLog.partsCharge?.toString() || "0",
						totalCharge: workLog.totalCharge?.toString() || "0",
					}}
					customers={customers}
					vehicles={vehicles}
					members={members}
				/>
			</div>
		</section>
	);
}
