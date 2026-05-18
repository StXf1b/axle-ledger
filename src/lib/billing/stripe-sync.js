import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { WORKSPACE_PLAN_DEFINITIONS } from "./workspace-plans";
import { ensureWorkspaceSubscription } from "./workspace-subscription";

const PAID_TIERS = ["STARTER", "PRO", "BUSINESS"];
const BILLING_INTERVALS = ["monthly", "yearly"];

export function isPaidTier(tier) {
	return PAID_TIERS.includes(tier);
}

export function isBillingInterval(interval) {
	return BILLING_INTERVALS.includes(interval);
}

export function getLookupKeyForTierInterval(tier, interval) {
	if (!isPaidTier(tier)) {
		throw new Error("Only paid tiers can be mapped to Stripe prices.");
	}

	if (!isBillingInterval(interval)) {
		throw new Error("Invalid billing interval.");
	}

	const plan = WORKSPACE_PLAN_DEFINITIONS[tier];

	if (!plan) {
		throw new Error("Unknown billing tier.");
	}

	return interval === "monthly"
		? plan.billing.stripeLookupKeyMonthly
		: plan.billing.stripeLookupKeyYearly;
}

export async function getStripePriceForTierInterval(tier, interval) {
	const stripe = getStripeClient();
	const lookupKey = getLookupKeyForTierInterval(tier, interval);

	const prices = await stripe.prices.list({
		lookup_keys: [lookupKey],
		active: true,
		limit: 1,
	});

	const price = prices.data[0];

	if (!price) {
		throw new Error(
			`No active Stripe price found for lookup key "${lookupKey}".`,
		);
	}

	return price;
}

function mapStripeStatusToWorkspaceStatus(status) {
	switch (status) {
		case "active":
			return "ACTIVE";
		case "trialing":
			return "TRIALING";
		case "past_due":
		case "unpaid":
		case "incomplete":
		case "paused":
			return "PAST_DUE";
		case "incomplete_expired":
			return "EXPIRED";
		case "canceled":
			return "CANCELED";
		default:
			return "PAST_DUE";
	}
}

function fromUnixTimestamp(value) {
	return value ? new Date(value * 1000) : null;
}

function resolveTierIntervalFromLookupKey(lookupKey) {
	for (const [tier, definition] of Object.entries(WORKSPACE_PLAN_DEFINITIONS)) {
		if (definition.billing.stripeLookupKeyMonthly === lookupKey) {
			return { tier, interval: "monthly" };
		}

		if (definition.billing.stripeLookupKeyYearly === lookupKey) {
			return { tier, interval: "yearly" };
		}
	}

	return null;
}

async function resolveLookupKeyFromPrice(price) {
	if (!price) {
		return {
			lookupKey: null,
			priceId: null,
			productId: null,
		};
	}

	if (price.lookup_key) {
		return {
			lookupKey: price.lookup_key,
			priceId: price.id || null,
			productId:
				typeof price.product === "string"
					? price.product
					: price.product?.id || null,
		};
	}

	if (!price.id) {
		return {
			lookupKey: null,
			priceId: null,
			productId: null,
		};
	}

	const stripe = getStripeClient();
	const fetchedPrice = await stripe.prices.retrieve(price.id);

	return {
		lookupKey: fetchedPrice.lookup_key || null,
		priceId: fetchedPrice.id || null,
		productId:
			typeof fetchedPrice.product === "string"
				? fetchedPrice.product
				: fetchedPrice.product?.id || null,
	};
}

function getSubscriptionItemForPeriods(subscription) {
	if (subscription?.items?.data?.length) {
		return subscription.items.data[0];
	}

	if (Array.isArray(subscription?.pending_update?.subscription_items)) {
		return subscription.pending_update.subscription_items[0] || null;
	}

	if (subscription?.pending_update?.subscription_items) {
		return subscription.pending_update.subscription_items;
	}

	return null;
}

function getSubscriptionPeriodDates(subscription) {
	const item = getSubscriptionItemForPeriods(subscription);

	return {
		currentPeriodStart: fromUnixTimestamp(item?.current_period_start || null),
		currentPeriodEnd: fromUnixTimestamp(item?.current_period_end || null),
	};
}

async function resolveWorkspaceIdFromStripeRefs({
	stripeCustomerId,
	stripeSubscriptionId,
	fallbackWorkspaceId,
}) {
	if (stripeSubscriptionId) {
		const bySubscription = await db.workspaceSubscription.findFirst({
			where: {
				stripeSubscriptionId,
			},
			select: {
				workspaceId: true,
			},
		});

		if (bySubscription?.workspaceId) {
			return bySubscription.workspaceId;
		}
	}

	if (stripeCustomerId) {
		const byCustomer = await db.workspaceSubscription.findFirst({
			where: {
				stripeCustomerId,
			},
			select: {
				workspaceId: true,
			},
		});

		if (byCustomer?.workspaceId) {
			return byCustomer.workspaceId;
		}
	}

	if (fallbackWorkspaceId) {
		return fallbackWorkspaceId;
	}

	if (stripeCustomerId) {
		const stripe = getStripeClient();
		const customer = await stripe.customers.retrieve(stripeCustomerId);

		if (!customer.deleted) {
			return customer.metadata?.workspaceId || null;
		}
	}

	return null;
}

