import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { db } from "@/lib/db";

export async function POST(req) {
	try {
		const evt = await verifyWebhook(req);

		if (evt.type === "user.created") {
			const clerkUser = evt.data;

			const email =
				clerkUser.email_addresses?.find(
					(item) => item.id === clerkUser.primary_email_address_id,
				)?.email_address || "";

			const firstName = clerkUser.first_name || null;
			const lastName = clerkUser.last_name || null;
			const fullName =
				clerkUser.unsafe_metadata?.fullName ||
				[firstName, lastName].filter(Boolean).join(" ") ||
				null;

			await db.user.upsert({
				where: { clerkUserId: clerkUser.id },
				update: {
					email,
					firstName,
					lastName,
					fullName,
					imageUrl: clerkUser.image_url || null,
				},
				create: {
					clerkUserId: clerkUser.id,
					email,
					firstName,
					lastName,
					fullName,
					imageUrl: clerkUser.image_url || null,
				},
			});
		}

		if (evt.type === "user.updated") {
			const clerkUser = evt.data;

			const email =
				clerkUser.email_addresses?.find(
					(item) => item.id === clerkUser.primary_email_address_id,
				)?.email_address || "";

			await db.user.updateMany({
				where: { clerkUserId: clerkUser.id },
				data: {
					email,
					firstName: clerkUser.first_name || null,
					lastName: clerkUser.last_name || null,
					fullName:
						clerkUser.unsafe_metadata?.fullName ||
						[clerkUser.first_name, clerkUser.last_name]
							.filter(Boolean)
							.join(" ") ||
						null,
					imageUrl: clerkUser.image_url || null,
				},
			});
		}

		if (evt.type === "user.deleted") {
			const clerkUserId = evt.data?.id;

			if (clerkUserId) {
				await db.user.deleteMany({
					where: { clerkUserId },
				});
			}
		}

		return new Response("ok", { status: 200 });
	} catch (error) {
		console.error("Webhook error:", error);
		return new Response("Webhook error", { status: 400 });
	}
}
