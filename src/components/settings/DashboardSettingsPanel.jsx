"use client";

import { useState, useTransition } from "react";
import "./DashboardSettingsPanel.css";
import Button from "@/components/ui/Button";
import { updateDashboardSettings } from "@/actions/settings";

export default function DashboardSettingsPanel({ settings, currentRole }) {
	const [isPending, startTransition] = useTransition();
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const [form, setForm] = useState({
		compactLayout: settings.compactLayout,
		showWelcomeTips: settings.showWelcomeTips,
		showQuickAddVehicle: settings.showQuickAddVehicle,
		showQuickAddCustomer: settings.showQuickAddCustomer,
		showQuickAddReminder: settings.showQuickAddReminder,
		showQuickUploadDoc: settings.showQuickUploadDoc,
		showWidgetOverdue: settings.showWidgetOverdue,
		showWidgetDueSoon: settings.showWidgetDueSoon,
		showWidgetRecent: settings.showWidgetRecent,
		showWidgetStatus: settings.showWidgetStatus,
	});

	const canEdit = ["OWNER", "ADMIN"].includes(currentRole);

	function toggleField(name) {
		if (!canEdit) return;

		setForm((prev) => ({
			...prev,
			[name]: !prev[name],
		}));

		setMessage("");
		setError("");
	}

	function handleSubmit(e) {
		e.preventDefault();

		startTransition(async () => {
			try {
				await updateDashboardSettings(form);
				setMessage("Dashboard settings saved.");
			} catch (err) {
				setError(err?.message || "Failed to save dashboard settings.");
			}
		});
	}

	return (
		<div className="dashboard-settings stack-lg">
			<form className="stack-lg" onSubmit={handleSubmit}>
				<div className="card stack-md">
					<div className="settings-section-header">
						<div>
							<h3 className="settings-section-title">Default dashboard view</h3>
							<p className="settings-section-text">
								Choose the layout and content your team sees first.
							</p>
						</div>
					</div>

					<div className="dashboard-settings__grid">
						<div className="dashboard-option-card">
							<div>
								<h4 className="dashboard-option-card__title">Compact layout</h4>
								<p className="dashboard-option-card__text">
									Denser cards and tighter spacing for power users.
								</p>
							</div>
							<label className="ax-switch">
								<input
									type="checkbox"
									checked={form.compactLayout}
									onChange={() => toggleField("compactLayout")}
									disabled={!canEdit}
								/>
								<span className="ax-switch__slider" />
							</label>
						</div>

						<div className="dashboard-option-card">
							<div>
								<h4 className="dashboard-option-card__title">
									Show welcome tips
								</h4>
								<p className="dashboard-option-card__text">
									Display setup and helper tips on the dashboard.
								</p>
							</div>
							<label className="ax-switch">
								<input
									type="checkbox"
									checked={form.showWelcomeTips}
									onChange={() => toggleField("showWelcomeTips")}
									disabled={!canEdit}
								/>
								<span className="ax-switch__slider" />
							</label>
						</div>
					</div>
				</div>

				<div className="card stack-md">
					<div className="settings-section-header">
						<div>
							<h3 className="settings-section-title">Quick actions</h3>
							<p className="settings-section-text">
								Choose which quick actions appear on the dashboard.
							</p>
						</div>
					</div>

					<div className="dashboard-settings__list">
						{[
							["showQuickAddVehicle", "Add Vehicle"],
							["showQuickAddCustomer", "Add Customer"],
							["showQuickAddReminder", "Add Reminder"],
							["showQuickUploadDoc", "Upload Document"],
						].map(([key, label]) => (
							<div className="dashboard-row" key={key}>
								<div>
									<p className="dashboard-row__title">{label}</p>
									<p className="dashboard-row__text">
										Show this action in the dashboard shortcut area.
									</p>
								</div>

								<label className="ax-switch">
									<input
										type="checkbox"
										checked={form[key]}
										onChange={() => toggleField(key)}
										disabled={!canEdit}
									/>
									<span className="ax-switch__slider" />
								</label>
							</div>
						))}
					</div>
				</div>

				<div className="card stack-md">
					<div className="settings-section-header">
						<div>
							<h3 className="settings-section-title">Dashboard widgets</h3>
							<p className="settings-section-text">
								Control which summary widgets are visible.
							</p>
						</div>
					</div>

					<div className="dashboard-settings__list">
						{[
							["showWidgetOverdue", "Overdue reminders"],
							["showWidgetDueSoon", "Due soon"],
							["showWidgetRecent", "Recent activity"],
							["showWidgetStatus", "Vehicle status summary"],
						].map(([key, label]) => (
							<div className="dashboard-row" key={key}>
								<div>
									<p className="dashboard-row__title">{label}</p>
									<p className="dashboard-row__text">
										Include this section in the main overview.
									</p>
								</div>

								<label className="ax-switch">
									<input
										type="checkbox"
										checked={form[key]}
										onChange={() => toggleField(key)}
										disabled={!canEdit}
									/>
									<span className="ax-switch__slider" />
								</label>
							</div>
						))}
					</div>

					{message ? <p className="text-success">{message}</p> : null}
					{error ? <p className="text-danger">{error}</p> : null}

					<div className="settings-form-actions">
						<Button
							type="submit"
							variant="primary"
							loading={isPending}
							disabled={!canEdit}
						>
							Save dashboard settings
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
