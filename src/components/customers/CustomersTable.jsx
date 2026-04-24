function getInitials(firstName, lastName, companyName) {
	if (firstName || lastName) {
		return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
	}

	return (companyName?.slice(0, 2) || "CU").toUpperCase();
}

export default function CustomersTable({ customers, onRowClick }) {
	return (
		<div className="customers-table-wrap">
			<table className="customers-table">
				<thead>
					<tr>
						<th>Customer</th>
						<th>Company</th>
						<th>Phone</th>
						<th>Email</th>
						<th>Vehicles</th>
						<th>Preferred contact</th>
						<th>Status</th>
					</tr>
				</thead>

				<tbody>
					{customers.length === 0 ? (
						<tr>
							<td colSpan="7">
								<div className="customers-empty">
									<p className="customers-empty__title">No customers found</p>
									<p className="customers-empty__text">
										Try a different search or add a new customer.
									</p>
								</div>
							</td>
						</tr>
					) : (
						customers.map((customer) => (
							<tr
								key={customer.id}
								className="customers-table__row"
								onClick={() => onRowClick(customer.id)}
								tabIndex={0}
								role="button"
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onRowClick(customer.id);
									}
								}}
							>
								<td>
									<div className="customer-table-person">
										<div className="customer-table-person__avatar">
											{getInitials(
												customer.firstName,
												customer.lastName,
												customer.companyName,
											)}
										</div>

										<div className="customer-table-person__meta">
											<p className="customer-table-person__name">
												{customer.firstName} {customer.lastName}
											</p>
											<p className="customer-table-person__sub">
												{customer.tags.slice(0, 2).join(" • ") || "No tags"}
											</p>
										</div>
									</div>
								</td>

								<td>{customer.companyName || "—"}</td>
								<td>{customer.phone || "—"}</td>
								<td>{customer.email || "—"}</td>
								<td>{customer.vehicles.length}</td>
								<td>{customer.preferredContact || "—"}</td>
								<td>
									<span
										className={`badge ${
											customer.status === "ACTIVE"
												? "badge-success"
												: "badge-neutral"
										}`}
									>
										{customer.status}
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
