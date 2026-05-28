import { getSettingsPageData } from "@/lib/queries/settings";
import SettingsPageClient from "@/components/settings/SettingsPageClient";

export default async function SettingsPage({ searchParams }) {
	const params = (await searchParams) || {};
	const billingState = Array.isArray(params.billing)
		? params.billing[0]
		: params.billing;
	const initialData = await getSettingsPageData({
		syncStripeSubscription: billingState === "portal_return",
	});

	return <SettingsPageClient initialData={initialData} />;
}
