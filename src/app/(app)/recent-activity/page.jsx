import { getRecentActivityPageData } from "@/lib/queries/recent-activity";
import RecentActivityPageClient from "@/components/recent-activity/RecentActivityPageClient";

export const metadata = {
	title: "Recent Activity",
};

export default async function RecentActivityPage({ searchParams }) {
	const params = await searchParams;

	const pageData = await getRecentActivityPageData({
		page: params?.page,
		search: params?.search,
		group: params?.group,
		period: params?.period,
	});

	return <RecentActivityPageClient pageData={pageData} />;
}
