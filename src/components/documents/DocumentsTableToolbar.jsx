"use client";

import { Search } from "lucide-react";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/document-utils";

export default function DocumentsTableToolbar({
	search,
	onSearchChange,
	category,
	onCategoryChange,
	linkedTo,
	onLinkedToChange,
}) {
	return (
		<div className="toolbar">
			<div className="toolbar-group" style={{ flex: 1 }}>
				<div className="searchbar" style={{ flex: 1, minWidth: "280px" }}>
					<Search size={18} />
					<input
						type="text"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search title, file name, customer, vehicle, notes..."
					/>
				</div>
			</div>

			<div className="toolbar-group">
				<select
					className="select"
					value={category}
					onChange={(e) => onCategoryChange(e.target.value)}
					style={{ minWidth: "180px" }}
				>
					<option value="All">All categories</option>
					{DOCUMENT_CATEGORY_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>

				<select
					className="select"
					value={linkedTo}
					onChange={(e) => onLinkedToChange(e.target.value)}
					style={{ minWidth: "180px" }}
				>
					<option value="All">All links</option>
					<option value="CUSTOMER">Customer linked</option>
					<option value="VEHICLE">Vehicle linked</option>
					<option value="UNLINKED">Unlinked</option>
				</select>
			</div>
		</div>
	);
}
