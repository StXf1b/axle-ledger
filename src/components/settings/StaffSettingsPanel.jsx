"use client";

import { useState, useTransition } from "react";
import "./StaffSettingsPanel.css";
import Button from "@/components/ui/Button";
import {
	updateMemberRole,
	removeMemberFromWorkspace,
} from "@/actions/settings";

export default function StaffSettingsPanel({
	members,
	currentRole,
	currentUserId,
}) {
	const [isPending, startTransition] = useTransition();
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const canManageRoles = currentRole === "OWNER";

	const [roleState, setRoleState] = useState(
		Object.fromEntries(members.map((member) => [member.id, member.role])),
	);

	function handleRoleChange(memberId, nextRole) {
		setRoleState((prev) => ({
			...prev,
			[memberId]: nextRole,
		}));
		setMessage("");
		setError("");
	}

	function handleSaveRole(memberId) {
		startTransition(async () => {
			try {
				await updateMemberRole({
					memberId,
					role: roleState[memberId],
				});
				setMessage("Member role updated.");
				setError("");
			} catch (err) {
				setError(err?.message || "Failed to update member role.");
				setMessage("");
			}
		});
	}

	function handleRemoveMember(memberId, memberName) {
		const confirmed = window.confirm(
			`Remove ${memberName} from this workspace?`,
		);

		if (!confirmed) return;

		startTransition(async () => {
			try {
				await removeMemberFromWorkspace(memberId);
				setMessage("Member removed from workspace.");
				setError("");
			} catch (err) {
				setError(err?.message || "Failed to remove member.");
				setMessage("");
			}
		});
	}

	return (
		<div className="staff-settings stack-lg">
			<div className="card stack-md">
				<div className="settings-section-header">
					<div>
						<h3 className="settings-section-title">Team members</h3>
						<p className="settings-section-text">
							View current workspace members and their access roles.
						</p>
					</div>
				</div>

				{message ? <p className="text-success">{message}</p> : null}
				{error ? <p className="text-danger">{error}</p> : null}

				<div className="staff-list">
					{members.map((member) => {
						const isSelf = member.user.id === currentUserId;
						const isOwner = member.role === "OWNER";
						const editable = canManageRoles && !isSelf && !isOwner;
						const removable = canManageRoles && !isSelf && !isOwner;

						return (
							<div key={member.id} className="staff-row">
								<div className="staff-row__left">
									<div className="staff-avatar">
										{member.user.fullName
											.split(" ")
											.map((part) => part[0])
											.slice(0, 2)
											.join("")}
									</div>

									<div className="staff-row__info">
										<p className="staff-row__name">{member.user.fullName}</p>
										<p className="staff-row__email">{member.user.email}</p>
									</div>
								</div>

								<div className="staff-row__right">
									<span
										className={`badge ${
											member.role === "OWNER"
												? "badge-info"
												: member.role === "ADMIN"
													? "badge-warning"
													: "badge-neutral"
										}`}
									>
										{member.role}
									</span>

									<select
										className="staff-role-select"
										value={roleState[member.id]}
										onChange={(e) =>
											handleRoleChange(member.id, e.target.value)
										}
										disabled={!editable}
									>
										<option value="ADMIN">Admin</option>
										<option value="STAFF">Staff</option>
									</select>

									<Button
										variant="secondary"
										size="sm"
										onClick={() => handleSaveRole(member.id)}
										disabled={!editable || isPending}
									>
										Save role
									</Button>

									<Button
										variant="danger"
										size="sm"
										onClick={() =>
											handleRemoveMember(member.id, member.user.fullName)
										}
										disabled={!removable || isPending}
									>
										Remove
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="card stack-md">
				<div className="settings-section-header">
					<div>
						<h3 className="settings-section-title">Role guide</h3>
						<p className="settings-section-text">
							A quick overview of access levels inside the workspace.
						</p>
					</div>
				</div>

				<div className="role-guide-grid">
					<div className="role-guide-card">
						<h4>Owner</h4>
						<p>Full access to workspace settings, staff, and future billing.</p>
					</div>

					<div className="role-guide-card">
						<h4>Admin</h4>
						<p>Can manage most workspace records and operational workflows.</p>
					</div>

					<div className="role-guide-card">
						<h4>Staff</h4>
						<p>Can manage day-to-day records and core dashboard operations.</p>
					</div>
				</div>
			</div>
		</div>
	);
}
