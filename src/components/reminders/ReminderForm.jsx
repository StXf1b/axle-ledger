"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	BellRing,
	CalendarDays,
	CarFront,
	StickyNote,
	UserRound,
} from "lucide-react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
	createReminder,
	updateReminder,
	deleteReminder,
} from "@/actions/reminders";
import { REMINDER_TYPE_OPTIONS } from "@/lib/reminder-utils";
import "./ReminderForm.css";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ReminderForm({
	mode = "create",
	initialData = null,
	reminderId = null,
	customers = [],
	vehicles = [],
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [showErrorModal, setShowErrorModal] = useState(false);

	const [form, setForm] = useState({
		title: initialData?.title || "",
		type: initialData?.type || "CUSTOM",
		dueAt: initialData?.dueAt
			? new Date(initialData.dueAt).toISOString().slice(0, 10)
			: "",
		customerId: initialData?.customerId || "",
		vehicleId: initialData?.vehicleId || "",
		notes: initialData?.notes || "",
	});

	const filteredVehicles = useMemo(() => {
		if (!form.customerId) {
			return vehicles;
		}

		return vehicles.filter(
			(vehicle) =>
				vehicle.customerId === form.customerId || vehicle.id === form.vehicleId,
		);
	}, [vehicles, form.customerId, form.vehicleId]);

	function handleChange(event) {
		const { name, value } = event.target;

		setForm((prev) => {
			const next = {
				...prev,
				[name]: value,
			};

			if (name === "vehicleId") {
				const selectedVehicle = vehicles.find(
					(vehicle) => vehicle.id === value,
				);

				if (selectedVehicle?.customerId) {
					next.customerId = selectedVehicle.customerId;
				}
			}

			if (name === "customerId" && value && prev.vehicleId) {
				const selectedVehicle = vehicles.find(
					(vehicle) => vehicle.id === prev.vehicleId,
				);

				if (
					selectedVehicle?.customerId &&
					selectedVehicle.customerId !== value
				) {
					next.vehicleId = "";
				}
			}

			return next;
		});

		setError("");
	}

	function handleSubmit(event) {
		event.preventDefault();

		startTransition(async () => {
			try {
				if (mode === "edit" && reminderId) {
					const result = await updateReminder(reminderId, form);
					router.push(`/reminders/${result.reminderId}`);
					router.refresh();
					return;
				}

				const result = await createReminder(form);
				router.push(`/reminders/${result.reminderId}`);
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to save reminder.");
				setShowErrorModal(true);
			}
		});
	}

	function handleDelete() {
		if (!reminderId) return;

		const confirmed = window.confirm("Delete this reminder?");
		if (!confirmed) return;

		startTransition(async () => {
			try {
				await deleteReminder(reminderId);
				router.push("/reminders");
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to delete reminder.");
				setShowErrorModal(true);
			}
		});
	}

	return (
		<form className="reminder-form-ui" onSubmit={handleSubmit}>
			<div className="reminder-form-ui__section">
				<div className="reminder-form-ui__section-header">
					<h3>Reminder details</h3>
					<p>Set the title, reminder type, and due date.</p>
				</div>

				<div className="reminder-form-ui__grid">
					<Input
						label="Reminder title"
						name="title"
						value={form.title}
						onChange={handleChange}
						placeholder="Service follow-up"
						icon={<BellRing size={18} />}
						required
					/>

					<div className="field">
						<label className="field-label" htmlFor="type">
							Reminder type
						</label>
						<select
							id="type"
							name="type"
							value={form.type}
							onChange={handleChange}
							className="reminder-form-ui__select"
						>
							{REMINDER_TYPE_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<Input
						label="Due date"
						name="dueAt"
						type="date"
						value={form.dueAt}
						onChange={handleChange}
						icon={<CalendarDays size={18} />}
						required
					/>
				</div>
			</div>

			<div className="reminder-form-ui__section">
				<div className="reminder-form-ui__section-header">
					<h3>Linked records</h3>
					<p>Optionally link this reminder to a customer, vehicle, or both.</p>
				</div>

				<div className="reminder-form-ui__grid">
					<div className="field">
						<label className="field-label" htmlFor="customerId">
							Linked customer
						</label>

						<div className="reminder-form-ui__select-wrap">
							<UserRound size={18} className="reminder-form-ui__select-icon" />
							<select
								id="customerId"
								name="customerId"
								value={form.customerId}
								onChange={handleChange}
								className="reminder-form-ui__select reminder-form-ui__select--icon"
							>
								<option value="">No customer linked</option>
								{customers.map((customer) => (
									<option key={customer.id} value={customer.id}>
										{customer.companyName ||
											`${customer.firstName} ${customer.lastName}`}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="field">
						<label className="field-label" htmlFor="vehicleId">
							Linked vehicle
						</label>

						<div className="reminder-form-ui__select-wrap">
							<CarFront size={18} className="reminder-form-ui__select-icon" />
							<select
								id="vehicleId"
								name="vehicleId"
								value={form.vehicleId}
								onChange={handleChange}
								className="reminder-form-ui__select reminder-form-ui__select--icon"
							>
								<option value="">No vehicle linked</option>
								{filteredVehicles.map((vehicle) => (
									<option key={vehicle.id} value={vehicle.id}>
										{vehicle.registration} · {vehicle.make} {vehicle.model}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>

			<div className="reminder-form-ui__section">
				<div className="reminder-form-ui__section-header">
					<h3>Internal notes</h3>
					<p>Add context, follow-up details, or workshop notes.</p>
				</div>

				<div className="field">
					<label className="field-label" htmlFor="notes">
						Notes
					</label>

					<div className="reminder-form-ui__textarea-wrap">
						<div className="reminder-form-ui__textarea-icon">
							<StickyNote size={18} />
						</div>

						<textarea
							id="notes"
							name="notes"
							value={form.notes}
							onChange={handleChange}
							className="reminder-form-ui__textarea"
							placeholder="Add useful notes about this reminder..."
						/>
					</div>
				</div>
			</div>

			<div className="reminder-form-ui__actions">
				<div className="reminder-form-ui__actions-left">
					{mode === "edit" ? (
						<Button
							type="button"
							variant="danger"
							onClick={handleDelete}
							disabled={isPending}
						>
							Delete reminder
						</Button>
					) : null}
				</div>

				<div className="reminder-form-ui__actions-right">
					<Button
						type="button"
						variant="secondary"
						onClick={() =>
							router.push(
								mode === "edit" && reminderId
									? `/reminders/${reminderId}`
									: "/reminders",
							)
						}
					>
						Cancel
					</Button>

					<Button
						type="submit"
						variant="primary"
						loading={isPending}
						rightIcon={!isPending ? <ArrowRight size={18} /> : null}
					>
						{mode === "edit" ? "Save reminder" : "Create reminder"}
					</Button>
				</div>
			</div>
			<ConfirmModal
				open={showErrorModal}
				onClose={() => setShowErrorModal(false)}
				title="Error"
				description={error}
				confirmText="Close"
				danger
				onConfirm={() => setShowErrorModal(false)}
				showCancelButton={false}
			/>
		</form>
	);
}
