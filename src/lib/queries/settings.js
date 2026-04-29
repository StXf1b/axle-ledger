import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { WORKSPACE_PLAN_DEFINITIONS } from "@/lib/billing/workspace-plans";
import {
	ensureWorkspaceSubscription,
	resolveWorkspaceEntitlements,
} from "@/lib/billing/workspace-subscription";
import {
	getWorkspaceUsage,
	buildWorkspaceUsageSummary,
} from "@/lib/billing/workspace-usage";

export async function getSettingsPageData() {
	const { userId } = await auth();

	if (!userId) {
		return null;
	}

	const appUser = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
		include: {
			memberships: {
				include: {
					workspace: {
						include: {
							settings: true,
							memberships: {
								orderBy: {
									createdAt: "asc",
								},
								include: {
									user: true,
								},
							},
							invites: {
								where: {
									status: "PENDING",
								},
								orderBy: {
									createdAt: "desc",
								},
							},
						},
					},
				},
			},
		},
	});

	if (!appUser || appUser.memberships.length === 0) {
		return null;
	}

	const membership = appUser.memberships[0];
	const workspace = membership.workspace;

	const [subscription, usage] = await Promise.all([
		ensureWorkspaceSubscription(workspace.id),
		getWorkspaceUsage(workspace.id),
	]);

	const entitlements = resolveWorkspaceEntitlements(subscription);
	const usageSummary = buildWorkspaceUsageSummary(entitlements.limits, usage);

	const plans = Object.entries(WORKSPACE_PLAN_DEFINITIONS).map(
		([tier, definition]) => ({
			tier,
			label: definition.label,
			billing: definition.billing,
			limits: definition.limits,
			features: definition.features,
			isCurrent: tier === entitlements.tier,
			isCustom: tier === "CUSTOM",
		}),
	);

	return {
		currentUser: {
			id: appUser.id,
			clerkUserId: appUser.clerkUserId,
			email: appUser.email,
			fullName: appUser.fullName,
		},
		currentMembership: {
			id: membership.id,
			role: membership.role,
		},
		workspace: {
			id: workspace.id,
			name: workspace.name,
			slug: workspace.slug,
			businessEmail: workspace.businessEmail || "",
			businessPhone: workspace.businessPhone || "",
			website: workspace.website || "",
			addressLine1: workspace.addressLine1 || "",
			addressLine2: workspace.addressLine2 || "",
			city: workspace.city || "",
			county: workspace.county || "",
			country: workspace.country || "Ireland",
		},
		settings: {
			compactLayout: workspace.settings?.compactLayout ?? true,
			showWelcomeTips: workspace.settings?.showWelcomeTips ?? true,
			showQuickAddVehicle: workspace.settings?.showQuickAddVehicle ?? true,
			showQuickAddCustomer: workspace.settings?.showQuickAddCustomer ?? true,
			showQuickAddReminder: workspace.settings?.showQuickAddReminder ?? true,
			showQuickUploadDoc: workspace.settings?.showQuickUploadDoc ?? false,
			showWidgetOverdue: workspace.settings?.showWidgetOverdue ?? true,
			showWidgetDueSoon: workspace.settings?.showWidgetDueSoon ?? true,
			showWidgetRecent: workspace.settings?.showWidgetRecent ?? true,
			showWidgetStatus: workspace.settings?.showWidgetStatus ?? false,
			showQuickAddWorkLog: workspace.settings?.showQuickAddWorkLog ?? true,
			showWidgetWorkLogs: workspace.settings?.showWidgetWorkLogs ?? true,
		},
		members: workspace.memberships.map((item) => ({
			id: item.id,
			role: item.role,
			createdAt: item.createdAt.toISOString(),
			user: {
				id: item.user.id,
				email: item.user.email,
				fullName: item.user.fullName || "Unnamed user",
				imageUrl: item.user.imageUrl || "",
			},
		})),
		invites: (workspace.invites || []).map((invite) => ({
			id: invite.id,
			email: invite.email,
			role: invite.role,
			status: invite.status,
			token: invite.token,
			expiresAt: invite.expiresAt.toISOString(),
			createdAt: invite.createdAt.toISOString(),
		})),
		billingInfo: {
			currentPlan: {
				tier: entitlements.tier,
				label: entitlements.label,
				status: entitlements.status,
				billingProvider: entitlements.billingProvider,
				trialEndsAt: entitlements.trialEndsAt
					? new Date(entitlements.trialEndsAt).toISOString()
					: null,
				currentPeriodStart: entitlements.currentPeriodStart
					? new Date(entitlements.currentPeriodStart).toISOString()
					: null,
				currentPeriodEnd: entitlements.currentPeriodEnd
					? new Date(entitlements.currentPeriodEnd).toISOString()
					: null,
				cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
				access: entitlements.access,
				limits: entitlements.limits,
				features: entitlements.features,
			},
			usage,
			usageSummary,
			plans,
			canManageBilling: membership.role === "OWNER",
		},
	};
}
