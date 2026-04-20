import Link from "next/link";
import {
	ArrowLeft,
	Pencil,
	CarFront,
	UserRound,
	CalendarDays,
	Gauge,
	StickyNote,
} from "lucide-react";
import Button from "@/components/ui/Button";

function formatCustomer(customer) {
	if (!customer) return "Not linked";
	if (customer.companyName) return customer.companyName;
	return (
		`${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
		"Not linked"
	);
}

function formatDate(value) {
	if (!value) return "Not set";
	return new Date(value).toLocaleDateString();
}

export default function VehicleDetailView({ vehicle }) {
	return (
		<section className="vehicle-detail-page">
			<div className="vehicle-detail-page__topbar">
				<Link href="/vehicles" className="vehicle-detail-back">
					<ArrowLeft size={16} />
					Back to vehicles
				</Link>

				<Link href={`/vehicles/${vehicle.id}/edit`}>
					<Button variant="secondary" leftIcon={<Pencil size={16} />}>
						Edit vehicle
					</Button>
				</Link>
			</div>

			<div className="vehicle-hero card">
				<div className="vehicle-hero__left">
					<div className="vehicle-hero__avatar">
						<CarFront size={28} />
					</div>

					<div className="vehicle-hero__identity">
						<div className="vehicle-hero__heading">
							<h2>{vehicle.registration}</h2>
							<span
								className={`badge ${
									vehicle.status === "ACTIVE"
										? "badge-success"
										: vehicle.status === "SOLD"
											? "badge-warning"
											: "badge-neutral"
								}`}
							>
								{vehicle.status === "ACTIVE"
									? "Active"
									: vehicle.status === "SOLD"
										? "Sold"
										: "Archived"}
							</span>
						</div>

						<p className="vehicle-hero__sub">
							{vehicle.make} {vehicle.model}
							{vehicle.year ? ` (${vehicle.year})` : ""}
						</p>
					</div>
				</div>

				<div className="vehicle-hero__stats">
					<div className="vehicle-mini-stat">
						<p>Odometer</p>
						<h4>
							{vehicle.odometerValue != null
								? `${vehicle.odometerValue.toLocaleString()} ${vehicle.odometerUnit}`
								: "—"}
						</h4>
					</div>
					<div className="vehicle-mini-stat">
						<p>Customer</p>
						<h4>{formatCustomer(vehicle.customer)}</h4>
					</div>
				</div>
			</div>

			<div className="vehicle-detail-grid">
				<div className="card stack-md">
					<h3 className="vehicle-detail-card__title">Vehicle information</h3>

					<div className="vehicle-detail-list">
						<div className="vehicle-detail-list__item">
							<span>
								<CarFront size={16} /> Registration
							</span>
							<strong>{vehicle.registration}</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<CarFront size={16} /> Make / Model
							</span>
							<strong>
								{vehicle.make} {vehicle.model}
							</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<Gauge size={16} /> Odometer
							</span>
							<strong>
								{vehicle.odometerValue != null
									? `${vehicle.odometerValue.toLocaleString()} ${vehicle.odometerUnit}`
									: "Not added"}
							</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<UserRound size={16} /> Linked customer
							</span>
							<strong>{formatCustomer(vehicle.customer)}</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<CarFront size={16} /> VIN
							</span>
							<strong>{vehicle.vin || "Not added"}</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<CarFront size={16} /> Fuel / Colour
							</span>
							<strong>
								{[vehicle.fuelType, vehicle.colour]
									.filter(Boolean)
									.join(" • ") || "Not added"}
							</strong>
						</div>
					</div>
				</div>

				<div className="card stack-md">
					<h3 className="vehicle-detail-card__title">Key dates</h3>

					<div className="vehicle-detail-list">
						<div className="vehicle-detail-list__item">
							<span>
								<CalendarDays size={16} /> Tax due
							</span>
							<strong>{formatDate(vehicle.taxDueAt)}</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<CalendarDays size={16} /> Insurance due
							</span>
							<strong>{formatDate(vehicle.insuranceDueAt)}</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<CalendarDays size={16} /> NCT due
							</span>
							<strong>{formatDate(vehicle.nctDueAt)}</strong>
						</div>

						<div className="vehicle-detail-list__item">
							<span>
								<CalendarDays size={16} /> Service due
							</span>
							<strong>{formatDate(vehicle.serviceDueAt)}</strong>
						</div>
					</div>
				</div>
			</div>

			<div className="card stack-md">
				<h3 className="vehicle-detail-card__title">Internal notes</h3>

				<div className="vehicle-notes-box">
					<div className="vehicle-notes-box__icon">
						<StickyNote size={18} />
					</div>
					<p>{vehicle.notes || "No notes added yet."}</p>
				</div>
			</div>
		</section>
	);
}
