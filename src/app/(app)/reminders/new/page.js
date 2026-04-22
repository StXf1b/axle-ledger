import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import ReminderForm from "@/components/reminders/ReminderForm";

export default async function NewReminderPage({ searchParams }) {
	const params = await searchParams;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const [customers, vehicles] = await Promise.all([
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

	const initialData = {
		title: params?.title || "",
		type: params?.type || "CUSTOM",
		customerId: params?.customerId || "",
		vehicleId: params?.vehicleId || "",
	};

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Reminders</p>
					<h2>New reminder</h2>
					<p>
						Create a new reminder for service work, follow-up, or vehicle
						compliance dates.
					</p>
				</div>
			</div>

			<div className="card">
				<ReminderForm
					initialData={initialData}
					customers={customers}
					vehicles={vehicles}
				/>
			</div>
		</section>
	);
}
