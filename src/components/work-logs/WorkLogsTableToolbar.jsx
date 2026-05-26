"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

export default function WorkLogsTableToolbar({
	initialSearch = "",
	onSearchSubmit,
	onClearSearch,
	performedBy,
	onPerformedByChange,
	staffOptions = [],
	isPending = false,
}) {
	const [searchInput, setSearchInput] = useState(initialSearch);

	function handleSubmit(event) {
		event.preventDefault();
		onSearchSubmit(searchInput.trim());
	}

	function handleClearSearch() {
		setSearchInput("");
		onClearSearch();
	}

	return (
		<div className="work-logs-toolbar">
			<div className="work-logs-toolbar__left">
				<form className="work-logs-search" onSubmit={handleSubmit}>
					<Search size={18} className="work-logs-search__icon" />
					<input
						type="text"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						placeholder="Search..."
					/>

					{searchInput ? (
						<button
							type="button"
							className="work-logs-search__clear"
							onClick={handleClearSearch}
							aria-label="Clear search"
						>
							<X size={16} />
						</button>
					) : null}

					<button
						type="submit"
						className="work-logs-search__submit"
						disabled={isPending}
					>
						Search
					</button>
				</form>
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
