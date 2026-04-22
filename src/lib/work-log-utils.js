export function formatCurrency(value) {
	const numeric = Number(value || 0);

	if (!Number.isFinite(numeric)) {
		return "€0.00";
	}

	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
	}).format(numeric);
}

export function formatOdometer(value, unit) {
	if (value === null || value === undefined || value === "") {
		return "—";
	}

	const formatted = new Intl.NumberFormat("en-IE").format(Number(value));
	return `${formatted} ${unit || ""}`.trim();
}

export function formatWorkLogDate(dateValue) {
	if (!dateValue) return "—";

	return new Date(dateValue).toLocaleDateString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export function formatWorkLogDateTime(dateValue) {
	if (!dateValue) return "—";

	return new Date(dateValue).toLocaleString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function getCustomerLabel(customer) {
	if (!customer) return "—";

	return (
		customer.companyName ||
		`${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
		"—"
	);
}

export function getVehicleLabel(vehicle) {
	if (!vehicle) return "—";
	return `${vehicle.registration} · ${vehicle.make} ${vehicle.model}`;
}
