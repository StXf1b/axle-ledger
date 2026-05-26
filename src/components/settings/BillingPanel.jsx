"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	BadgeCheck,
	Bell,
	CalendarClock,
	CreditCard,
	ExternalLink,
	FileText,
	FolderUp,
	ShieldCheck,
	Users,
	CarFront,
	UserRound,
	Wrench,
} from "lucide-react";
import {
	createStripeCheckoutSession,
	createStripePortalSession,
} from "@/actions/billing";
import "./BillingPanel.css";

function formatMoney(cents) {
	if (cents == null) return "Custom";

	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
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

				<span
					className={`billing-usage-card__percent billing-usage-card__percent--${tone}`}
				>
					{percent == null ? "Unlimited" : `${percent}%`}
				</span>
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
	const searchParams = useSearchParams();
	const [billingCycle, setBillingCycle] = useState("monthly");
	const [error, setError] = useState("");
	const [busyKey, setBusyKey] = useState("");
	const [isPending, startTransition] = useTransition();

	const isOwner = currentRole === "OWNER";
	const currentPlan = billingInfo?.currentPlan;
	const usageSummary = billingInfo?.usageSummary || {};
	const paidPlans =
		billingInfo?.plans?.filter(
			(plan) => !["TRIAL", "CUSTOM"].includes(plan.tier),
		) || [];

	const portalAvailable = !!currentPlan?.stripeCustomerId;
	const isStripeManaged =
		currentPlan?.billingProvider === "STRIPE" &&
		!!currentPlan?.stripeSubscriptionId;

	const bannerState = searchParams.get("billing");

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
				icon: FolderUp,
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
		],
		[usageSummary],
	);

	function getBannerMessage() {
		if (bannerState === "success") {
			return {
				type: "success",
				text: "Stripe checkout completed. Billing details will refresh as soon as Stripe sends the subscription webhook.",
			};
		}

		if (bannerState === "cancelled") {
			return {
				type: "warning",
				text: "Checkout was cancelled. No billing changes were made.",
			};
		}

		if (currentPlan?.cancelAtPeriodEnd) {
			return {
				type: "warning",
				text: `Your current paid subscription is set to cancel at period end on ${formatDate(currentPlan.currentPeriodEnd)}. After that, the workspace falls back to the free Trial limits.`,
			};
		}

		return null;
	}

	const banner = getBannerMessage();

	function getPlanPrice(plan) {
		return billingCycle === "monthly"
			? plan.billing.monthlyPriceCents
			: plan.billing.yearlyPriceCents;
	}

	function getActionLabel(plan) {
		if (!isOwner) return "Owner only";
		if (plan.tier === currentPlan?.tier) return "Current plan";
		if (isStripeManaged) return "Change in portal";
		return billingCycle === "monthly" ? "Start monthly" : "Start yearly";
	}

	async function handleCheckout(planTier) {
		startTransition(async () => {
			try {
				setError("");
				setBusyKey(`${planTier}-${billingCycle}`);

				const result = await createStripeCheckoutSession({
					tier: planTier,
					interval: billingCycle,
				});

				if (!result?.url) {
					throw new Error("Could not create Stripe checkout session.");
				}

				window.location.href = result.url;
			} catch (err) {
				setError(err?.message || "Could not start Stripe checkout.");
			} finally {
				setBusyKey("");
			}
		});
	}

	async function handlePortal() {
		startTransition(async () => {
			try {
				setError("");
				setBusyKey("portal");

				const result = await createStripePortalSession();

				if (!result?.url) {
					throw new Error("Could not open Stripe billing portal.");
				}

				window.location.href = result.url;
			} catch (err) {
				setError(err?.message || "Could not open Stripe billing portal.");
			} finally {
				setBusyKey("");
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
			<div className="billing-hero">
				<div className="billing-hero__glow billing-hero__glow--one" />
				<div className="billing-hero__glow billing-hero__glow--two" />

				<div className="billing-hero__left">
					<div className="billing-hero__badge-wrap">
						<span className="billing-hero__icon">
							<BadgeCheck size={18} />
						</span>
						<p className="billing-hero__eyebrow">Workspace billing</p>
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
						Your workspace plan controls staff seats, customers, vehicles,
						documents, reminders, uploads, and work logs. Trial stays free
						forever, but paid plans are managed by Stripe.
					</p>

					<div className="billing-hero__actions">
						{portalAvailable ? (
							<button
								type="button"
								className="billing-btn billing-btn--secondary"
								onClick={handlePortal}
								disabled={!isOwner || isPending}
							>
								<ExternalLink size={16} />
								Manage billing
							</button>
						) : null}

						{currentPlan.tier === "TRIAL" ? (
							<span className="billing-hero__hint">
								Pick a paid plan below to start Checkout.
							</span>
						) : (
							<span className="billing-hero__hint">
								Plan changes, payment methods, and cancellations are handled in
								Stripe Portal.
							</span>
						)}
					</div>
				</div>

				<div className="billing-hero__meta">
					<div className="billing-meta-card">
						<p>Billing source</p>
						<h4>{currentPlan.billingProvider}</h4>
					</div>

					<div className="billing-meta-card">
						<p>Current period end</p>
						<h4>{formatDate(currentPlan.currentPeriodEnd)}</h4>
					</div>

					<div className="billing-meta-card">
						<p>Cancellation</p>
						<h4>
							{currentPlan.cancelAtPeriodEnd ? "At period end" : "Active"}
						</h4>
					</div>
				</div>
			</div>

			{banner ? (
				<div className={`billing-banner billing-banner--${banner.type}`}>
					<CalendarClock size={16} />
					<p>{banner.text}</p>
				</div>
			) : null}

			{error ? (
				<div className="billing-banner billing-banner--danger">
					<ShieldCheck size={16} />
					<p>{error}</p>
				</div>
			) : null}

			<div className="billing-section card stack-md">
				<div className="billing-section__header">
					<div>
						<h3 className="billing-section__title">Usage and limits</h3>
						<p className="billing-section__subtitle">
							Live workspace usage compared against the current plan quota.
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

						const helper =
							item.data.max == null
								? "Unlimited on this plan"
								: item.data.remaining === 0
									? "Limit reached"
									: `${item.isBytes ? formatBytes(item.data.remaining) : item.data.remaining} remaining`;

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
						{formatBytes(currentPlan.limits.maxUploadBytes)} per file
					</p>
				</div>
			</div>

			<div className="billing-section card stack-md">
				<div className="billing-section__header billing-section__header--split">
					<div>
						<h3 className="billing-section__title">Plans</h3>
						<p className="billing-section__subtitle">
							Prices shown ex VAT. New purchases go through Stripe Checkout.
							Existing paid subscriptions are changed from Stripe Portal.
						</p>
					</div>

					<div className="billing-cycle-toggle">
						<button
							type="button"
							className={`billing-cycle-toggle__btn ${
								billingCycle === "monthly"
									? "billing-cycle-toggle__btn--active"
									: ""
							}`}
							onClick={() => setBillingCycle("monthly")}
						>
							Monthly
						</button>

						<button
							type="button"
							className={`billing-cycle-toggle__btn ${
								billingCycle === "yearly"
									? "billing-cycle-toggle__btn--active"
									: ""
							}`}
							onClick={() => setBillingCycle("yearly")}
						>
							Yearly
						</button>
					</div>
				</div>

				<div className="billing-plans-grid">
					{paidPlans.map((plan) => {
						const priceCents = getPlanPrice(plan);
						const isCurrent = plan.tier === currentPlan.tier;
						const cardBusy = busyKey === `${plan.tier}-${billingCycle}`;

						return (
							<div
								key={plan.tier}
								className={`billing-plan-card ${
									isCurrent ? "billing-plan-card--current" : ""
								}`}
							>
								<div className="billing-plan-card__top">
									<div>
										<p className="billing-plan-card__eyebrow">{plan.label}</p>
										<h4 className="billing-plan-card__price">
											{priceCents == null
												? "Contact us"
												: `${formatMoney(priceCents)}/${billingCycle === "monthly" ? "mo" : "yr"}`}
										</h4>
										<p className="billing-plan-card__vat">ex VAT</p>
									</div>

									{isCurrent ? (
										<span className="badge badge-info">Current</span>
									) : null}
								</div>

								<div className="billing-plan-card__limits">
									<p>Staff: {plan.limits.members ?? "Unlimited"}</p>
									<p>Customers: {plan.limits.customers ?? "Unlimited"}</p>
									<p>Vehicles: {plan.limits.vehicles ?? "Unlimited"}</p>
									<p>Documents: {plan.limits.documents ?? "Unlimited"}</p>
									<p>
										Storage: {formatBytes(plan.limits.documentStorageBytes)}
									</p>
									<p>Reminders: {plan.limits.reminders ?? "Unlimited"}</p>
									<p>Work logs: {plan.limits.workLogs ?? "Unlimited"}</p>
									<p>Upload limit: {formatBytes(plan.limits.maxUploadBytes)}</p>
								</div>

								<div className="billing-plan-card__actions">
									<button
										type="button"
										className={`billing-btn ${
											isCurrent
												? "billing-btn--secondary"
												: "billing-btn--primary"
										}`}
										disabled={
											!isOwner ||
											isPending ||
											cardBusy ||
											busyKey === "portal" ||
											isCurrent
										}
										onClick={() =>
											isStripeManaged
												? handlePortal()
												: handleCheckout(plan.tier)
										}
									>
										{cardBusy ? "Redirecting..." : getActionLabel(plan)}
									</button>
								</div>
							</div>
						);
					})}
				</div>

				{!isOwner ? (
					<p className="text-muted">
						Only the workspace owner can manage billing.
					</p>
				) : null}
			</div>
		</div>
	);
}
