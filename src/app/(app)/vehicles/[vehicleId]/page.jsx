import { notFound } from "next/navigation";
import "../vehicles.css";
import { getVehicleById } from "@/lib/queries/vehicles";
import VehicleDetailView from "@/components/vehicles/VehicleDetailView";

function serializeVehicleForClient(vehicle) {
	if (!vehicle) return null;

	return {
		...vehicle,
		taxDueAt: vehicle.taxDueAt?.toISOString() || null,
		insuranceDueAt: vehicle.insuranceDueAt?.toISOString() || null,
		nctDueAt: vehicle.nctDueAt?.toISOString() || null,
		serviceDueAt: vehicle.serviceDueAt?.toISOString() || null,
		createdAt: vehicle.createdAt?.toISOString() || null,
		updatedAt: vehicle.updatedAt?.toISOString() || null,

		reminders: (vehicle.reminders || []).map((reminder) => ({
			...reminder,
			dueAt: reminder.dueAt?.toISOString() || null,
			completedAt: reminder.completedAt?.toISOString() || null,
			createdAt: reminder.createdAt?.toISOString() || null,
			updatedAt: reminder.updatedAt?.toISOString() || null,
		})),

		documents: (vehicle.documents || []).map((document) => ({
			...document,
			createdAt: document.createdAt?.toISOString() || null,
		})),

		workLogs: (vehicle.workLogs || []).map((log) => ({
			...log,
			completedAt: log.completedAt?.toISOString() || null,
			nextServiceDueAt: log.nextServiceDueAt?.toISOString() || null,
			createdAt: log.createdAt?.toISOString() || null,
			updatedAt: log.updatedAt?.toISOString() || null,
			labourCharge: log.labourCharge?.toString() || "0",
			partsCharge: log.partsCharge?.toString() || "0",
			totalCharge: log.totalCharge?.toString() || "0",
		})),
	};
}

export default async function VehicleDetailPage({ params }) {
	const { vehicleId } = await params;
	const vehicle = await getVehicleById(vehicleId);

	if (!vehicle) {
		notFound();
	}

	const serializedVehicle = serializeVehicleForClient(vehicle);

	return <VehicleDetailView vehicle={serializedVehicle} />;
}
