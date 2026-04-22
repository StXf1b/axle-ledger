"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import LinkedRemindersCard from "@/components/reminders/LinkedRemindersCard";
import LinkedDocumentsCard from "@/components/documents/LinkedDocumentsCard";
import ServiceHistoryCard from "@/components/work-logs/ServiceHistoryCard";
import VehicleNav from "@/components/vehicles/VehicleNav";

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
	return new Date(value).toLocaleDateString("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatOdometer(value, unit) {
	if (value == null) return "—";
	return `${Number(value).toLocaleString()} ${unit || ""}`.trim();
}

function OverviewPanel({ vehicle }) {
	return (
		<div className="vehicle-detail-panels stack-lg">
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
		</div>
	);
}

export default function VehicleDetailView({ vehicle }) {
	const searchParams = useSearchParams();

	const activeTab = useMemo(() => {
		const value = searchParams.get("tab");
		if (["overview", "history", "documents", "reminders"].includes(value)) {
			return value;
		}
		return "overview";
	}, [searchParams]);

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
							{formatOdometer(vehicle.odometerValue, vehicle.odometerUnit)}
						</h4>
					</div>

					<div className="vehicle-mini-stat">
						<p>Customer</p>
						<h4>{formatCustomer(vehicle.customer)}</h4>
					</div>
				</div>
			</div>

			<VehicleNav />

			<div className="vehicle-detail-content">
				{activeTab === "overview" && <OverviewPanel vehicle={vehicle} />}

				{activeTab === "history" && (
					<ServiceHistoryCard
						workLogs={vehicle.workLogs || []}
						vehicleId={vehicle.id}
						customerId={vehicle.customer?.id || null}
					/>
				)}

				{activeTab === "documents" && (
					<LinkedDocumentsCard
						title="Vehicle documents"
						subtitle="Recent files linked to this vehicle record."
						documents={vehicle.documents || []}
						customerId={vehicle.customer?.id || null}
						vehicleId={vehicle.id}
					/>
				)}

				{activeTab === "reminders" && (
					<LinkedRemindersCard
						title="Service & vehicle reminders"
						subtitle="Track service, tax, insurance, NCT, and follow-up reminders for this vehicle."
						reminders={vehicle.reminders || []}
						customerId={vehicle.customer?.id || null}
						vehicleId={vehicle.id}
						showCustomer
					/>
				)}
			</div>
		</section>
	);
}
