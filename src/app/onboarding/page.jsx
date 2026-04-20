import { redirect } from "next/navigation";
import { getCurrentWorkspaceContext } from "@/lib/auth";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
	const context = await getCurrentWorkspaceContext();

	if (!context?.user) {
		redirect("/sign-in");
	}

	if (context.membership) {
		redirect("/dashboard");
	}

	return <OnboardingForm user={context.user} />;
}
