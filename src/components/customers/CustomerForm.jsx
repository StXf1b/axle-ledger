"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	User,
	Building2,
	Phone,
	Mail,
	MapPin,
	StickyNote,
	ArrowRight,
} from "lucide-react";
import ConfirmModal from "../ui/ConfirmModal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createCustomer, updateCustomer } from "@/actions/customers";
import "./CustomerForm.css";

const defaultValues = {
	firstName: "",
	lastName: "",
	companyName: "",
	phone: "",
	email: "",
	preferredContact: "PHONE",
	status: "ACTIVE",
	addressLine1: "",
	addressLine2: "",
	city: "",
	county: "",
	country: "Ireland",
	notes: "",
	tags: "",
};

export default function CustomerForm({
	mode = "create",
	initialData = null,
	customerId = null,
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [showErrorModal, setShowErrorModal] = useState(false);

	const [form, setForm] = useState({
		firstName: initialData?.firstName || defaultValues.firstName,
		lastName: initialData?.lastName || defaultValues.lastName,
		companyName: initialData?.companyName || defaultValues.companyName,
		phone: initialData?.phone || defaultValues.phone,
		email: initialData?.email || defaultValues.email,
		preferredContact:
			initialData?.preferredContact || defaultValues.preferredContact,
		status: initialData?.status || defaultValues.status,
		addressLine1: initialData?.addressLine1 || defaultValues.addressLine1,
		addressLine2: initialData?.addressLine2 || defaultValues.addressLine2,
		city: initialData?.city || defaultValues.city,
		county: initialData?.county || defaultValues.county,
		country: initialData?.country || defaultValues.country,
		notes: initialData?.notes || defaultValues.notes,
		tags: Array.isArray(initialData?.tags)
			? initialData.tags.join(", ")
			: defaultValues.tags,
	});

	function handleChange(event) {
		const { name, value } = event.target;

		setForm((prev) => ({
			...prev,
			[name]: value,
		}));

		setError("");
	}

	function handleSubmit(event) {
		event.preventDefault();

		startTransition(async () => {
			try {
				if (mode === "edit" && customerId) {
					const result = await updateCustomer(customerId, form);
					router.push(`/customers/${result.customerId}`);
					router.refresh();
					return;
				}

				const result = await createCustomer(form);
				router.push(`/customers/${result.customerId}`);
				router.refresh();
			} catch (err) {
				setError(err?.message || "Failed to save customer.");
				setShowErrorModal(true);
			}
		});
	}

	return (
		<form className="customer-form-ui" onSubmit={handleSubmit}>
			<div className="customer-form-ui__section">
				<div className="customer-form-ui__section-header">
					<h3>Customer details</h3>
					<p>Basic identity, contact preferences, and customer status.</p>
				</div>

				<div className="customer-form-ui__grid">
					<Input
						label="First name"
						name="firstName"
						value={form.firstName}
						onChange={handleChange}
						placeholder="John"
						icon={<User size={18} />}
						required
					/>

					<Input
						label="Last name"
						name="lastName"
						value={form.lastName}
						onChange={handleChange}
						placeholder="Murphy"
						icon={<User size={18} />}
						required
					/>

					<Input
						label="Company name"
						name="companyName"
						value={form.companyName}
						onChange={handleChange}
						placeholder="Optional business or fleet account"
						icon={<Building2 size={18} />}
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
							className="customer-form-ui__select"
						>
							<option value="ACTIVE">Active</option>
							<option value="INACTIVE">Inactive</option>
						</select>
					</div>

					<Input
						label="Phone number"
						name="phone"
						value={form.phone}
						onChange={handleChange}
						placeholder="+353 87 123 4567"
						icon={<Phone size={18} />}
					/>

					<Input
						label="Email address"
						name="email"
						type="email"
						value={form.email}
						onChange={handleChange}
						placeholder="customer@email.com"
						icon={<Mail size={18} />}
					/>

					<div className="field">
						<label className="field-label" htmlFor="preferredContact">
							Preferred contact
						</label>
						<select
							id="preferredContact"
							name="preferredContact"
							value={form.preferredContact}
							onChange={handleChange}
							className="customer-form-ui__select"
						>
							<option value="PHONE">Phone</option>
							<option value="EMAIL">Email</option>
							<option value="WHATSAPP">WhatsApp</option>
						</select>
					</div>

					<Input
						label="Tags"
						name="tags"
						value={form.tags}
						onChange={handleChange}
						placeholder="Repeat, Fleet, Priority"
						hint="Separate tags with commas"
					/>
				</div>
			</div>

			<div className="customer-form-ui__section">
				<div className="customer-form-ui__section-header">
					<h3>Address</h3>
					<p>Store the main address for this customer record.</p>
				</div>

				<div className="customer-form-ui__grid">
					<Input
						label="Address line 1"
						name="addressLine1"
						value={form.addressLine1}
						onChange={handleChange}
						placeholder="12 Main Street"
						icon={<MapPin size={18} />}
					/>

					<Input
						label="Address line 2"
						name="addressLine2"
						value={form.addressLine2}
						onChange={handleChange}
						placeholder="Optional"
					/>

					<Input
						label="Town / City"
						name="city"
						value={form.city}
						onChange={handleChange}
						placeholder="Cork"
					/>

					<Input
						label="County"
						name="county"
						value={form.county}
						onChange={handleChange}
						placeholder="Co. Cork"
					/>

					<Input
						label="Country"
						name="country"
						value={form.country}
						onChange={handleChange}
						placeholder="Ireland"
					/>
				</div>
			</div>

			<div className="customer-form-ui__section">
				<div className="customer-form-ui__section-header">
					<h3>Internal notes</h3>
					<p>Add workshop notes, service context, or anything important.</p>
				</div>

				<div className="field">
					<label className="field-label" htmlFor="notes">
						Notes
					</label>
					<div className="customer-form-ui__textarea-wrap">
						<div className="customer-form-ui__textarea-icon">
							<StickyNote size={18} />
						</div>

						<textarea
							id="notes"
							name="notes"
							value={form.notes}
							onChange={handleChange}
							className="customer-form-ui__textarea"
							placeholder="Add useful notes about this customer..."
						/>
					</div>
				</div>
			</div>

			<div className="customer-form-ui__actions">
				<Button
					type="button"
					variant="secondary"
					onClick={() =>
						router.push(
							mode === "edit" && customerId
								? `/customers/${customerId}`
								: "/customers",
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
					{mode === "edit" ? "Save customer" : "Create customer"}
				</Button>
			</div>
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
