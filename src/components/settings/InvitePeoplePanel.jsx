"use client";

import { useMemo, useState, useTransition } from "react";
import "./InvitePeoplePanel.css";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
	createWorkspaceInvite,
	revokeWorkspaceInvite,
} from "@/actions/invites";

export default function InvitePeoplePanel({ invites, currentRole }) {
	const [isPending, startTransition] = useTransition();
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const [form, setForm] = useState({
		email: "",
		role: "STAFF",
	});

	const canManageInvites = ["OWNER", "ADMIN"].includes(currentRole);

	const sortedInvites = useMemo(() => {
		return [...invites].sort(
			(a, b) => new Date(b.createdAt) - new Date(a.createdAt),
		);
	}, [invites]);

	function handleChange(e) {
		const { name, value } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: value,
		}));
		setMessage("");
		setError("");
	}

	function buildInviteLink(token) {
		if (typeof window === "undefined") return "";
		return `${window.location.origin}/accept-invite?token=${token}`;
	}

	function handleCreateInvite(e) {
		e.preventDefault();

		startTransition(async () => {
			try {
				const result = await createWorkspaceInvite({
					email: form.email,
					role: form.role,
				});

				const inviteLink = buildInviteLink(result.token);

				if (inviteLink) {
					await navigator.clipboard.writeText(inviteLink);
				}

				setMessage("Invite created and copied to clipboard.");
				setError("");
				setForm({
					email: "",
					role: "STAFF",
				});
			} catch (err) {
				setError(err?.message || "Failed to create invite.");
				setMessage("");
			}
		});
	}

	function handleCopyInvite(token) {
		const inviteLink = buildInviteLink(token);

		if (!inviteLink) return;

		navigator.clipboard
			.writeText(inviteLink)
			.then(() => {
				setMessage("Invite link copied.");
				setError("");
			})
			.catch(() => {
				setError("Failed to copy invite link.");
				setMessage("");
			});
	}

	function handleRevokeInvite(inviteId) {
		startTransition(async () => {
			try {
				await revokeWorkspaceInvite(inviteId);
				setMessage("Invite revoked.");
				setError("");
			} catch (err) {
				setError(err?.message || "Failed to revoke invite.");
				setMessage("");
			}
		});
	}

	return (
		<div className="invite-people stack-lg">
			<div className="card stack-md">
				<div className="settings-section-header">
					<div>
						<h3 className="settings-section-title">Invite a team member</h3>
						<p className="settings-section-text">
							Create an invite link for a staff member to join your workspace.
						</p>
					</div>
				</div>

				<form className="invite-form" onSubmit={handleCreateInvite}>
					<div className="invite-form__grid">
						<Input
							label="Email address"
							name="email"
							type="email"
							placeholder="staffmember@example.com"
							value={form.email}
							onChange={handleChange}
							disabled={!canManageInvites}
						/>

						<div className="field">
							<label className="field-label" htmlFor="inviteRole">
								Role
							</label>
							<select
								id="inviteRole"
								name="role"
								className="invite-role-select"
								value={form.role}
								onChange={handleChange}
								disabled={!canManageInvites}
							>
								<option value="STAFF">Staff</option>
								<option value="ADMIN">Admin</option>
							</select>
						</div>
					</div>

					{message ? <p className="text-success">{message}</p> : null}
					{error ? <p className="text-danger">{error}</p> : null}

					<div className="settings-form-actions">
						<Button
							type="submit"
							variant="primary"
							loading={isPending}
							disabled={!canManageInvites}
						>
							Create invite link
						</Button>
					</div>
				</form>
			</div>

			<div className="card stack-md">
				<div className="settings-section-header">
					<div>
						<h3 className="settings-section-title">Pending invitations</h3>
						<p className="settings-section-text">
							Review active invites that have not yet been accepted.
						</p>
					</div>
				</div>

				{sortedInvites.length === 0 ? (
					<div className="empty-state">
						<p className="empty-state-title">No pending invites</p>
						<p className="empty-state-text">
							Create an invite link above to bring staff into your workspace.
						</p>
					</div>
				) : (
					<div className="invite-list">
						{sortedInvites.map((invite) => (
							<div className="invite-row" key={invite.id}>
								<div className="invite-row__left">
									<p className="invite-row__email">{invite.email}</p>
									<p className="invite-row__meta">
										Role: {invite.role} • Expires{" "}
										{new Date(invite.expiresAt).toLocaleDateString()}
									</p>
								</div>

								<div className="invite-row__right">
									<span className="badge badge-warning">Pending</span>

									<Button
										variant="secondary"
										size="sm"
										onClick={() => handleCopyInvite(invite.token)}
									>
										Copy link
									</Button>

									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleRevokeInvite(invite.id)}
										disabled={!canManageInvites || isPending}
									>
										Revoke
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
