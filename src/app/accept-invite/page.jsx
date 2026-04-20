import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AuthCard from "@/components/ui/AuthCard";
import AcceptInviteCard from "./AcceptInviteCard";
import { db } from "@/lib/db";

export default async function AcceptInvitePage({ searchParams }) {
	const { token } = await searchParams;

	if (!token) {
		return (
			<AuthCard
				title="Invalid invite"
				subtitle="This invite link is missing a token."
			/>
		);
	}

	const invite = await db.workspaceInvite.findUnique({
		where: {
			token,
		},
		include: {
			workspace: true,
		},
	});

	if (!invite) {
		return (
			<AuthCard
				title="Invite not found"
				subtitle="This invite does not exist or has been removed."
			/>
		);
	}

	if (invite.status !== "PENDING") {
		return (
			<AuthCard
				title="Invite unavailable"
				subtitle="This invite is no longer active."
			/>
		);
	}

	if (invite.expiresAt < new Date()) {
		return (
			<AuthCard
				title="Invite expired"
				subtitle="This invite has expired. Ask the workspace owner to send a new one."
			/>
		);
	}

	const { userId } = await auth();

	if (!userId) {
		redirect(
			`/sign-in?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`,
		);
	}

	const appUser = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
	});

	if (!appUser) {
		redirect(
			`/sign-in?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`,
		);
	}

	const alreadyMember = await db.workspaceMember.findFirst({
		where: {
			workspaceId: invite.workspaceId,
			userId: appUser.id,
		},
	});

	const emailMatches =
		appUser.email.toLowerCase() === invite.email.toLowerCase();

	return (
		<AcceptInviteCard
			token={token}
			invite={{
				email: invite.email,
				role: invite.role,
				workspaceName: invite.workspace.name,
			}}
			currentUserEmail={appUser.email}
			emailMatches={emailMatches}
			alreadyMember={!!alreadyMember}
		/>
	);
}
