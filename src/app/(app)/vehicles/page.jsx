import "./vehicles.css";
import VehiclesPageClient from "./VehiclesPageClient";
import { getVehiclesList } from "@/lib/queries/vehicles";

export const metadata = {
	title: "Vehicles",
};

export default async function VehiclesPage() {
	const vehicles = await getVehiclesList();
	return <VehiclesPageClient initialVehicles={vehicles} />;
}
