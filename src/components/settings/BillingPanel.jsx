"use client";

import { useMemo, useState, useTransition } from "react";
import {
	CreditCard,
	BadgeCheck,
	Users,
	CarFront,
	UserRound,
	FileText,
	Bell,
	Wrench,
	Upload,
	ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { updateWorkspacePlan } from "@/actions/billing";
import "./BillingPanel.css";

function formatMoney(cents) {
	if (cents == null) return "Custom";
	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0,
	}).format(cents / 100);
}

function formatBytes(bytes) {
	if (bytes == null) return "Unlimited";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value) {
	if (!value) return "—";
	return new Date(value).toLocaleDateString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatStatus(status) {
	if (!status) return "Unknown";

	return status
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function getUsageTone(percent) {
	if (percent == null) return "neutral";
	if (percent >= 90) return "danger";
	if (percent >= 75) return "warning";
	return "safe";
}

function UsageCard({ label, current, max, percent, helper, icon: Icon }) {
	const tone = getUsageTone(percent);

	return (
		<div className="billing-usage-card">
			<div className="billing-usage-card__top">
				<span className="billing-usage-card__icon">
					<Icon size={16} />
				</span>
				<p className="billing-usage-card__label">{label}</p>
			</div>

			<div className="billing-usage-card__value-row">
				<h4 className="billing-usage-card__value">
					{current}
					{max == null ? "" : ` / ${max}`}
				</h4>
				{percent != null ? (
					<span
						className={`billing-usage-card__percent billing-usage-card__percent--${tone}`}
					>
						{percent}%
					</span>
				) : (
					<span className="billing-usage-card__percent billing-usage-card__percent--neutral">
						Unlimited
					</span>
				)}
			</div>

			<div className="billing-usage-card__bar">
				<div
					className={`billing-usage-card__bar-fill billing-usage-card__bar-fill--${tone}`}
					style={{ width: `${percent == null ? 0 : Math.min(percent, 100)}%` }}
				/>
			</div>

			<p className="billing-usage-card__helper">{helper}</p>
		</div>
	);
}

export default function BillingPanel({ billingInfo, currentRole }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const isOwner = currentRole === "OWNER";
	const currentPlan = billingInfo?.currentPlan;
	const usageSummary = billingInfo?.usageSummary || {};
	const plans = billingInfo?.plans || [];

	const usageCards = useMemo(
		() => [
			{
				key: "members",
				label: "Staff seats",
				icon: Users,
				data: usageSummary.members,
			},
			{
				key: "customers",
				label: "Customers",
				icon: UserRound,
				data: usageSummary.customers,
			},
			{
				key: "vehicles",
				label: "Vehicles",
				icon: CarFront,
				data: usageSummary.vehicles,
			},
			{
				key: "documents",
				label: "Documents",
				icon: FileText,
				data: usageSummary.documents,
			},
			{
				key: "documentStorageBytes",
				label: "Storage",
				icon: Upload,
				data: usageSummary.documentStorageBytes,
				isBytes: true,
			},
			{
				key: "reminders",
				label: "Reminders",
				icon: Bell,
				data: usageSummary.reminders,
			},
			{
				key: "workLogs",
				label: "Work logs",
				icon: Wrench,
				data: usageSummary.workLogs,
			},
			{
				key: "pendingInvites",
				label: "Pending invites",
				icon: CreditCard,
				data: usageSummary.pendingInvites,
			},
		],
		[usageSummary],
	);

	function handlePlanChange(nextTier) {
		if (!isOwner) return;

		startTransition(async () => {
			try {
				setError("");
				setSuccess("");

				const result = await updateWorkspacePlan(nextTier);

				if (!result?.ok) {
					setError("Failed to update plan.");
					return;
				}

				setSuccess("Workspace plan updated successfully.");
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to update plan.");
			}
		});
	}

	if (!billingInfo || !currentPlan) {
		return (
			<div className="card">
				<p className="text-muted">Billing information is not available.</p>
			</div>
		);
	}

	return (
		<div className="billing-panel stack-lg">
			<div className="billing-hero card">
				<div className="billing-hero__left">
					<div className="billing-hero__badge-wrap">
						<span className="billing-hero__icon">
							<BadgeCheck size={18} />
						</span>
						<p className="billing-hero__eyebrow">Current workspace plan</p>
					</div>

					<div className="billing-hero__heading">
						<h3>{currentPlan.label}</h3>
						<span
							className={`badge ${
								currentPlan.status === "ACTIVE"
									? "badge-success"
									: currentPlan.status === "TRIALING"
										? "badge-info"
										: currentPlan.status === "PAST_DUE"
											? "badge-warning"
											: "badge-neutral"
							}`}
						>
							{formatStatus(currentPlan.status)}
						</span>
					</div>

					<p className="billing-hero__description">
						Your workspace plan controls usage limits for staff, customers,
						vehicles, reminders, documents, uploads, and work logs.
					</p>
				</div>

				<div className="billing-hero__meta">
					<div className="billing-meta-card">
						<p>Billing source</p>
						<h4>{currentPlan.billingProvider}</h4>
					</div>

					<div className="billing-meta-card">
						<p>Trial ends</p>
						<h4>{formatDate(currentPlan.trialEndsAt)}</h4>
					</div>

					<div className="billing-meta-card">
						<p>Current period</p>
						<h4>{formatDate(currentPlan.currentPeriodEnd)}</h4>
					</div>
				</div>
			</div>

			<div className="billing-section card stack-md">
				<div className="billing-section__header">
					<div>
						<h3 className="billing-section__title">Usage and limits</h3>
						<p className="billing-section__subtitle">
							Live workspace usage compared to the current plan allowances.
						</p>
					</div>
				</div>

				<div className="billing-usage-grid">
					{usageCards.map((item) => {
						if (!item.data) return null;

						const current = item.isBytes
							? formatBytes(item.data.current)
							: item.data.current;
						const max =
							item.data.max == null
								? null
								: item.isBytes
									? formatBytes(item.data.max)
									: item.data.max;

						let helper = "Within plan limit";
						if (item.data.max != null) {
							helper =
								item.data.remaining === 0
									? "Limit reached"
									: `${item.isBytes ? formatBytes(item.data.remaining) : item.data.remaining} remaining`;
						}

						return (
							<UsageCard
								key={item.key}
								label={item.label}
								current={current}
								max={max}
								percent={item.data.percent}
								helper={helper}
								icon={item.icon}
							/>
						);
					})}
				</div>

				<div className="billing-upload-note">
					<p>
						<strong>Max file upload:</strong>{" "}
						{formatBytes(currentPlan.limits.maxUploadBytes)}
					</p>
				</div>
			</div>

			<div className="billing-section card stack-md">
				<div className="billing-section__header">
					<div>
						<h3 className="billing-section__title">Plans</h3>
						<p className="billing-section__subtitle">
							For now, these buttons switch plans manually. Later, these actions
							can be replaced with Stripe checkout and billing portal flows.
						</p>
					</div>
				</div>

				{error ? <p className="text-danger">{error}</p> : null}
				{success ? <p className="text-success">{success}</p> : null}

				<div className="billing-plans-grid">
					{plans.map((plan) => (
						<div
							key={plan.tier}
							className={`billing-plan-card ${
								plan.isCurrent ? "billing-plan-card--current" : ""
							}`}
						>
							<div className="billing-plan-card__top">
								<div>
									<p className="billing-plan-card__eyebrow">{plan.label}</p>
									<h4 className="billing-plan-card__price">
										{plan.billing.monthlyPriceCents == null
											? "Contact us"
											: `${formatMoney(plan.billing.monthlyPriceCents)}/mo`}
									</h4>
								</div>

								{plan.isCurrent ? (
									<span className="badge badge-info">Current</span>
								) : null}
							</div>

							<div className="billing-plan-card__limits">
								<p>
									Staff:{" "}
									{plan.limits.members == null
										? "Unlimited"
										: plan.limits.members}
								</p>
								<p>
									Customers:{" "}
									{plan.limits.customers == null
										? "Unlimited"
										: plan.limits.customers}
								</p>
								<p>
									Vehicles:{" "}
									{plan.limits.vehicles == null
										? "Unlimited"
										: plan.limits.vehicles}
								</p>
								<p>
									Documents:{" "}
									{plan.limits.documents == null
										? "Unlimited"
										: plan.limits.documents}
								</p>
								<p>Storage: {formatBytes(plan.limits.documentStorageBytes)}</p>
								<p>
									Reminders:{" "}
									{plan.limits.reminders == null
										? "Unlimited"
										: plan.limits.reminders}
								</p>
								<p>
									Work logs:{" "}
									{plan.limits.workLogs == null
										? "Unlimited"
										: plan.limits.workLogs}
								</p>
								<p>Max upload: {formatBytes(plan.limits.maxUploadBytes)}</p>
							</div>

							<div className="billing-plan-card__actions">
								<button
									type="button"
									className={`btn ${plan.isCurrent ? "btn-secondary" : "btn-primary"}`}
									disabled={
										!isOwner || isPending || plan.isCurrent || plan.isCustom
									}
									onClick={() => handlePlanChange(plan.tier)}
								>
									<ArrowUpRight size={16} />
									{plan.isCurrent
										? "Current plan"
										: plan.isCustom
											? "Contact sales"
											: "Switch plan"}
								</button>
							</div>
						</div>
					))}
				</div>

				{!isOwner ? (
					<p className="text-muted">
						Only the workspace owner can manage billing and change the plan.
					</p>
				) : null}
			</div>
		</div>
	);
}
