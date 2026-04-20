import { notFound } from "next/navigation";
import { getVehicleById, getVehicleFormData } from "@/lib/queries/vehicles";
import VehicleForm from "@/components/vehicles/VehicleForm";
import "@/components/vehicles/VehicleForm.css";
import "../../vehicles.css";

export const metadata = {
	title: "Edit Vehicle",
};

export default async function EditVehiclePage({ params }) {
	const { vehicleId } = await params;
	const vehicle = await getVehicleById(vehicleId);
	const { customers } = await getVehicleFormData();

	if (!vehicle) {
		notFound();
	}

	return (
		<section className="vehicle-detail-page">
			<div className="vehicle-detail-page__topbar">
				<div>
					<p className="vehicles-page__eyebrow">Vehicle management</p>
					<h2 className="vehicles-page__title">Edit vehicle</h2>
					<p className="vehicles-page__subtitle">
						Update key vehicle details, ownership, and due dates.
					</p>
				</div>
			</div>

			<div className="card" style={{ padding: "20px" }}>
				<VehicleForm
					mode="edit"
					vehicleId={vehicle.id}
					initialData={vehicle}
					customers={customers}
				/>
			</div>
		</section>
	);
}
