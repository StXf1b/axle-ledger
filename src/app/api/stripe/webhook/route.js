import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import {
	fallbackWorkspaceSubscriptionToTrialFromStripeSubscription,
	markWorkspaceSubscriptionPastDueFromInvoice,
	syncWorkspaceSubscriptionFromCheckoutSession,
	syncWorkspaceSubscriptionFromStripeSubscription,
} from "@/lib/billing/stripe-sync";

export const runtime = "nodejs";

export async function POST(request) {
	const stripe = getStripeClient();
	const signature = request.headers.get("stripe-signature");
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!signature || !webhookSecret) {
		return new NextResponse("Missing Stripe webhook configuration.", {
			status: 400,
		});
	}

	const payload = await request.text();

	let event;

	try {
		event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
	} catch (error) {
		return new NextResponse(`Webhook Error: ${error.message}`, {
			status: 400,
		});
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object;

				if (session.mode === "subscription") {
					await syncWorkspaceSubscriptionFromCheckoutSession(session);
				}
				break;
			}

			case "customer.subscription.created":
			case "customer.subscription.updated": {
				await syncWorkspaceSubscriptionFromStripeSubscription(
					event.data.object,
				);
				break;
			}

			case "customer.subscription.deleted": {
				await fallbackWorkspaceSubscriptionToTrialFromStripeSubscription(
					event.data.object,
				);
				break;
			}

			case "invoice.payment_failed": {
				await markWorkspaceSubscriptionPastDueFromInvoice(event.data.object);
				break;
			}

			default:
				break;
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Stripe webhook handler error:", error);

		return new NextResponse("Webhook handler failed.", {
			status: 500,
		});
	}
}
