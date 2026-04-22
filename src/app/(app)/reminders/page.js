import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import RemindersPageClient from "@/components/reminders/RemindersPageClient";

export default async function RemindersPage() {
	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const reminders = await db.reminder.findMany({
		where: {
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
		orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
	});

	const initialReminders = reminders.map((reminder) => ({
		...reminder,
		dueAt: reminder.dueAt?.toISOString() || null,
		completedAt: reminder.completedAt?.toISOString() || null,
		createdAt: reminder.createdAt.toISOString(),
		updatedAt: reminder.updatedAt.toISOString(),
	}));

	return <RemindersPageClient initialReminders={initialReminders} />;
}
