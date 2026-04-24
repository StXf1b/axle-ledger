import "./customers.css";
import CustomersPageClient from "./CustomersPageClient";
import { getCustomersListPage } from "@/lib/queries/customers";

export const metadata = {
	title: "Customers",
};

const PAGE_SIZE = 10;

export default async function CustomersPage({ searchParams }) {
	const params = await searchParams;

	const search = typeof params?.search === "string" ? params.search : "";

	const status = typeof params?.status === "string" ? params.status : "All";

	const page = Math.max(1, Number(params?.page || 1) || 1);

	const { customers, totalCount, stats } = await getCustomersListPage({
		search,
		status,
		page,
		pageSize: PAGE_SIZE,
	});

	return (
		<CustomersPageClient
			customers={customers}
			totalCount={totalCount}
			stats={stats}
			currentPage={page}
			pageSize={PAGE_SIZE}
			currentSearch={search}
			currentStatus={status}
		/>
	);
}
