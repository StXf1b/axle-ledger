import { getWorkLogsListPage } from "@/lib/queries/work-logs";
import WorkLogsPageClient from "@/components/work-logs/WorkLogsPageClient";

const PAGE_SIZE = 10;

export default async function WorkLogsPage({ searchParams }) {
	const params = await searchParams;

	const search = typeof params?.search === "string" ? params.search : "";

	const performedBy =
		typeof params?.performedBy === "string" ? params.performedBy : "All";

	const customerId =
		typeof params?.customerId === "string" ? params.customerId : "";

	const vehicleId =
		typeof params?.vehicleId === "string" ? params.vehicleId : "";

	const page = Math.max(1, Number(params?.page || 1) || 1);

	const { workLogs, totalCount, stats, staffOptions } =
		await getWorkLogsListPage({
			search,
			performedBy,
			customerId,
			vehicleId,
			page,
			pageSize: PAGE_SIZE,
		});

	return (
		<WorkLogsPageClient
			workLogs={workLogs}
			totalCount={totalCount}
			stats={stats}
			staffOptions={staffOptions}
			currentPage={page}
			pageSize={PAGE_SIZE}
			currentSearch={search}
			currentPerformedBy={performedBy}
			currentCustomerId={customerId}
			currentVehicleId={vehicleId}
		/>
	);
}
