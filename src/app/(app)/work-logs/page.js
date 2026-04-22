import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import WorkLogsPageClient from "@/components/work-logs/WorkLogsPageClient";

export default async function WorkLogsPage({ searchParams }) {
	const params = await searchParams;

	const context = await getCurrentWorkspaceContext();
	const workspaceId =
		context?.workspace?.id || context?.membership?.workspaceId;

	const where = {
		workspaceId,
		...(params?.vehicleId ? { vehicleId: params.vehicleId } : {}),
		...(params?.customerId ? { customerId: params.customerId } : {}),
	};

	const workLogs = await db.workLog.findMany({
		where,
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
		orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
	});

	const initialWorkLogs = workLogs.map((workLog) => ({
		...workLog,
		completedAt: workLog.completedAt?.toISOString() || null,
		nextServiceDueAt: workLog.nextServiceDueAt?.toISOString() || null,
		createdAt: workLog.createdAt.toISOString(),
		updatedAt: workLog.updatedAt.toISOString(),
		labourCharge: workLog.labourCharge?.toString() || "0",
		partsCharge: workLog.partsCharge?.toString() || "0",
		totalCharge: workLog.totalCharge?.toString() || "0",
	}));

	return <WorkLogsPageClient initialWorkLogs={initialWorkLogs} />;
}
