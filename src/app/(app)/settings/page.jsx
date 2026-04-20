import { getSettingsPageData } from "@/lib/queries/settings";
import SettingsPageClient from "@/components/settings/SettingsPageClient";

export default async function SettingsPage() {
	const initialData = await getSettingsPageData();

	return <SettingsPageClient initialData={initialData} />;
}
