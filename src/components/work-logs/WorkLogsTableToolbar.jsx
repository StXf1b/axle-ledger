"use client";

import { Search, SlidersHorizontal } from "lucide-react";

export default function WorkLogsTableToolbar({
	search,
	onSearchChange,
	performedBy,
	onPerformedByChange,
	staffOptions = [],
}) {
	return (
		<div className="work-logs-toolbar">
			<div className="work-logs-toolbar__left">
				<div className="work-logs-search">
					<Search size={18} className="work-logs-search__icon" />
					<input
						type="text"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search vehicle, customer, title, notes, staff..."
					/>
				</div>
			</div>

			<div className="work-logs-toolbar__right">
				<div className="work-logs-filter">
					<SlidersHorizontal size={16} />
					<select
						value={performedBy}
						onChange={(e) => onPerformedByChange(e.target.value)}
					>
						<option value="All">All staff</option>
						{staffOptions.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}
