"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	BadgeCheck,
	Bell,
	CalendarClock,
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
	if (!value) return "-";

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

function getPlanStatusTone(currentPlan) {
	if (currentPlan?.cancelAtPeriodEnd) return "warning";
	if (currentPlan?.status === "ACTIVE") return "success";
	if (currentPlan?.status === "TRIALING") return "info";
	if (currentPlan?.status === "PAST_DUE") return "warning";
	if (["CANCELED", "EXPIRED"].includes(currentPlan?.status)) return "danger";
	return "neutral";
}

function getCancellationState(currentPlan) {
	if (currentPlan?.cancelAtPeriodEnd) {
		return {
			tone: "warning",
			label: "Canceling at period end",
			detail: `Access remains active until ${formatDate(currentPlan.currentPeriodEnd)}.`,
		};
	}

	if (currentPlan?.tier === "TRIAL") {
		return {
			tone: "info",
			label: "Not canceling",
			detail: currentPlan.trialEndsAt
				? `Trial access runs until ${formatDate(currentPlan.trialEndsAt)}.`
				: "This workspace is on the free trial plan.",
		};
	}

	if (currentPlan?.status === "PAST_DUE") {
		return {
			tone: "warning",
			label: "Not canceling",
			detail: "Payment needs attention, but the plan is not set to cancel.",
		};
	}

	return {
		tone: "success",
		label: "Not canceling",
		detail: currentPlan?.currentPeriodEnd
			? `The plan continues through ${formatDate(currentPlan.currentPeriodEnd)}.`
			: "This plan is active and not set to cancel.",
	};
}

function getPeriodMeta(currentPlan) {
	if (currentPlan?.cancelAtPeriodEnd) {
		return {
			label: "Access until",
			value: formatDate(currentPlan.currentPeriodEnd),
		};
	}

	if (currentPlan?.tier === "TRIAL") {
		return {
			label: "Trial ends",
			value: formatDate(currentPlan.trialEndsAt),
		};
	}

	return {
		label: "Renews on",
		value: formatDate(currentPlan?.currentPeriodEnd),
	};
}

function UsageLimitRow({ label, current, max, percent, helper, icon: Icon }) {
	const tone = getUsageTone(percent);
	const usageValue = max == null ? current : `${current} / ${max}`;
	const meterWidth = percent == null ? 100 : Math.min(percent, 100);

	return (
		<div className={`billing-usage-row billing-usage-row--${tone}`}>
			<div className="billing-usage-row__identity">
				<span className="billing-usage-row__icon">
					<Icon size={16} />
				</span>
				<div>
					<p className="billing-usage-row__label">{label}</p>
					<p className="billing-usage-row__helper">{helper}</p>
				</div>
			</div>

			<div className="billing-usage-row__meter-wrap">
				<div className="billing-usage-row__meta">
					<strong>{usageValue}</strong>
					<span
						className={`billing-usage-row__percent billing-usage-row__percent--${tone}`}
					>
						{percent == null ? "Unlimited" : `${percent}% used`}
					</span>
				</div>

				<div className="billing-usage-row__bar">
					<div
						className={`billing-usage-row__bar-fill billing-usage-row__bar-fill--${tone}`}
						style={{ width: `${meterWidth}%` }}
					/>
				</div>
			</div>
		</div>
	);
}

export default function BillingPanel({ billingInfo, currentRole }) {
	const searchParams = useSearchParams();
	const [billingCycle, setBillingCycle] = useState("monthly");
	const [error, setError] = useState("");
	const [busyKey, setBusyKey] = useState("");
	const [isPending, startTransition] = useTransition();

	const isOwner = currentRole === "OWNER";
	const currentPlan = billingInfo?.currentPlan;
	const usageSummary = useMemo(
		() => billingInfo?.usageSummary || {},
		[billingInfo?.usageSummary],
	);
	const paidPlans =
		billingInfo?.plans?.filter(
			(plan) => !["TRIAL", "CUSTOM"].includes(plan.tier),
		) || [];

	const portalAvailable = !!currentPlan?.stripeCustomerId;
	const isStripeManaged =
		currentPlan?.billingProvider === "STRIPE" &&
		!!currentPlan?.stripeSubscriptionId;

	const bannerState = searchParams.get("billing");
	const statusTone = getPlanStatusTone(currentPlan);
	const cancellationState = getCancellationState(currentPlan);
	const periodMeta = getPeriodMeta(currentPlan);

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
				<div className="billing-hero__left">
					<div className="billing-hero__badge-wrap">
						<span className="billing-hero__icon">
							<BadgeCheck size={18} />
						</span>
						<p className="billing-hero__eyebrow">Workspace billing</p>
					</div>

					<div className="billing-hero__heading">
						<h3>{currentPlan.label}</h3>
						<span className={`badge badge-${statusTone}`}>
							{currentPlan.cancelAtPeriodEnd
								? "Canceling"
								: formatStatus(currentPlan.status)}
						</span>
					</div>

					<p className="billing-hero__description">
						Your workspace plan controls staff seats, customers, vehicles,
						documents, reminders, uploads, and work logs. Trial stays free
						forever, but paid plans are managed by Stripe.
					</p>

					<div className="billing-hero__actions">
						<Link
							href="https://axleledger.ie/plans"
							className="billing-btn billing-btn--primary billing-btn--auto"
						>
							See all plans
							<ExternalLink size={16} />
						</Link>

						{portalAvailable ? (
							<button
								type="button"
								className="billing-btn billing-btn--secondary billing-btn--auto"
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

				<div
					className={`billing-status-card billing-status-card--${cancellationState.tone}`}
				>
					<div className="billing-status-card__top">
						<div>
							<p className="billing-status-card__eyebrow">Plan status</p>
							<h4>{cancellationState.label}</h4>
						</div>
						<span
							className={`billing-status-dot billing-status-dot--${cancellationState.tone}`}
						/>
					</div>

					<p className="billing-status-card__detail">
						{cancellationState.detail}
					</p>

					<div className="billing-hero__meta">
						<div className="billing-meta-card">
							<p>Billing source</p>
							<h4>{currentPlan.billingProvider}</h4>
						</div>

						<div className="billing-meta-card">
							<p>{periodMeta.label}</p>
							<h4>{periodMeta.value}</h4>
						</div>

						<div className="billing-meta-card">
							<p>Cancellation</p>
							<h4>
								{currentPlan.cancelAtPeriodEnd ? "Scheduled" : "Not scheduled"}
							</h4>
						</div>
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

				<div className="billing-usage-board">
					<div className="billing-usage-board__summary">
						<div>
							<p className="billing-usage-board__eyebrow">Current allowance</p>
							<h4>{currentPlan.label} plan limits</h4>
							<p>
								Track the resources that can block new records before they
								interrupt the workshop.
							</p>
						</div>

						<div className="billing-upload-pill">
							<span className="billing-upload-pill__icon">
								<FolderUp size={20} />
							</span>
							<div>
								<span>Max file upload</span>
								<strong>
									{formatBytes(currentPlan.limits.maxUploadBytes)} per file
								</strong>
							</div>
						</div>
					</div>

					<div className="billing-usage-list">
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
								<UsageLimitRow
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
