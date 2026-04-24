import { getRemindersListPage } from "@/lib/queries/reminders";
import RemindersPageClient from "@/components/reminders/RemindersPageClient";

const PAGE_SIZE = 10;

export default async function RemindersPage({ searchParams }) {
	const params = await searchParams;

	const search = typeof params?.search === "string" ? params.search : "";

	const status = typeof params?.status === "string" ? params.status : "All";

	const type = typeof params?.type === "string" ? params.type : "All";

	const timing = typeof params?.timing === "string" ? params.timing : "All";

	const page = Math.max(1, Number(params?.page || 1) || 1);

	const { reminders, totalCount, stats } = await getRemindersListPage({
		search,
		status,
		type,
		timing,
		page,
		pageSize: PAGE_SIZE,
	});

	return (
		<RemindersPageClient
			reminders={reminders}
			totalCount={totalCount}
			stats={stats}
			currentPage={page}
			pageSize={PAGE_SIZE}
			currentSearch={search}
			currentStatus={status}
			currentType={type}
			currentTiming={timing}
		/>
	);
}
