const CUSTOMER_EXPORT_TIERS = new Set(["STARTER", "PRO", "BUSINESS", "CUSTOM"]);

export function canUseStarterAndAboveFeature(entitlements) {
	return (
		CUSTOMER_EXPORT_TIERS.has(entitlements?.tier) &&
		entitlements?.access?.canCreateRecords === true
	);
}

export function canExportCustomerData(entitlements) {
	return canUseStarterAndAboveFeature(entitlements);
}
