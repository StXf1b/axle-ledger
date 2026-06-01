const MB = 1024 * 1024;
const GB = 1024 * MB;

export const WORKSPACE_PLAN_DEFINITIONS = {
	TRIAL: {
		label: "Free",
		billing: {
			monthlyPriceCents: 0,
			yearlyPriceCents: null,
			stripeLookupKeyMonthly: null,
			stripeLookupKeyYearly: null,
		},
		limits: {
			members: 2,
			customers: 10,
			vehicles: 20,
			documents: 20,
			documentStorageBytes: 0.25 * GB,
			reminders: 20,
			workLogs: 50,
			pendingInvites: 2,
			maxUploadBytes: 5 * MB,
		},
		features: {
			documentsEnabled: true,
			remindersEnabled: true,
			workLogsEnabled: true,
			exportsEnabled: true,
		},
	},
	STARTER: {
		label: "Starter",
		billing: {
			monthlyPriceCents: 2499,
			yearlyPriceCents: 24900,
			stripeLookupKeyMonthly: "starter_monthly",
			stripeLookupKeyYearly: "starter_yearly",
		},
		limits: {
			members: 4,
			customers: 300,
			vehicles: 500,
			documents: 1000,
			documentStorageBytes: 5 * GB,
			reminders: 1000,
			workLogs: 5000,
			pendingInvites: 5,
			maxUploadBytes: 20 * MB,
		},
		features: {
			documentsEnabled: true,
			remindersEnabled: true,
			workLogsEnabled: true,
			exportsEnabled: true,
		},
	},
	PRO: {
		label: "Pro",
		billing: {
			monthlyPriceCents: 6999,
			yearlyPriceCents: 69900,
			stripeLookupKeyMonthly: "pro_monthly",
			stripeLookupKeyYearly: "pro_yearly",
		},
		limits: {
			members: 10,
			customers: 2500,
			vehicles: 5000,
			documents: 10000,
			documentStorageBytes: 50 * GB,
			reminders: 10000,
			workLogs: 100000,
			pendingInvites: 20,
			maxUploadBytes: 50 * MB,
		},
		features: {
			documentsEnabled: true,
			remindersEnabled: true,
			workLogsEnabled: true,
			exportsEnabled: true,
		},
	},
	BUSINESS: {
		label: "Business",
		billing: {
			monthlyPriceCents: 19900,
			yearlyPriceCents: 199000,
			stripeLookupKeyMonthly: "business_monthly",
			stripeLookupKeyYearly: "business_yearly",
		},
		limits: {
			members: 30,
			customers: 10000,
			vehicles: 15000,
			documents: 50000,
			documentStorageBytes: 250 * GB,
			reminders: 50000,
			workLogs: 500000,
			pendingInvites: 100,
			maxUploadBytes: 100 * MB,
		},
		features: {
			documentsEnabled: true,
			remindersEnabled: true,
			workLogsEnabled: true,
			exportsEnabled: true,
		},
	},
	CUSTOM: {
		label: "Custom",
		billing: {
			monthlyPriceCents: null,
			yearlyPriceCents: null,
			stripeLookupKeyMonthly: null,
			stripeLookupKeyYearly: null,
		},
		limits: {
			members: null,
			customers: null,
			vehicles: null,
			documents: null,
			documentStorageBytes: null,
			reminders: null,
			workLogs: null,
			pendingInvites: null,
			maxUploadBytes: null,
		},
		features: {
			documentsEnabled: true,
			remindersEnabled: true,
			workLogsEnabled: true,
			exportsEnabled: true,
		},
	},
};

// Pricing inc VAT
// Free	€0/month - profit: loss leader, get users in the door and convert to paid plans
// Starter	€24.99/month - net profit: €19.52/month
// Pro	€69.99/month - net profit: €55.11/month
// Business	€199/month - net profit: €157.16/month

// pay for 10 months and get 2 months free
// Starter	€249/yearly
// Pro	€699/yearly
// Business	€1,990/yearly
