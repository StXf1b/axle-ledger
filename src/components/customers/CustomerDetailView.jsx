import Link from "next/link";
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
} from "lucide-react";
import Button from "@/components/ui/Button";

function getInitials(firstName, lastName, companyName) {
	if (firstName || lastName) {
		return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
	}

	return (companyName?.slice(0, 2) || "CU").toUpperCase();
}

export default function CustomerDetailView({ customer }) {
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
					<div className="customer-mini-stat">
						<p>Last activity</p>
						<h4>{new Date(customer.lastActivity).toLocaleDateString()}</h4>
					</div>
				</div>
			</div>

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

			<div className="card stack-md">
				<h3 className="customer-detail-card__title">Linked vehicles</h3>

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
							{customer.vehicles.map((vehicle) => (
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
		</section>
	);
}
