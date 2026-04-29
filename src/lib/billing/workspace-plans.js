const MB = 1024 * 1024;
const GB = 1024 * MB;

export const WORKSPACE_PLAN_DEFINITIONS = {
	TRIAL: {
		label: "Trial",
		billing: {
			monthlyPriceCents: 0,
			yearlyPriceCents: null,
			stripeLookupKeyMonthly: null,
			stripeLookupKeyYearly: null,
		},
		limits: {
			members: 3,
			customers: 10, // intentionally low for testing purposes
			vehicles: 30, // intentionally low for testing purposes
			documents: 10,
			documentStorageBytes: 0.2 * GB,
			reminders: 20,
			workLogs: 40,
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
			monthlyPriceCents: 1900,
			yearlyPriceCents: 19000,
			stripeLookupKeyMonthly: "starter_monthly",
			stripeLookupKeyYearly: "starter_yearly",
		},
		limits: {
			members: 5,
			customers: 500,
			vehicles: 750,
			documents: 2000,
			documentStorageBytes: 10 * GB,
			reminders: 2500,
			workLogs: 20000,
			pendingInvites: 15,
			maxUploadBytes: 25 * MB,
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
			monthlyPriceCents: 4900,
			yearlyPriceCents: 49000,
			stripeLookupKeyMonthly: "pro_monthly",
			stripeLookupKeyYearly: "pro_yearly",
		},
		limits: {
			members: 15,
			customers: 2500,
			vehicles: 5000,
			documents: 10000,
			documentStorageBytes: 50 * GB,
			reminders: 10000,
			workLogs: 100000,
			pendingInvites: 50,
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
			monthlyPriceCents: 9900,
			yearlyPriceCents: 99000,
			stripeLookupKeyMonthly: "business_monthly",
			stripeLookupKeyYearly: "business_yearly",
		},
		limits: {
			members: 50,
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
