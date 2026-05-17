import { getDashboardPageData } from "@/lib/queries/dashboard";
import DashboardPageClient from "@/components/dashboard/DashboardPageClient";

export const metadata = {
	title: "Dashboard",
};

export default async function DashboardPage() {
	const dashboardData = await getDashboardPageData();

	return <DashboardPageClient dashboardData={dashboardData} />;
}
