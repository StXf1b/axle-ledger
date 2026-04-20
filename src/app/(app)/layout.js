import { redirect } from "next/navigation";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import AppShell from "@/components/app-shell/AppShell";

export default async function AppLayout({ children }) {
	const context = await getCurrentWorkspaceContext();

	if (!context?.user) {
		redirect("/sign-up");
	}

	if (!context.membership) {
		redirect("/onboarding");
	}

	return <AppShell>{children}</AppShell>;
}