export async function ensureStripeCustomerForWorkspace({
	workspace,
	ownerUser,
}) {
	const subscription = await ensureWorkspaceSubscription(workspace.id);

	if (subscription.stripeCustomerId) {
		return subscription.stripeCustomerId;
	}

	const stripe = getStripeClient();

	const customer = await stripe.customers.create({
		name: workspace.name,
		email: workspace.businessEmail || ownerUser.email || undefined,
		metadata: {
			workspaceId: workspace.id,
			workspaceName: workspace.name,
			ownerUserId: ownerUser.id,
		},
	});

	await db.workspaceSubscription.update({
		where: {
			workspaceId: workspace.id,
		},
		data: {
			stripeCustomerId: customer.id,
		},
	});

	return customer.id;
}

export async function syncWorkspaceSubscriptionFromCheckoutSession(session) {
	const workspaceId =
		session?.metadata?.workspaceId || session?.client_reference_id || null;

	if (!workspaceId) {
		return;
	}

	await ensureWorkspaceSubscription(workspaceId);

	await db.workspaceSubscription.update({
		where: {
			workspaceId,
		},
		data: {
			billingProvider: "STRIPE",
			stripeCustomerId:
				typeof session.customer === "string"
					? session.customer
					: session.customer?.id || undefined,
			stripeSubscriptionId:
				typeof session.subscription === "string"
					? session.subscription
					: session.subscription?.id || undefined,
		},
	});
}

export async function syncWorkspaceSubscriptionFromStripeSubscription(
	subscription,
) {
	const stripeCustomerId =
		typeof subscription.customer === "string"
			? subscription.customer
			: subscription.customer?.id || null;

	const activePrice = subscription.items?.data?.[0]?.price || null;
	const { lookupKey, priceId, productId } =
		await resolveLookupKeyFromPrice(activePrice);
	const tierInfo = resolveTierIntervalFromLookupKey(lookupKey);

	if (!tierInfo) {
		throw new Error(
			`Unsupported Stripe price for subscription ${subscription.id}. Missing or unknown lookup key.`,
		);
	}

	const workspaceId = await resolveWorkspaceIdFromStripeRefs({
		stripeCustomerId,
		stripeSubscriptionId: subscription.id,
		fallbackWorkspaceId: subscription.metadata?.workspaceId || null,
	});

	if (!workspaceId) {
		throw new Error(
			`Could not resolve workspace for Stripe subscription ${subscription.id}.`,
		);
	}

	await ensureWorkspaceSubscription(workspaceId);

	const { currentPeriodStart, currentPeriodEnd } =
		getSubscriptionPeriodDates(subscription);

	await db.workspaceSubscription.update({
		where: {
			workspaceId,
		},
		data: {
			billingProvider: "STRIPE",
			tier: tierInfo.tier,
			status: mapStripeStatusToWorkspaceStatus(subscription.status),
			stripeCustomerId: stripeCustomerId || undefined,
			stripeSubscriptionId: subscription.id,
			stripeProductId: productId || undefined,
			stripePriceId: priceId || undefined,
			currentPeriodStart,
			currentPeriodEnd,
			cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
			trialEndsAt: null,
		},
	});
}

export async function fallbackWorkspaceSubscriptionToTrialFromStripeSubscription(
	subscription,
) {
	const stripeCustomerId =
		typeof subscription.customer === "string"
			? subscription.customer
			: subscription.customer?.id || null;

	const workspaceId = await resolveWorkspaceIdFromStripeRefs({
		stripeCustomerId,
		stripeSubscriptionId: subscription.id,
		fallbackWorkspaceId: subscription.metadata?.workspaceId || null,
	});

	if (!workspaceId) {
		return;
	}

	await ensureWorkspaceSubscription(workspaceId);

	await db.workspaceSubscription.update({
		where: {
			workspaceId,
		},
		data: {
			billingProvider: "MANUAL",
			tier: "TRIAL",
			status: "TRIALING",
			trialEndsAt: null,
			currentPeriodStart: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
			stripeCustomerId: stripeCustomerId || undefined,
			stripeSubscriptionId: null,
			stripeProductId: null,
			stripePriceId: null,
		},
	});
}

export async function markWorkspaceSubscriptionPastDueFromInvoice(invoice) {
	const stripeCustomerId =
		typeof invoice.customer === "string"
			? invoice.customer
			: invoice.customer?.id || null;

	const stripeSubscriptionId =
		typeof invoice.subscription === "string"
			? invoice.subscription
			: invoice.subscription?.id || null;

	const workspaceSubscription = await db.workspaceSubscription.findFirst({
		where: {
			OR: [
				...(stripeSubscriptionId ? [{ stripeSubscriptionId }] : []),
				...(stripeCustomerId ? [{ stripeCustomerId }] : []),
			],
		},
		select: {
			workspaceId: true,
		},
	});

	if (!workspaceSubscription?.workspaceId) {
		return;
	}

	await db.workspaceSubscription.update({
		where: {
			workspaceId: workspaceSubscription.workspaceId,
		},
		data: {
			billingProvider: "STRIPE",
			status: "PAST_DUE",
			stripeCustomerId: stripeCustomerId || undefined,
			stripeSubscriptionId: stripeSubscriptionId || undefined,
		},
	});
}
