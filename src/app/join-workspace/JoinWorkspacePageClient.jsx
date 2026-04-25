"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, ArrowRight, Users, Mail } from "lucide-react";

import AuthCard from "@/components/ui/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import "./JoinWorkspacePageClient.css";

function extractInviteToken(value) {
	if (!value || typeof value !== "string") return "";

	const trimmed = value.trim();
	if (!trimmed) return "";

	// Raw token pasted directly
	if (
		!trimmed.includes("http") &&
		!trimmed.includes("?") &&
		!trimmed.includes("/")
	) {
		return trimmed;
	}

	// Full URL pasted
	try {
		const parsedUrl = new URL(trimmed);
		const tokenFromQuery = parsedUrl.searchParams.get("token");
		if (tokenFromQuery) return tokenFromQuery.trim();
	} catch {
		// ignore and try relative path parsing below
	}

	// Relative path pasted, e.g. /accept-invite?token=abc123
	try {
		const parsedRelativeUrl = new URL(trimmed, "https://axleledger.local");
		const tokenFromRelativeQuery = parsedRelativeUrl.searchParams.get("token");
		if (tokenFromRelativeQuery) return tokenFromRelativeQuery.trim();
	} catch {
		// ignore
	}

	// Fallback for someone pasting "...token=abc123"
	const match = trimmed.match(/[?&]token=([^&]+)/i);
	if (match?.[1]) {
		try {
			return decodeURIComponent(match[1]).trim();
		} catch {
			return match[1].trim();
		}
	}

	return "";
}

export default function JoinWorkspacePageClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isLoaded, userId } = useAuth();
	const { user } = useUser();

	const presetToken = useMemo(
		() => searchParams.get("token") || "",
		[searchParams],
	);

	const [inviteValue, setInviteValue] = useState(presetToken);
	const [error, setError] = useState("");

	function handleSubmit(event) {
		event.preventDefault();

		const token = extractInviteToken(inviteValue);

		if (!token) {
			setError("Paste a valid invite link or invite token.");
			return;
		}

		setError("");

		const target = `/accept-invite?token=${encodeURIComponent(token)}`;

		if (!isLoaded) return;

		if (userId) {
			router.push(target);
			return;
		}

		router.push(`/sign-in?redirect=${encodeURIComponent(target)}`);
	}

	return (
		<AuthCard
			title="Join a workspace"
			subtitle="Paste your workspace invite link or invite token to continue."
			footer={
				<div className="stack-sm">
					<p>
						Need to create your own workspace instead?{" "}
						<Link href="/onboarding">Go back to onboarding</Link>
					</p>
				</div>
			}
		>
			<div className="join-workspace stack-md">
				<div className="join-workspace__info">
					<div className="join-workspace__info-icon">
						<Users size={18} />
					</div>

					<div className="join-workspace__info-text">
						<p className="join-workspace__info-title">
							Joining an existing team
						</p>
						<p className="join-workspace__info-copy">
							Ask the workspace owner or admin to send you an invite link. You
							must accept the invite using the same email address it was sent
							to.
						</p>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="stack-md">
					<Input
						label="Invite link or token"
						name="invite"
						value={inviteValue}
						onChange={(e) => {
							setInviteValue(e.target.value);
							setError("");
						}}
						placeholder="Paste invite link or token"
						icon={<Link2 size={18} />}
						error={error}
						required
					/>

					{user?.primaryEmailAddress?.emailAddress ? (
						<div className="join-workspace__signed-in">
							<Mail size={16} />
							<span>
								Currently signed in as{" "}
								<strong>{user.primaryEmailAddress.emailAddress}</strong>
							</span>
						</div>
					) : null}

					<Button
						type="submit"
						variant="primary"
						size="lg"
						fullWidth
						rightIcon={<ArrowRight size={18} />}
					>
						Continue to invite
					</Button>
				</form>
			</div>
		</AuthCard>
	);
}
