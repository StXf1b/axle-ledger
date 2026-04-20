"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AuthCard from "@/components/ui/AuthCard";
import Button from "@/components/ui/Button";
import { acceptWorkspaceInvite } from "@/actions/invites";

export default function AcceptInviteCard({
	token,
	invite,
	currentUserEmail,
	emailMatches,
	alreadyMember,
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");

	function handleAccept() {
		startTransition(async () => {
			try {
				await acceptWorkspaceInvite(token);
				router.push("/dashboard");
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to accept invite.");
			}
		});
	}

	if (alreadyMember) {
		return (
			<AuthCard
				title="Already a member"
				subtitle={`You are already a member of ${invite.workspaceName}.`}
				footer={<p>Signed in as {currentUserEmail}</p>}
			>
				<Button
					variant="primary"
					size="lg"
					fullWidth
					onClick={() => router.push("/dashboard")}
				>
					Go to dashboard
				</Button>
			</AuthCard>
		);
	}

	if (!emailMatches) {
		return (
			<AuthCard
				title="Wrong account"
				subtitle={`This invite is for ${invite.email}, but you are signed in as ${currentUserEmail}.`}
			>
				<p className="text-danger">
					Sign in with the invited email address to accept this invite.
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title="Accept workspace invite"
			subtitle={`Join ${invite.workspaceName} as ${invite.role}.`}
			footer={<p>Signed in as {currentUserEmail}</p>}
		>
			<div className="stack-md">
				{error ? <p className="text-danger">{error}</p> : null}

				<Button
					variant="primary"
					size="lg"
					fullWidth
					loading={isPending}
					rightIcon={!isPending ? <ArrowRight size={18} /> : null}
					onClick={handleAccept}
				>
					Accept invite
				</Button>
			</div>
		</AuthCard>
	);
}
