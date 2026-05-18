import Stripe from "stripe";

let stripeSingleton = null;

export function getStripeClient() {
	if (stripeSingleton) {
		return stripeSingleton;
	}

	const secretKey = process.env.STRIPE_SECRET_KEY;

	if (!secretKey) {
		throw new Error("Missing STRIPE_SECRET_KEY");
	}

	stripeSingleton = new Stripe(secretKey);

	return stripeSingleton;
}

export function getAppUrl() {
	if (process.env.APP_URL) {
		return process.env.APP_URL.replace(/\/$/, "");
	}

	if (process.env.NEXT_PUBLIC_APP_URL) {
		return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
	}

	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	return "http://localhost:3000";
}
