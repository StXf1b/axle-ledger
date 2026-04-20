import { notFound } from "next/navigation";
import "../vehicles.css";
import VehicleDetailView from "@/components/vehicles/VehicleDetailView";
import { getVehicleById } from "@/lib/queries/vehicles";

export default async function VehicleDetailPage({ params }) {
	const { vehicleId } = await params;
	const vehicle = await getVehicleById(vehicleId);

	if (!vehicle) {
		notFound();
	}

	return <VehicleDetailView vehicle={vehicle} />;
}
