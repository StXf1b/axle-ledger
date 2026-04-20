import { Search, SlidersHorizontal } from "lucide-react";

export default function CustomersTableToolbar({
	search,
	onSearchChange,
	status,
	onStatusChange,
}) {
	return (
		<div className="customers-toolbar">
			<div className="customers-toolbar__left">
				<div className="customers-search">
					<Search size={18} className="customers-search__icon" />
					<input
						type="text"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search customer, company, phone, email, vehicle..."
					/>
				</div>

				<div className="customers-filter">
					<SlidersHorizontal size={16} />
					<select
						value={status}
						onChange={(e) => onStatusChange(e.target.value)}
					>
						<option value="All">All statuses</option>
						<option value="Active">Active</option>
						<option value="Inactive">Inactive</option>
					</select>
				</div>
			</div>

			<div className="customers-toolbar__right">
				<button type="button" className="customers-manage-table">
					Manage table
				</button>
			</div>
		</div>
	);
}
