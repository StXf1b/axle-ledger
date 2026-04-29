"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	CarFront,
	UserRound,
	Hash,
	CalendarDays,
	Gauge,
	ArrowRight,
	StickyNote,
} from "lucide-react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
	createVehicle,
	updateVehicle,
	softDeleteVehicle,
	getVehicleByNumberPlate,
} from "@/actions/vehicles";

import ConfirmModal from "@/components/ui/ConfirmModal";

import "./VehicleForm.css";

export default function VehicleForm({
	mode = "create",
	initialData = null,
	vehicleId = null,
	customers = [],
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [showConfirm, setShowConfirm] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showErrorModal, setShowErrorModal] = useState(false);

	const [form, setForm] = useState({
		registration: initialData?.registration || "",
		vin: initialData?.vin || "",
		make: initialData?.make || "",
		model: initialData?.model || "",
		year: initialData?.year?.toString() || "",
		odometerValue: initialData?.odometerValue?.toString() || "",
		odometerUnit: initialData?.odometerUnit || "KM",
		fuelType: initialData?.fuelType || "",
		colour: initialData?.colour || "",
		status: initialData?.status || "ACTIVE",
		customerId: initialData?.customerId || "",
		taxDueAt: initialData?.taxDueAt
			? new Date(initialData.taxDueAt).toISOString().slice(0, 10)
			: "",
		insuranceDueAt: initialData?.insuranceDueAt
			? new Date(initialData.insuranceDueAt).toISOString().slice(0, 10)
			: "",
		nctDueAt: initialData?.nctDueAt
			? new Date(initialData.nctDueAt).toISOString().slice(0, 10)
			: "",
		serviceDueAt: initialData?.serviceDueAt
			? new Date(initialData.serviceDueAt).toISOString().slice(0, 10)
			: "",
		notes: initialData?.notes || "",
	});

	function handleChange(event) {
		const { name, value } = event.target;
		setForm((prev) => ({ ...prev, [name]: value }));
		setError("");
	}
	async function submitVehicle() {
		try {
			if (mode === "edit" && vehicleId) {
				const result = await updateVehicle(vehicleId, form);
				router.push(`/vehicles/${result.vehicleId}`);
				router.refresh();
				return;
			}

			const result = await createVehicle(form);
			router.push(`/vehicles/${result.vehicleId}`);
			router.refresh();
		} catch (err) {
			setError(err?.message || "Failed to save vehicle.");
			setShowErrorModal(true);
		}
	}

	function handleSubmit(event) {
		event.preventDefault();

		startTransition(async () => {
			if (mode === "create") {
				try {
					const existing = await getVehicleByNumberPlate(form.registration);

					if (existing) {
						setShowConfirm(true);
						return;
					}
				} catch (err) {
					setError(err?.message || "Failed to check registration.");
					setShowErrorModal(true);
					return;
				}
			}

			await submitVehicle();
		});
	}

	function handleDelete() {
		if (!vehicleId) return;

		startTransition(async () => {
			try {
				await softDeleteVehicle(vehicleId);
				router.push("/vehicles");
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to delete vehicle.");
				setShowErrorModal(true);
			}
		});
	}

	return (
		<form className="vehicle-form-ui" onSubmit={handleSubmit}>
			<div className="vehicle-form-ui__section">
				<div className="vehicle-form-ui__section-header">
					<h3>Vehicle details</h3>
					<p>Core registration, make, model, and ownership details.</p>
				</div>

				<div className="vehicle-form-ui__grid">
					<Input
						label="Registration"
						name="registration"
						value={form.registration}
						onChange={handleChange}
						placeholder="12-C-48321"
						icon={<Hash size={18} />}
						required
					/>

					<Input
						label="VIN"
						name="vin"
						value={form.vin}
						onChange={handleChange}
						placeholder="Optional VIN"
						icon={<Hash size={18} />}
					/>

					<Input
						label="Make"
						name="make"
						value={form.make}
						onChange={handleChange}
						placeholder="BMW"
						icon={<CarFront size={18} />}
						required
					/>

					<Input
						label="Model"
						name="model"
						value={form.model}
						onChange={handleChange}
						placeholder="520d"
						icon={<CarFront size={18} />}
						required
					/>

					<Input
						label="Year"
						name="year"
						value={form.year}
						onChange={handleChange}
						placeholder="2012"
						icon={<CalendarDays size={18} />}
					/>

					<Input
						label="Odometer reading"
						name="odometerValue"
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
							className="vehicle-form-ui__select"
						>
							<option value="KM">KM</option>
							<option value="MI">Miles</option>
						</select>
					</div>

					<Input
						label="Fuel type"
						name="fuelType"
						value={form.fuelType}
						onChange={handleChange}
						placeholder="Diesel"
					/>

					<Input
						label="Colour"
						name="colour"
						value={form.colour}
						onChange={handleChange}
						placeholder="Black"
					/>

					<div className="field">
						<label className="field-label" htmlFor="status">
							Status
						</label>
						<select
							id="status"
							name="status"
							value={form.status}
							onChange={handleChange}
							className="vehicle-form-ui__select"
						>
							<option value="ACTIVE">Active</option>
							<option value="SOLD">Sold</option>
							<option value="ARCHIVED">Archived</option>
						</select>
					</div>

					<div className="field">
						<label className="field-label" htmlFor="customerId">
							Linked customer
						</label>
						<div className="vehicle-form-ui__select-wrap">
							<UserRound size={18} className="vehicle-form-ui__select-icon" />
							<select
								id="customerId"
								name="customerId"
								value={form.customerId}
								onChange={handleChange}
								className="vehicle-form-ui__select vehicle-form-ui__select--icon"
							>
								<option value="">No customer linked</option>
								{customers.map((customer) => (
									<option key={customer.id} value={customer.id}>
										{customer.companyName
											? customer.companyName
											: `${customer.firstName} ${customer.lastName}`}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>

			<div className="vehicle-form-ui__section">
				<div className="vehicle-form-ui__section-header">
					<h3>Key dates</h3>
					<p>Track important due dates that will later power reminders.</p>
				</div>

				<div className="vehicle-form-ui__grid">
					<Input
						label="Tax due"
						name="taxDueAt"
						type="date"
						value={form.taxDueAt}
						onChange={handleChange}
					/>
					<Input
						label="Insurance due"
						name="insuranceDueAt"
						type="date"
						value={form.insuranceDueAt}
						onChange={handleChange}
					/>
					<Input
						label="NCT due"
						name="nctDueAt"
						type="date"
						value={form.nctDueAt}
						onChange={handleChange}
					/>
					<Input
						label="Service due"
						name="serviceDueAt"
						type="date"
						value={form.serviceDueAt}
						onChange={handleChange}
					/>
				</div>
			</div>

			<div className="vehicle-form-ui__section">
				<div className="vehicle-form-ui__section-header">
					<h3>Internal notes</h3>
					<p>
						Add service context, condition notes, or anything worth keeping.
					</p>
				</div>

				<div className="field">
					<label className="field-label" htmlFor="notes">
						Notes
					</label>
					<div className="vehicle-form-ui__textarea-wrap">
						<div className="vehicle-form-ui__textarea-icon">
							<StickyNote size={18} />
						</div>

						<textarea
							id="notes"
							name="notes"
							value={form.notes}
							onChange={handleChange}
							className="vehicle-form-ui__textarea"
							placeholder="Add useful notes about this vehicle..."
						/>
					</div>
				</div>
			</div>

			<div className="vehicle-form-ui__actions">
				<div className="vehicle-form-ui__actions-left">
					{mode === "edit" ? (
						<Button
							type="button"
							variant="danger"
							onClick={() => setShowDeleteConfirm(true)}
							disabled={isPending}
						>
							Delete vehicle
						</Button>
					) : null}
				</div>

				<div className="vehicle-form-ui__actions-right">
					<Button
						type="button"
						variant="secondary"
						onClick={() =>
							router.push(
								mode === "edit" && vehicleId
									? `/vehicles/${vehicleId}`
									: "/vehicles",
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
						{mode === "edit" ? "Save vehicle" : "Create vehicle"}
					</Button>
				</div>
			</div>
			{/* Confirmation modal for duplicate registration */}
			<ConfirmModal
				open={showConfirm}
				title="Vehicle already exists"
				description={`A vehicle with registration ${form.registration} already exists. Do you want to create a new one anyway?`}
				confirmText="Submit anyway"
				cancelText="Go back"
				onConfirm={() => {
					setShowConfirm(false);

					startTransition(async () => {
						await submitVehicle();
					});
				}}
				onClose={() => setShowConfirm(false)}
			/>
			<ConfirmModal
				open={showDeleteConfirm}
				title="Confirm deletion"
				description="Are you sure you want to delete this vehicle? This action cannot be undone."
				confirmText="Yes, delete"
				cancelText="Cancel"
				danger
				onConfirm={() => {
					setShowDeleteConfirm(false);
					handleDelete();
				}}
				onClose={() => setShowDeleteConfirm(false)}
			/>
			<ConfirmModal
				open={showErrorModal}
				title="Error"
				description={error}
				confirmText="OK"
				onConfirm={() => setShowErrorModal(false)}
				onClose={() => setShowErrorModal(false)}
			/>
		</form>
	);
}
