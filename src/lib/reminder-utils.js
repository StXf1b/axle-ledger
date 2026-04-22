export const REMINDER_TYPE_OPTIONS = [
	{ value: "TAX", label: "Tax" },
	{ value: "INSURANCE", label: "Insurance" },
	{ value: "NCT", label: "NCT" },
	{ value: "SERVICE", label: "Service" },
	{ value: "FOLLOW_UP", label: "Follow up" },
	{ value: "CUSTOM", label: "Custom" },
];

export const REMINDER_STATUS_OPTIONS = [
	{ value: "OPEN", label: "Open" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "CANCELLED", label: "Cancelled" },
];

export function formatReminderType(type) {
	switch (type) {
		case "TAX":
			return "Tax";
		case "INSURANCE":
			return "Insurance";
		case "NCT":
			return "NCT";
		case "SERVICE":
			return "Service";
		case "FOLLOW_UP":
			return "Follow up";
		case "CUSTOM":
		default:
			return "Custom";
	}
}

export function formatReminderStatus(status) {
	switch (status) {
		case "OPEN":
			return "Open";
		case "COMPLETED":
			return "Completed";
		case "CANCELLED":
			return "Cancelled";
		default:
			return status || "Unknown";
	}
}

export function getReminderTiming(reminder) {
	if (!reminder?.dueAt) {
		return {
			key: "unknown",
			label: "No due date",
			badgeClass: "badge-neutral",
		};
	}

	if (reminder.status === "COMPLETED") {
		return {
			key: "completed",
			label: "Completed",
			badgeClass: "badge-success",
		};
	}

	if (reminder.status === "CANCELLED") {
		return {
			key: "cancelled",
			label: "Cancelled",
			badgeClass: "badge-neutral",
		};
	}

	const now = new Date();
	const due = new Date(reminder.dueAt);

	now.setHours(0, 0, 0, 0);
	due.setHours(0, 0, 0, 0);

	const diffMs = due.getTime() - now.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		const days = Math.abs(diffDays);

		return {
			key: "overdue",
			label: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
			badgeClass: "badge-danger",
		};
	}

	if (diffDays === 0) {
		return {
			key: "today",
			label: "Due today",
			badgeClass: "badge-warning",
		};
	}

	if (diffDays <= 7) {
		return {
			key: "soon",
			label: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
			badgeClass: "badge-info",
		};
	}

	return {
		key: "upcoming",
		label: `Due in ${diffDays} days`,
		badgeClass: "badge-neutral",
	};
}

export function formatReminderDate(dateValue) {
	if (!dateValue) return "—";

	return new Date(dateValue).toLocaleDateString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}
