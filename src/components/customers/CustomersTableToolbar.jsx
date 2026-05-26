"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

export default function CustomersTableToolbar({
	initialSearch,
	onSearchSubmit,
	onClearSearch,
	status,
	onStatusChange,
	isPending = false,
}) {
	const [searchInput, setSearchInput] = useState(initialSearch);

	function handleSearchSubmit(event) {
		event.preventDefault();
		onSearchSubmit(searchInput.trim());
	}

	function handleClearSearch() {
		setSearchInput("");
		onClearSearch();
	}

	return (
		<div className="customers-toolbar">
			<div className="customers-toolbar__left">
				<form className="customers-search" onSubmit={handleSearchSubmit}>
					<Search size={18} className="customers-search__icon" />
					<input
						type="text"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						placeholder="Search..."
					/>

					{searchInput ? (
						<button
							type="button"
							className="customers-search__clear"
							onClick={handleClearSearch}
							aria-label="Clear search"
						>
							<X size={16} />
						</button>
					) : null}

					<button
						type="submit"
						className="customers-search__submit"
						disabled={isPending}
					>
						Search
					</button>
				</form>

				<div className="customers-filter">
					<SlidersHorizontal size={16} />
					<select
						value={status}
						onChange={(e) => onStatusChange(e.target.value)}
					>
						<option value="All">All statuses</option>
						<option value="ACTIVE">Active</option>
						<option value="INACTIVE">Inactive</option>
					</select>
				</div>
			</div>
		</div>
	);
}
