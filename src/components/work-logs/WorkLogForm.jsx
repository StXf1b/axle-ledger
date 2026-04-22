"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	CalendarDays,
	CarFront,
	FileText,
	Gauge,
	StickyNote,
	UserRound,
	Wrench,
	BadgeEuro,
} from "lucide-react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
	createWorkLog,
	updateWorkLog,
	deleteWorkLog,
} from "@/actions/work-logs";
import { formatCurrency, formatOdometer } from "@/lib/work-log-utils";
import "./WorkLogForm.css";

function getTodayValue() {
	return new Date().toISOString().slice(0, 10);
}

export default function WorkLogForm({
	mode = "create",
	initialData = null,
	workLogId = null,
	customers = [],
	vehicles = [],
	members = [],
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");

	const [form, setForm] = useState({
		title: initialData?.title || "",
		description: initialData?.description || "",
		completedAt: initialData?.completedAt
			? new Date(initialData.completedAt).toISOString().slice(0, 10)
			: getTodayValue(),
		customerId: initialData?.customerId || "",
		vehicleId: initialData?.vehicleId || "",
		performedByUserId: initialData?.performedByUserId || "",
		odometerValue: initialData?.odometerValue?.toString() || "",
		odometerUnit: initialData?.odometerUnit || "KM",
		labourCharge: initialData?.labourCharge?.toString() || "",
		partsCharge: initialData?.partsCharge?.toString() || "",
		notes: initialData?.notes || "",
		nextServiceDueAt: initialData?.nextServiceDueAt
			? new Date(initialData.nextServiceDueAt).toISOString().slice(0, 10)
			: "",
		nextServiceOdometer: initialData?.nextServiceOdometer?.toString() || "",
		nextServiceOdometerUnit: initialData?.nextServiceOdometerUnit || "KM",
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

	const selectedVehicle = useMemo(
		() => vehicles.find((vehicle) => vehicle.id === form.vehicleId) || null,
		[vehicles, form.vehicleId],
	);

	const totalCharge = useMemo(() => {
		const labour = Number(form.labourCharge || 0);
		const parts = Number(form.partsCharge || 0);

		if (!Number.isFinite(labour) || !Number.isFinite(parts)) {
			return 0;
		}

		return Number((labour + parts).toFixed(2));
	}, [form.labourCharge, form.partsCharge]);

	function handleChange(event) {
		const { name, value } = event.target;

		setForm((prev) => {
			const next = {
				...prev,
				[name]: value,
			};

			if (name === "vehicleId") {
				const selected = vehicles.find((vehicle) => vehicle.id === value);

				if (selected?.customerId) {
					next.customerId = selected.customerId;
				}

				if (selected?.odometerUnit && !prev.odometerValue) {
					next.odometerUnit = selected.odometerUnit;
				}
			}

			if (name === "customerId" && value && prev.vehicleId) {
				const selected = vehicles.find(
					(vehicle) => vehicle.id === prev.vehicleId,
				);

				if (selected?.customerId && selected.customerId !== value) {
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
				const payload = {
					...form,
					labourCharge: form.labourCharge || "0",
					partsCharge: form.partsCharge || "0",
				};

				if (mode === "edit" && workLogId) {
					const result = await updateWorkLog(workLogId, payload);
					router.push(`/work-logs/${result.workLogId}`);
					router.refresh();
					return;
				}

				const result = await createWorkLog(payload);
				router.push(`/work-logs/${result.workLogId}`);
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to save work log.");
			}
		});
	}

	function handleDelete() {
		if (!workLogId) return;

		const confirmed = window.confirm("Delete this work log?");
		if (!confirmed) return;

		startTransition(async () => {
			try {
				await deleteWorkLog(workLogId);
				router.push("/work-logs");
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to delete work log.");
			}
		});
	}

	return (
		<form className="work-log-form-ui" onSubmit={handleSubmit}>
			<div className="work-log-form-ui__section">
				<div className="work-log-form-ui__section-header">
					<h3>Work details</h3>
					<p>
						Record the work carried out, when it was completed, and by whom.
					</p>
				</div>

				<div className="work-log-form-ui__grid">
					<Input
						label="Work title"
						name="title"
						value={form.title}
						onChange={handleChange}
						placeholder="Front brake pads and discs replaced"
						icon={<Wrench size={18} />}
						required
					/>

					<Input
						label="Completed date"
						name="completedAt"
						type="date"
						value={form.completedAt}
						onChange={handleChange}
						icon={<CalendarDays size={18} />}
						required
					/>

					<div className="field">
						<label className="field-label" htmlFor="performedByUserId">
							Performed by
						</label>

						<div className="work-log-form-ui__select-wrap">
							<UserRound size={18} className="work-log-form-ui__select-icon" />
							<select
								id="performedByUserId"
								name="performedByUserId"
								value={form.performedByUserId}
								onChange={handleChange}
								className="work-log-form-ui__select work-log-form-ui__select--icon"
							>
								<option value="">Select staff member</option>
								{members.map((member) => (
									<option key={member.user.id} value={member.user.id}>
										{member.user.fullName || member.user.email}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="field">
						<label className="field-label" htmlFor="customerId">
							Linked customer
						</label>

						<div className="work-log-form-ui__select-wrap">
							<UserRound size={18} className="work-log-form-ui__select-icon" />
							<select
								id="customerId"
								name="customerId"
								value={form.customerId}
								onChange={handleChange}
								className="work-log-form-ui__select work-log-form-ui__select--icon"
							>
								<option value="">No customer selected</option>
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

						<div className="work-log-form-ui__select-wrap">
							<CarFront size={18} className="work-log-form-ui__select-icon" />
							<select
								id="vehicleId"
								name="vehicleId"
								value={form.vehicleId}
								onChange={handleChange}
								className="work-log-form-ui__select work-log-form-ui__select--icon"
							>
								<option value="">No vehicle selected</option>
								{filteredVehicles.map((vehicle) => (
									<option key={vehicle.id} value={vehicle.id}>
										{vehicle.registration} · {vehicle.make} {vehicle.model}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className="field">
					<label className="field-label" htmlFor="description">
						Work description
					</label>
					<div className="work-log-form-ui__textarea-wrap">
						<div className="work-log-form-ui__textarea-icon">
							<FileText size={18} />
						</div>
						<textarea
							id="description"
							name="description"
							value={form.description}
							onChange={handleChange}
							className="work-log-form-ui__textarea"
							placeholder="Describe the work carried out, parts fitted, checks performed, or anything relevant..."
						/>
					</div>
				</div>
			</div>

			<div className="work-log-form-ui__section">
				<div className="work-log-form-ui__section-header">
					<h3>Odometer & charges</h3>
					<p>
						Store the odometer reading at the time of work and capture labour
						and parts costs.
					</p>
				</div>

				<div className="work-log-form-ui__grid">
					<Input
						label="Odometer reading"
						name="odometerValue"
						type="number"
						value={form.odometerValue}
						onChange={handleChange}
						placeholder="186000"
						icon={<Gauge size={18} />}
					/>

					<div className="field">
						<label className="field-label" htmlFor="odometerUnit">
							Odometer unit
						</label>
						<select
							id="odometerUnit"
							name="odometerUnit"
							value={form.odometerUnit}
							onChange={handleChange}
							className="work-log-form-ui__select"
						>
							<option value="KM">KM</option>
							<option value="MI">MI</option>
						</select>
					</div>

					<Input
						label="Labour charge"
						name="labourCharge"
						type="number"
						step="0.01"
						value={form.labourCharge}
						onChange={handleChange}
						placeholder="120.00"
						icon={<BadgeEuro size={18} />}
					/>

					<Input
						label="Parts charge"
						name="partsCharge"
						type="number"
						step="0.01"
						value={form.partsCharge}
						onChange={handleChange}
						placeholder="85.00"
						icon={<BadgeEuro size={18} />}
					/>
				</div>

				<div className="work-log-form-ui__summary">
					<div className="work-log-form-ui__summary-item">
						<p className="work-log-form-ui__summary-label">Total charge</p>
						<h4 className="work-log-form-ui__summary-value">
							{formatCurrency(totalCharge)}
						</h4>
					</div>

					{selectedVehicle ? (
						<div className="work-log-form-ui__summary-item">
							<p className="work-log-form-ui__summary-label">
								Current vehicle odometer
							</p>
							<h4 className="work-log-form-ui__summary-value">
								{formatOdometer(
									selectedVehicle.odometerValue,
									selectedVehicle.odometerUnit,
								)}
							</h4>
						</div>
					) : null}
				</div>
			</div>

			<div className="work-log-form-ui__section">
				<div className="work-log-form-ui__section-header">
					<h3>Next service details</h3>
					<p>
						Optional next-service info. If a vehicle is linked, the next service
						date will also update the vehicle record.
					</p>
				</div>

				<div className="work-log-form-ui__grid">
					<Input
						label="Next service due date"
						name="nextServiceDueAt"
						type="date"
						value={form.nextServiceDueAt}
						onChange={handleChange}
					/>

					<Input
						label="Next service odometer"
						name="nextServiceOdometer"
						type="number"
						value={form.nextServiceOdometer}
						onChange={handleChange}
						placeholder="196000"
					/>

					<div className="field">
						<label className="field-label" htmlFor="nextServiceOdometerUnit">
							Next service odometer unit
						</label>
						<select
							id="nextServiceOdometerUnit"
							name="nextServiceOdometerUnit"
							value={form.nextServiceOdometerUnit}
							onChange={handleChange}
							className="work-log-form-ui__select"
						>
							<option value="KM">KM</option>
							<option value="MI">MI</option>
						</select>
					</div>
				</div>
			</div>

			<div className="work-log-form-ui__section">
				<div className="work-log-form-ui__section-header">
					<h3>Internal notes</h3>
					<p>Add workshop context, customer notes, or extra internal detail.</p>
				</div>

				<div className="field">
					<label className="field-label" htmlFor="notes">
						Notes
					</label>
					<div className="work-log-form-ui__textarea-wrap">
						<div className="work-log-form-ui__textarea-icon">
							<StickyNote size={18} />
						</div>
						<textarea
							id="notes"
							name="notes"
							value={form.notes}
							onChange={handleChange}
							className="work-log-form-ui__textarea"
							placeholder="Add any internal notes about the work log..."
						/>
					</div>
				</div>
			</div>

			{error ? <p className="text-danger">{error}</p> : null}

			<div className="work-log-form-ui__actions">
				<div className="work-log-form-ui__actions-left">
					{mode === "edit" ? (
						<Button
							type="button"
							variant="danger"
							onClick={handleDelete}
							disabled={isPending}
						>
							Delete work log
						</Button>
					) : null}
				</div>

				<div className="work-log-form-ui__actions-right">
					<Button
						type="button"
						variant="secondary"
						onClick={() =>
							router.push(
								mode === "edit" && workLogId
									? `/work-logs/${workLogId}`
									: "/work-logs",
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
						{mode === "edit" ? "Save work log" : "Create work log"}
					</Button>
				</div>
			</div>
		</form>
	);
}
