import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import ReminderForm from "@/components/reminders/ReminderForm";

export default async function EditReminderPage({ params }) {
	const { reminderId } = await params;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const [reminder, customers, vehicles] = await Promise.all([
		db.reminder.findFirst({
			where: {
				id: reminderId,
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
			},
		}),
	]);

	if (!reminder) {
		notFound();
	}

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Reminders</p>
					<h2>Edit reminder</h2>
					<p>Update linked records, due date, and reminder details.</p>
				</div>
			</div>

			<div className="card">
				<ReminderForm
					mode="edit"
					reminderId={reminder.id}
					initialData={{
						...reminder,
						dueAt: reminder.dueAt?.toISOString() || null,
						completedAt: reminder.completedAt?.toISOString() || null,
						createdAt: reminder.createdAt.toISOString(),
						updatedAt: reminder.updatedAt.toISOString(),
					}}
					customers={customers}
					vehicles={vehicles}
				/>
			</div>
		</section>
	);
}
