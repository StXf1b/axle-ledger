import { db } from "@/lib/db";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_KEY_LENGTH = 120;

export const ABUSE_LIMITS = {
	documentUploadUrl: {
		actionKey: "document-upload-url",
		limit: 120,
		windowMs: HOUR_MS,
		message:
			"Too many document upload attempts. Please wait before uploading more files.",
	},
	customerExport: {
		actionKey: "customer-export",
		windowMs: DAY_MS,
		limitsByTier: {
			STARTER: 25,
			PRO: 250,
			BUSINESS: 1000,
			CUSTOM: null,
		},
		message:
			"Customer export fair-use limit reached for today. Please try again later.",
	},
	workLogCustomerEmail: {
		actionKey: "work-log-customer-email",
		windowMs: DAY_MS,
		limitsByTier: {
			STARTER: 25,
			PRO: 250,
			BUSINESS: 1000,
			CUSTOM: null,
		},
		message:
			"Customer email fair-use limit reached for today. Please try again later.",
	},
};

export class AbuseLimitError extends Error {
	constructor(result, message = "Usage limit reached. Please try again later.") {
		super(message);
		this.name = "AbuseLimitError";
		this.result = result;
		this.retryAfterSeconds = result.retryAfterSeconds;
	}
}

function asPlainObject(value) {
	return value && typeof value === "object" && !Array.isArray(value)
		? value
		: {};
}

function normalizeActionKey(value) {
	return String(value || "unknown")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9:._/-]/g, "-")
		.slice(0, MAX_KEY_LENGTH);
}

function getActiveWindow(entry, now, windowMs) {
	const resetAtMs = Date.parse(entry?.resetAt || "");

	if (Number.isFinite(resetAtMs) && resetAtMs > now) {
		return {
			count: Math.max(0, Number(entry?.count) || 0),
			resetAtMs,
			resetAt: new Date(resetAtMs).toISOString(),
		};
	}

	const resetAtMsNext = now + windowMs;

	return {
		count: 0,
		resetAtMs: resetAtMsNext,
		resetAt: new Date(resetAtMsNext).toISOString(),
	};
}

function pruneExpiredWindows(windows, now) {
	return Object.fromEntries(
		Object.entries(windows).filter(([, value]) => {
			const resetAtMs = Date.parse(value?.resetAt || "");
			return Number.isFinite(resetAtMs) && resetAtMs > now;
		}),
	);
}

function buildResult({ actionKey, limit, count, resetAtMs, now }) {
	const resetInMs = Math.max(resetAtMs - now, 0);
	const retryAfterSeconds = Math.max(Math.ceil(resetInMs / 1000), 1);

	return {
		actionKey,
		limit,
		count,
		remaining: Math.max(limit - count, 0),
		resetAt: new Date(resetAtMs),
		resetInMs,
		retryAfterSeconds,
	};
}

async function getOrCreateSubscription(tx, workspaceId) {
	return tx.workspaceSubscription.upsert({
		where: {
			workspaceId,
		},
		update: {},
		create: {
			workspaceId,
			billingProvider: "MANUAL",
			tier: "TRIAL",
			status: "TRIALING",
			trialEndsAt: null,
		},
	});
}

export function getAbuseLimitForTier(entitlements, limitsByTier) {
	const tier = entitlements?.tier || "TRIAL";
	const fallbackLimit = limitsByTier?.DEFAULT ?? null;

	return Object.prototype.hasOwnProperty.call(limitsByTier || {}, tier)
		? limitsByTier[tier]
		: fallbackLimit;
}

export async function assertWorkspaceAbuseLimit({
	workspaceId,
	actionKey,
	limit,
	windowMs,
	cost = 1,
	message,
}) {
	if (limit === null || limit === undefined) {
		return {
			limited: false,
		};
	}

	const safeLimit = Math.max(1, Number(limit) || 1);
	const safeWindowMs = Math.max(MINUTE_MS, Number(windowMs) || HOUR_MS);
	const safeCost = Math.max(1, Number(cost) || 1);
	const key = normalizeActionKey(actionKey);
	const now = Date.now();

	return db.$transaction(async (tx) => {
		const lockKey = `abuse-limit:${workspaceId}:${key}`;
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

		const subscription = await getOrCreateSubscription(tx, workspaceId);
		const metadata = asPlainObject(subscription.metadata);
		const currentWindows = asPlainObject(metadata.abuseLimits);
		const activeWindow = getActiveWindow(currentWindows[key], now, safeWindowMs);
		const nextCount = activeWindow.count + safeCost;
		const result = buildResult({
			actionKey: key,
			limit: safeLimit,
			count: nextCount,
			resetAtMs: activeWindow.resetAtMs,
			now,
		});

		if (nextCount > safeLimit) {
			throw new AbuseLimitError(result, message);
		}

		await tx.workspaceSubscription.update({
			where: {
				workspaceId,
			},
			data: {
				metadata: {
					...metadata,
					abuseLimits: {
						...pruneExpiredWindows(currentWindows, now),
						[key]: {
							count: nextCount,
							resetAt: activeWindow.resetAt,
						},
					},
				},
			},
		});

		return {
			limited: true,
			...result,
		};
	});
}

export async function assertWorkspaceTierAbuseLimit({
	workspaceId,
	entitlements,
	actionKey,
	limitsByTier,
	windowMs,
	cost,
	message,
}) {
	return assertWorkspaceAbuseLimit({
		workspaceId,
		actionKey,
		limit: getAbuseLimitForTier(entitlements, limitsByTier),
		windowMs,
		cost,
		message,
	});
}

export function isAbuseLimitError(error) {
	return error?.name === "AbuseLimitError";
}

export function createAbuseLimitResponse(error) {
	const result = error.result || {};
	const retryAfterSeconds = result.retryAfterSeconds || 60;

	return Response.json(
		{
			error: error.message || "Usage limit reached. Please try again later.",
			retryAfterSeconds,
		},
		{
			status: 429,
			headers: {
				"Retry-After": String(retryAfterSeconds),
				"X-RateLimit-Limit": String(result.limit || ""),
				"X-RateLimit-Remaining": String(result.remaining || 0),
				...(result.resetAt
					? { "X-RateLimit-Reset": result.resetAt.toISOString() }
					: {}),
			},
		},
	);
}
