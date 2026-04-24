import { getDocumentsListPage } from "@/lib/queries/documents";
import DocumentsPageClient from "./DocumentsPageClient";

const PAGE_SIZE = 10;

export default async function DocumentsPage({ searchParams }) {
	const params = await searchParams;

	const search = typeof params?.search === "string" ? params.search : "";

	const category =
		typeof params?.category === "string" ? params.category : "All";

	const linkedTo =
		typeof params?.linkedTo === "string" ? params.linkedTo : "All";

	const customerId =
		typeof params?.customerId === "string" ? params.customerId : "";

	const vehicleId =
		typeof params?.vehicleId === "string" ? params.vehicleId : "";

	const page = Math.max(1, Number(params?.page || 1) || 1);

	const { documents, totalCount, stats } = await getDocumentsListPage({
		search,
		category,
		linkedTo,
		customerId,
		vehicleId,
		page,
		pageSize: PAGE_SIZE,
	});

	return (
		<DocumentsPageClient
			documents={documents}
			totalCount={totalCount}
			stats={stats}
			currentPage={page}
			pageSize={PAGE_SIZE}
			currentSearch={search}
			currentCategory={category}
			currentLinkedTo={linkedTo}
			currentCustomerId={customerId}
			currentVehicleId={vehicleId}
		/>
	);
}
