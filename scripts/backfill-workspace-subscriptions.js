import { db } from "./db.js";

async function main() {
	const workspaces = await db.workspace.findMany({
		select: {
			id: true,
		},
	});

	for (const workspace of workspaces) {
		await db.workspaceSubscription.upsert({
			where: {
				workspaceId: workspace.id,
			},
			update: {},
			create: {
				workspaceId: workspace.id,
				billingProvider: "MANUAL",
				tier: "TRIAL",
				status: "TRIALING",
				trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
			},
		});
	}

	console.log(`Backfilled ${workspaces.length} workspace subscriptions.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
