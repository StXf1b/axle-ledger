export function formatDateShort(value) {
	if (!value) return "—";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return "—";

	const day = String(date.getUTCDate()).padStart(2, "0");
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const year = date.getUTCFullYear();

	return `${day}/${month}/${year}`;
}

export function formatDateLong(value) {
	if (!value) return "—";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return "—";

	return new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}
