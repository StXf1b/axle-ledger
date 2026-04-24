import "./vehicles.css";
import VehiclesPageClient from "./VehiclesPageClient";
import { getVehiclesListPage } from "@/lib/queries/vehicles";

export const metadata = {
	title: "Vehicles",
};

const PAGE_SIZE = 10;

export default async function VehiclesPage({ searchParams }) {
	const params = await searchParams;

	const search = typeof params?.search === "string" ? params.search : "";

	const status = typeof params?.status === "string" ? params.status : "All";

	const page = Math.max(1, Number(params?.page || 1) || 1);

	const { vehicles, totalCount, stats } = await getVehiclesListPage({
		search,
		status,
		page,
		pageSize: PAGE_SIZE,
	});

	return (
		<VehiclesPageClient
			vehicles={vehicles}
			totalCount={totalCount}
			stats={stats}
			currentPage={page}
			pageSize={PAGE_SIZE}
			currentSearch={search}
			currentStatus={status}
		/>
	);
}
