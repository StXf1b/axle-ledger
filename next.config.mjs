/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"form-action 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com https://js.stripe.com https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
	"font-src 'self' data:",
	"connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com https://api.clerk.com https://*.stripe.com https://*.r2.cloudflarestorage.com https://*.r2.dev https://vitals.vercel-insights.com https://*.vercel-insights.com",
	"frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
	"worker-src 'self' blob:",
	...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
	{
		key: "Content-Security-Policy",
		value: contentSecurityPolicy,
	},
	{
		key: "Referrer-Policy",
		value: "strict-origin-when-cross-origin",
	},
	{
		key: "X-Content-Type-Options",
		value: "nosniff",
	},
	{
		key: "X-Frame-Options",
		value: "DENY",
	},
	{
		key: "X-DNS-Prefetch-Control",
		value: "on",
	},
	{
		key: "Permissions-Policy",
		value:
			"camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()",
	},
	...(isProduction
		? [
				{
					key: "Strict-Transport-Security",
					value: "max-age=63072000; includeSubDomains; preload",
				},
			]
		: []),
];

const nextConfig = {
	/* config options here */
	poweredByHeader: false,
	reactCompiler: true,

	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "img.clerk.com",
				port: "",
				pathname: "/**",
			},
		],
	},

	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
