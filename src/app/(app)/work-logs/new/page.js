import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import WorkLogForm from "@/components/work-logs/WorkLogForm";

export default async function NewWorkLogPage({ searchParams }) {
	const params = await searchParams;
	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;
	const currentUserId = context?.user?.id || null;

	const [customers, vehicles, members] = await Promise.all([
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

	const initialData = {
		title: params?.title || "",
		customerId: params?.customerId || "",
		vehicleId: params?.vehicleId || "",
		performedByUserId: currentUserId || "",
	};

	return (
		<section className="page-section">
			<div className="page-header">
				<div className="page-header-left">
					<p className="text-muted">Work Logs</p>
					<h2>New work log</h2>
					<p>
						Record completed work, who carried it out, odometer reading, and
						total charges.
					</p>
				</div>
			</div>

			<div className="card">
				<WorkLogForm
					initialData={initialData}
					customers={customers}
					vehicles={vehicles}
					members={members}
				/>
			</div>
		</section>
	);
}
