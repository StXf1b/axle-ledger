"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAppUrl, getStripeClient } from "@/lib/stripe";
import { ensureWorkspaceSubscription } from "@/lib/billing/workspace-subscription";
import {
	ensureStripeCustomerForWorkspace,
	getStripePriceForTierInterval,
	isBillingInterval,
	isPaidTier,
} from "@/lib/billing/stripe-sync";

async function getWorkspaceContextOrThrow() {
	const { userId } = await auth();

	if (!userId) {
		throw new Error("Unauthorized");
	}

	const appUser = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
		include: {
			memberships: {
				include: {
					workspace: true,
				},
			},
		},
	});

	if (!appUser || appUser.memberships.length === 0) {
		throw new Error("No workspace membership found");
	}

	const membership = appUser.memberships[0];
	const workspace = membership.workspace;

	return {
		appUser,
		membership,
		workspace,
	};
}

export async function createStripeCheckoutSession({ tier, interval }) {
	const { appUser, membership, workspace } = await getWorkspaceContextOrThrow();

	if (membership.role !== "OWNER") {
		throw new Error("Only the workspace owner can manage billing.");
	}

	if (!isPaidTier(tier)) {
		throw new Error("Only paid plans can be purchased through Stripe.");
	}

	if (!isBillingInterval(interval)) {
		throw new Error("Invalid billing interval.");
	}

	const subscription = await ensureWorkspaceSubscription(workspace.id);

	if (
		subscription.billingProvider === "STRIPE" &&
		subscription.stripeSubscriptionId &&
		!["CANCELED", "EXPIRED"].includes(subscription.status)
	) {
		throw new Error(
			"This workspace already has an active Stripe subscription. Use the billing portal to change or cancel it.",
		);
	}

	const stripe = getStripeClient();
	const baseUrl = getAppUrl();
	const stripeCustomerId = await ensureStripeCustomerForWorkspace({
		workspace,
		ownerUser: appUser,
	});
	const price = await getStripePriceForTierInterval(tier, interval);

	const session = await stripe.checkout.sessions.create({
		mode: "subscription",
		customer: stripeCustomerId,
		client_reference_id: workspace.id,
		line_items: [
			{
				price: price.id,
				quantity: 1,
			},
		],
		allow_promotion_codes: true,
		billing_address_collection: "auto",
		success_url: `${baseUrl}/settings?tab=billing&billing=success`,
		cancel_url: `${baseUrl}/settings?tab=billing&billing=cancelled`,
		metadata: {
			workspaceId: workspace.id,
			tier,
			interval,
		},
		subscription_data: {
			metadata: {
				workspaceId: workspace.id,
				tier,
				interval,
			},
		},
	});

	if (!session.url) {
		throw new Error("Could not create Stripe Checkout session.");
	}

	return {
		ok: true,
		url: session.url,
	};
}

export async function createStripePortalSession() {
	const { membership, workspace } = await getWorkspaceContextOrThrow();

	if (membership.role !== "OWNER") {
		throw new Error("Only the workspace owner can manage billing.");
	}

	const subscription = await ensureWorkspaceSubscription(workspace.id);

	if (!subscription.stripeCustomerId) {
		throw new Error("No Stripe customer found for this workspace yet.");
	}

	const stripe = getStripeClient();
	const baseUrl = getAppUrl();

	const session = await stripe.billingPortal.sessions.create({
		customer: subscription.stripeCustomerId,
		return_url: `${baseUrl}/settings?tab=billing&billing=portal_return`,
	});

	if (!session.url) {
		throw new Error("Could not create Stripe billing portal session.");
	}

	return {
		ok: true,
		url: session.url,
	};
}
