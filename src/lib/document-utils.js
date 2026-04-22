export const DOCUMENT_CATEGORY_OPTIONS = [
	{ value: "GENERAL", label: "General" },
	{ value: "INVOICE", label: "Invoice" },
	{ value: "RECEIPT", label: "Receipt" },
	{ value: "SERVICE_RECORD", label: "Service record" },
	{ value: "INSURANCE", label: "Insurance" },
	{ value: "TAX", label: "Tax" },
	{ value: "NCT", label: "NCT" },
	{ value: "WARRANTY", label: "Warranty" },
	{ value: "PHOTO", label: "Photo" },
	{ value: "OTHER", label: "Other" },
];

export const DOCUMENT_CATEGORY_LABELS = DOCUMENT_CATEGORY_OPTIONS.reduce(
	(acc, item) => {
		acc[item.value] = item.label;
		return acc;
	},
	{},
);

export function formatDocumentCategory(category) {
	return DOCUMENT_CATEGORY_LABELS[category] || category || "Unknown";
}

export function formatFileSize(sizeBytes) {
	if (sizeBytes === null || sizeBytes === undefined || sizeBytes === "") {
		return "—";
	}

	const bytes = Number(sizeBytes);

	if (!Number.isFinite(bytes) || bytes < 0) {
		return "—";
	}

	if (bytes === 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	const rounded =
		value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1);

	return `${rounded} ${units[unitIndex]}`;
}

export function getDocumentLinkedLabel(document) {
	const customerLabel = document.customer
		? document.customer.companyName ||
			`${document.customer.firstName || ""} ${document.customer.lastName || ""}`.trim()
		: null;

	const vehicleLabel = document.vehicle
		? `${document.vehicle.registration} · ${document.vehicle.make} ${document.vehicle.model}`
		: null;

	if (customerLabel && vehicleLabel) {
		return `${vehicleLabel} / ${customerLabel}`;
	}

	return vehicleLabel || customerLabel || "Not linked";
}
