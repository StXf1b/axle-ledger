const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 60;
const MAX_KEY_LENGTH = 240;
const PRUNE_INTERVAL_MS = 60 * 1000;

const globalForRateLimit = globalThis;

const rateLimitStore =
	globalForRateLimit.__axleledgerRateLimitStore ||
	new Map();

globalForRateLimit.__axleledgerRateLimitStore = rateLimitStore;

let lastPruneAt = 0;

export class RateLimitError extends Error {
	constructor(result, message = "Rate limit exceeded.") {
		super(message);
		this.name = "RateLimitError";
		this.result = result;
	}
}

function normalizeKeyPart(value) {
	return String(value || "anonymous")
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9:._@/-]/g, "-")
		.slice(0, MAX_KEY_LENGTH);
}

function pruneExpiredEntries(now) {
	if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;

	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetAt <= now) {
			rateLimitStore.delete(key);
		}
	}

	lastPruneAt = now;
}

export function buildRateLimitKey(parts) {
	return parts.map(normalizeKeyPart).filter(Boolean).join(":");
}

export function getClientIp(request) {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		return forwardedFor.split(",")[0]?.trim() || "unknown";
	}

	return (
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}

export function checkRateLimit({
	key,
	limit = DEFAULT_LIMIT,
	windowMs = DEFAULT_WINDOW_MS,
	now = Date.now(),
} = {}) {
	if (!key) {
		throw new Error("Rate limit key is required.");
	}

	const safeLimit = Math.max(1, Number(limit) || DEFAULT_LIMIT);
	const safeWindowMs = Math.max(1000, Number(windowMs) || DEFAULT_WINDOW_MS);
	const normalizedKey = normalizeKeyPart(key);

	pruneExpiredEntries(now);

	const current = rateLimitStore.get(normalizedKey);
	const entry =
		current && current.resetAt > now
			? current
			: {
					count: 0,
					resetAt: now + safeWindowMs,
				};

	entry.count += 1;
	rateLimitStore.set(normalizedKey, entry);

	const remaining = Math.max(safeLimit - entry.count, 0);
	const resetInMs = Math.max(entry.resetAt - now, 0);
	const retryAfterSeconds = Math.max(Math.ceil(resetInMs / 1000), 1);
	const allowed = entry.count <= safeLimit;

	return {
		allowed,
		key: normalizedKey,
		limit: safeLimit,
		remaining,
		resetAt: new Date(entry.resetAt),
		resetInMs,
		retryAfterSeconds,
	};
}

export function checkRequestRateLimit(
	request,
	{ identifier, keyPrefix, limit, windowMs } = {},
) {
	const url = request.url ? new URL(request.url) : null;
	const routeKey = keyPrefix || `${request.method || "REQUEST"}:${url?.pathname || "/"}`;
	const actorKey = identifier || getClientIp(request);

	return checkRateLimit({
		key: buildRateLimitKey([routeKey, actorKey]),
		limit,
		windowMs,
	});
}

export function assertRateLimit(options) {
	const result = checkRateLimit(options);

	if (!result.allowed) {
		throw new RateLimitError(result);
	}

	return result;
}

export function createRateLimitResponse(
	result,
	message = "Too many requests. Please wait and try again.",
) {
	return Response.json(
		{
			error: message,
			retryAfterSeconds: result.retryAfterSeconds,
		},
		{
			status: 429,
			headers: {
				"Retry-After": String(result.retryAfterSeconds),
				"X-RateLimit-Limit": String(result.limit),
				"X-RateLimit-Remaining": String(result.remaining),
				"X-RateLimit-Reset": result.resetAt.toISOString(),
			},
		},
	);
}
