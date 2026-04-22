"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	CheckCircle2,
	RotateCcw,
	XCircle,
	Trash2,
	PencilLine,
} from "lucide-react";

import Button from "@/components/ui/Button";
import {
	markReminderCompleted,
	reopenReminder,
	cancelReminder,
	deleteReminder,
} from "@/actions/reminders";

export default function ReminderDetailActions({ reminder }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleComplete() {
		startTransition(async () => {
			await markReminderCompleted(reminder.id);
			router.refresh();
		});
	}

	function handleReopen() {
		startTransition(async () => {
			await reopenReminder(reminder.id);
			router.refresh();
		});
	}

	function handleCancel() {
		startTransition(async () => {
			await cancelReminder(reminder.id);
			router.refresh();
		});
	}

	function handleDelete() {
		const confirmed = window.confirm("Delete this reminder?");
		if (!confirmed) return;

		startTransition(async () => {
			await deleteReminder(reminder.id);
			router.push("/reminders");
			router.refresh();
		});
	}

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "12px",
				flexWrap: "wrap",
			}}
		>
			<Button
				type="button"
				variant="secondary"
				onClick={() => router.push(`/reminders/${reminder.id}/edit`)}
				disabled={isPending}
				leftIcon={<PencilLine size={18} />}
			>
				Edit reminder
			</Button>

			{reminder.status === "OPEN" ? (
				<Button
					type="button"
					variant="primary"
					onClick={handleComplete}
					disabled={isPending}
					leftIcon={<CheckCircle2 size={18} />}
				>
					Mark complete
				</Button>
			) : null}

			{reminder.status !== "OPEN" ? (
				<Button
					type="button"
					variant="secondary"
					onClick={handleReopen}
					disabled={isPending}
					leftIcon={<RotateCcw size={18} />}
				>
					Reopen
				</Button>
			) : null}

			{reminder.status !== "CANCELLED" ? (
				<Button
					type="button"
					variant="secondary"
					onClick={handleCancel}
					disabled={isPending}
					leftIcon={<XCircle size={18} />}
				>
					Cancel
				</Button>
			) : null}

			<Button
				type="button"
				variant="danger"
				onClick={handleDelete}
				disabled={isPending}
				leftIcon={<Trash2 size={18} />}
			>
				Delete
			</Button>
		</div>
	);
}
