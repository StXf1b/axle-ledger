import { formatDateShort } from "@/lib/date-formatters";

function formatCustomer(customer) {
	if (!customer) return "—";
	if (customer.companyName) return customer.companyName;
	return `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "—";
}

export default function VehiclesTable({ vehicles, onRowClick }) {
	return (
		<div className="vehicles-table-wrap">
			<table className="vehicles-table">
				<thead>
					<tr>
						<th>Registration</th>
						<th>Vehicle</th>
						<th>Customer</th>
						<th>Odometer</th>
						<th>Service due</th>
						<th>Status</th>
					</tr>
				</thead>

				<tbody>
					{vehicles.length === 0 ? (
						<tr>
							<td colSpan="6">
								<div className="vehicles-empty">
									<p className="vehicles-empty__title">No vehicles found</p>
									<p className="vehicles-empty__text">
										Try a different search or create a new vehicle.
									</p>
								</div>
							</td>
						</tr>
					) : (
						vehicles.map((vehicle) => (
							<tr
								key={vehicle.id}
								className="vehicles-table__row"
								onClick={() => onRowClick(vehicle.id)}
								tabIndex={0}
								role="button"
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onRowClick(vehicle.id);
									}
								}}
							>
								<td className="vehicle-reg-cell">{vehicle.registration}</td>
								<td>
									{vehicle.make} {vehicle.model}
									{vehicle.year ? ` (${vehicle.year})` : ""}
								</td>
								<td>{formatCustomer(vehicle.customer)}</td>
								<td>
									{vehicle.odometerValue != null
										? `${vehicle.odometerValue.toLocaleString()} ${vehicle.odometerUnit}`
										: "—"}
								</td>
								<td>{formatDateShort(vehicle.serviceDueAt)}</td>
								<td>
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
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
