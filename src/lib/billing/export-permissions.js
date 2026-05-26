const CUSTOMER_EXPORT_TIERS = new Set(["STARTER", "PRO", "BUSINESS", "CUSTOM"]);

export function canExportCustomerData(entitlements) {
	return (
		CUSTOMER_EXPORT_TIERS.has(entitlements?.tier) &&
		entitlements?.access?.canCreateRecords === true
	);
}
