"use client";

import { useState, useTransition } from "react";
import "./GeneralSettingsPanel.css";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { updateGeneralSettings } from "@/actions/settings";

export default function GeneralSettingsPanel({ workspace, currentRole }) {
	const [isPending, startTransition] = useTransition();
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const [form, setForm] = useState({
		name: workspace.name || "",
		businessEmail: workspace.businessEmail || "",
		businessPhone: workspace.businessPhone || "",
		website: workspace.website || "",
		addressLine1: workspace.addressLine1 || "",
		addressLine2: workspace.addressLine2 || "",
		city: workspace.city || "",
		county: workspace.county || "",
		country: workspace.country || "Ireland",
	});

	const canEdit = ["OWNER", "ADMIN"].includes(currentRole);

	function handleChange(e) {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
		setMessage("");
		setError("");
	}

	function handleSubmit(e) {
		e.preventDefault();

		startTransition(async () => {
			try {
				await updateGeneralSettings(form);
				setMessage("General settings saved.");
			} catch (err) {
				setError(err?.message || "Failed to save general settings.");
			}
		});
	}

	return (
		<div className="general-settings stack-lg">
			<div className="card stack-md">
				<div className="settings-section-header">
					<div>
						<h3 className="settings-section-title">Business information</h3>
						<p className="settings-section-text">
							Update your workspace name, contact details, and company profile.
						</p>
					</div>
				</div>

				<form className="stack-md" onSubmit={handleSubmit}>
					<div className="settings-form-grid">
						<Input
							label="Business name"
							name="name"
							value={form.name}
							onChange={handleChange}
							disabled={!canEdit}
						/>

						<Input
							label="Business email"
							name="businessEmail"
							type="email"
							value={form.businessEmail}
							onChange={handleChange}
							disabled={!canEdit}
						/>

						<Input
							label="Phone number"
							name="businessPhone"
							value={form.businessPhone}
							onChange={handleChange}
							disabled={!canEdit}
						/>

						<Input
							label="Website"
							name="website"
							value={form.website}
							onChange={handleChange}
							disabled={!canEdit}
						/>
					</div>

					<div className="settings-form-grid">
						<Input
							label="Address line 1"
							name="addressLine1"
							value={form.addressLine1}
							onChange={handleChange}
							disabled={!canEdit}
						/>

						<Input
							label="Address line 2"
							name="addressLine2"
							value={form.addressLine2}
							onChange={handleChange}
							disabled={!canEdit}
						/>

						<Input
							label="Town / City"
							name="city"
							value={form.city}
							onChange={handleChange}
							disabled={!canEdit}
						/>

						<Input
							label="County"
							name="county"
							value={form.county}
							onChange={handleChange}
							disabled={!canEdit}
						/>
					</div>

					<div className="settings-form-grid">
						<Input
							label="Country"
							name="country"
							value={form.country}
							onChange={handleChange}
							disabled={!canEdit}
						/>
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
							Save changes
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
