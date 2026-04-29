"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	Pencil,
	Mail,
	Phone,
	MapPin,
	Building2,
	StickyNote,
	CarFront,
	BadgeCheck,
	Plus,
} from "lucide-react";

import Button from "@/components/ui/Button";
import LinkedRemindersCard from "@/components/reminders/LinkedRemindersCard";
import LinkedDocumentsCard from "@/components/documents/LinkedDocumentsCard";
import CustomersNav from "@/components/customers/CustomersNav";

function getInitials(firstName, lastName, companyName) {
	if (firstName || lastName) {
		return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
	}

	return (companyName?.slice(0, 2) || "CU").toUpperCase();
}

export default function CustomerDetailView({ customer }) {
	const searchParams = useSearchParams();

	const createHref = useMemo(() => {
		const params = new URLSearchParams();
		params.set("customerId", customer.id);
		return `/vehicles/new?${params.toString()}`;
	}, [customer.id]);

	const activeTab = useMemo(() => {
		const value = searchParams.get("tab");
		if (["overview", "vehicles", "documents", "reminders"].includes(value)) {
			return value;
		}
		return "overview";
	}, [searchParams]);

	const getTotalVehicles = () => {
		return customer.vehicles ? customer.vehicles.length : 0;
	};

	return (
		<section className="customer-detail-page">
			<div className="customer-detail-page__topbar">
				<Link href="/customers" className="customer-detail-back">
					<ArrowLeft size={16} />
					Back to customers
				</Link>

				<Link href={`/customers/${customer.id}/edit`}>
					<Button variant="secondary" leftIcon={<Pencil size={16} />}>
						Edit customer
					</Button>
				</Link>
			</div>

			<div className="customer-hero card">
				<div className="customer-hero__left">
					<div className="customer-hero__avatar">
						{getInitials(
							customer.firstName,
							customer.lastName,
							customer.companyName,
						)}
					</div>

					<div className="customer-hero__identity">
						<div className="customer-hero__heading">
							<h2>
								{customer.firstName} {customer.lastName}
							</h2>
							<span
								className={`badge ${
									customer.status === "ACTIVE"
										? "badge-success"
										: "badge-neutral"
								}`}
							>
								{customer.status}
							</span>
						</div>

						<p className="customer-hero__sub">
							{customer.companyName ? (
								<>
									<Building2 size={16} />
									{customer.companyName}
								</>
							) : (
								<>
									<BadgeCheck size={16} />
									Private customer
								</>
							)}
						</p>

						<div className="customer-hero__tags">
							{customer.tags.map((tag) => (
								<span key={tag} className="customer-detail-tag">
									{tag}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className="customer-hero__stats">
					<div className="customer-mini-stat">
						<p>Vehicles</p>
						<h4>{customer.vehicles.length}</h4>
					</div>
					<div className="customer-mini-stat">
						<p>Preferred contact</p>
						<h4>{customer.preferredContact}</h4>
					</div>
				</div>
			</div>
			<CustomersNav total={getTotalVehicles()} />
			{activeTab === "overview" && (
				<div className="customer-detail-grid">
					<div className="card stack-md">
						<h3 className="customer-detail-card__title">Contact details</h3>

						<div className="customer-detail-list">
							<div className="customer-detail-list__item">
								<span>
									<Phone size={16} /> Phone
								</span>
								<strong>{customer.phone || "Not added"}</strong>
							</div>

							<div className="customer-detail-list__item">
								<span>
									<Mail size={16} /> Email
								</span>
								<strong>{customer.email || "Not added"}</strong>
							</div>

							<div className="customer-detail-list__item">
								<span>
									<MapPin size={16} /> Address
								</span>
								<strong>
									{[
										customer.addressLine1,
										customer.addressLine2,
										customer.city,
										customer.county,
										customer.country,
									]
										.filter(Boolean)
										.join(", ") || "Not added"}
								</strong>
							</div>
						</div>
					</div>

					<div className="card stack-md">
						<h3 className="customer-detail-card__title">Internal notes</h3>

						<div className="customer-notes-box">
							<div className="customer-notes-box__icon">
								<StickyNote size={18} />
							</div>
							<p>{customer.notes || "No notes added yet."}</p>
						</div>
					</div>
				</div>
			)}

			{activeTab === "vehicles" && (
				<div className="card stack-md">
					<div className="customer-vehicles-header">
						<div className="linked-documents-card__header-left">
							<p className="linked-documents-card__eyebrow">Vehicles</p>
							<h3 className="linked-documents-card__title">
								Customer Vehicles
							</h3>
							<p className="linked-documents-card__subtitle">
								Manage and view all vehicles associated with this customer.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Link href="/vehicles" className="btn btn-secondary btn-sm">
								View all
							</Link>
							<Link href={createHref} className="btn btn-primary btn-sm">
								<Plus size={16} />
								Add vehicle
							</Link>
						</div>
					</div>
					<div className="customer-vehicles-table-wrap">
						<table className="customer-vehicles-table">
							<thead>
								<tr>
									<th>Registration</th>
									<th>Make</th>
									<th>Model</th>
								</tr>
							</thead>
							<tbody>
								{customer.vehicles.slice(0, 10).map((vehicle) => (
									<tr key={vehicle.id}>
										<td>
											<div className="customer-vehicle-reg">
												<CarFront size={16} />
												{vehicle.registration}
											</div>
										</td>
										<td>{vehicle.make}</td>
										<td>{vehicle.model}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
			{activeTab === "documents" && (
				<LinkedDocumentsCard
					title="Customer documents"
					subtitle="Recent files linked to this customer record."
					documents={customer.documents || []}
					customerId={customer.id}
				/>
			)}

			{activeTab === "reminders" && (
				<LinkedRemindersCard
					title="Customer reminders"
					subtitle="Follow-up, service, and compliance reminders linked to this customer."
					reminders={customer.reminders || []}
					customerId={customer.id}
					showVehicle
				/>
			)}
		</section>
	);
}
