import { getVehicleFormData } from "@/lib/queries/vehicles";
import VehicleForm from "@/components/vehicles/VehicleForm";
import "@/components/vehicles/VehicleForm.css";
import "../vehicles.css";

export const metadata = {
	title: "New Vehicle",
};

export default async function NewVehiclePage() {
	const { customers } = await getVehicleFormData();

	return (
		<section className="vehicle-detail-page">
			<div className="vehicle-detail-page__topbar">
				<div>
					<p className="vehicles-page__eyebrow">Vehicle management</p>
					<h2 className="vehicles-page__title">New vehicle</h2>
					<p className="vehicles-page__subtitle">
						Create a vehicle record with ownership, dates, and workshop notes.
					</p>
				</div>
			</div>

			<div className="card" style={{ padding: "20px" }}>
				<VehicleForm mode="create" customers={customers} />
			</div>
		</section>
	);
}
