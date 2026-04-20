"use client";

import { useMemo, useState } from "react";
import { Settings, LayoutDashboard, Users, UserPlus } from "lucide-react";

import "./SettingsPageClient.css";
import GeneralSettingsPanel from "./GeneralSettingsPanel";
import DashboardSettingsPanel from "./DashboardSettingsPanel";
import StaffSettingsPanel from "./StaffSettingsPanel";
import InvitePeoplePanel from "./InvitePeoplePanel";

const tabs = [
	{
		id: "general",
		label: "General",
		icon: Settings,
		description: "Business profile and workspace basics",
	},
	{
		id: "dashboard",
		label: "Dashboard",
		icon: LayoutDashboard,
		description: "Dashboard appearance and default views",
	},
	{
		id: "staff",
		label: "Staff",
		icon: Users,
		description: "View team members and manage roles",
	},
	{
		id: "invite",
		label: "Invite People",
		icon: UserPlus,
		description: "Create and manage workspace invite links",
	},
];

export default function SettingsPageClient({ initialData }) {
	const [activeTab, setActiveTab] = useState("general");

	const activeTabMeta = useMemo(
		() => tabs.find((tab) => tab.id === activeTab),
		[activeTab],
	);

	if (!initialData) {
		return (
			<section className="settings-page">
				<div className="card">
					<p className="text-muted">No workspace settings found.</p>
				</div>
			</section>
		);
	}

	return (
		<section className="settings-page">
			<div className="settings-page__header">
				<div className="settings-page__header-text">
					<p className="settings-page__eyebrow">Workspace settings</p>
					<h2 className="settings-page__title">Settings</h2>
					<p className="settings-page__subtitle">
						Manage your business profile, team access, dashboard preferences,
						and workspace invite links.
					</p>
				</div>
			</div>

			<div className="settings-layout">
				<aside className="settings-sidebar">
					<div className="settings-sidebar__card">
						<div className="settings-sidebar__top">
							<h3 className="settings-sidebar__title">Configuration</h3>
							<p className="settings-sidebar__subtitle">
								Switch between settings areas.
							</p>
						</div>

						<div
							className="settings-tabs"
							role="tablist"
							aria-label="Settings tabs"
						>
							{tabs.map((tab) => {
								const Icon = tab.icon;
								const isActive = activeTab === tab.id;

								return (
									<button
										key={tab.id}
										type="button"
										role="tab"
										aria-selected={isActive}
										aria-controls={`settings-panel-${tab.id}`}
										id={`settings-tab-${tab.id}`}
										className={`settings-tab ${isActive ? "settings-tab--active" : ""}`}
										onClick={() => setActiveTab(tab.id)}
									>
										<span className="settings-tab__icon">
											<Icon size={18} />
										</span>

										<span className="settings-tab__content">
											<span className="settings-tab__label">{tab.label}</span>
											<span className="settings-tab__desc">
												{tab.description}
											</span>
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</aside>

				<div className="settings-content">
					<div className="settings-content__intro card">
						<div className="settings-content__intro-top">
							<div>
								<p className="settings-content__eyebrow">
									{activeTabMeta?.label || "Settings"}
								</p>
								<h3 className="settings-content__title">
									{activeTabMeta?.label || "Settings"}
								</h3>
							</div>
						</div>

						<p className="settings-content__description">
							{activeTabMeta?.description ||
								"Adjust your workspace settings and preferences."}
						</p>
					</div>

					<div className="settings-content__panel-wrap">
						{activeTab === "general" && (
							<div
								id="settings-panel-general"
								role="tabpanel"
								aria-labelledby="settings-tab-general"
							>
								<GeneralSettingsPanel
									workspace={initialData.workspace}
									currentRole={initialData.currentMembership.role}
								/>
							</div>
						)}

						{activeTab === "dashboard" && (
							<div
								id="settings-panel-dashboard"
								role="tabpanel"
								aria-labelledby="settings-tab-dashboard"
							>
								<DashboardSettingsPanel
									settings={initialData.settings}
									currentRole={initialData.currentMembership.role}
								/>
							</div>
						)}

						{activeTab === "staff" && (
							<div
								id="settings-panel-staff"
								role="tabpanel"
								aria-labelledby="settings-tab-staff"
							>
								<StaffSettingsPanel
									members={initialData.members}
									currentRole={initialData.currentMembership.role}
									currentUserId={initialData.currentUser.id}
								/>
							</div>
						)}

						{activeTab === "invite" && (
							<div
								id="settings-panel-invite"
								role="tabpanel"
								aria-labelledby="settings-tab-invite"
							>
								<InvitePeoplePanel
									invites={initialData.invites}
									currentRole={initialData.currentMembership.role}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
