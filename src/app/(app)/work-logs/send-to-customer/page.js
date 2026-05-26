import { getSendWorkLogsToCustomerPageData } from "@/lib/queries/work-logs";
import SendWorkLogsToCustomerPageClient from "@/components/work-logs/SendWorkLogsToCustomerPageClient";

export const metadata = {
	title: "Send Work Logs",
};

export default async function SendWorkLogsToCustomerPage({ searchParams }) {
	const params = await searchParams;
	const customerId =
		typeof params?.customerId === "string" ? params.customerId : "";

	const pageData = await getSendWorkLogsToCustomerPageData({ customerId });

	return <SendWorkLogsToCustomerPageClient pageData={pageData} />;
}
