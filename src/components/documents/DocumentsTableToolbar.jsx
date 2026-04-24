"use client";
import "./DocumentsTableToolbar.css";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/document-utils";

export default function DocumentsTableToolbar({
	search,
	onSearchChange,
	onSearchSubmit,
	onClearSearch,
	category,
	onCategoryChange,
	linkedTo,
	onLinkedToChange,
	isPending = false,
}) {
	return (
		<div className="documents-toolbar">
			<div className="documents-toolbar__left">
				<form className="documents-search" onSubmit={onSearchSubmit}>
					<Search size={18} className="documents-search__icon" />
					<input
						type="text"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search..."
					/>

					{search ? (
						<button
							type="button"
							className="documents-search__clear"
							onClick={onClearSearch}
							aria-label="Clear search"
						>
							<X size={16} />
						</button>
					) : null}

					<button
						type="submit"
						className="documents-search__submit"
						disabled={isPending}
					>
						Search
					</button>
				</form>
			</div>

			<div className="documents-toolbar__right">
				<div className="documents-filter">
					<SlidersHorizontal size={16} />
					<select
						value={category}
						onChange={(e) => onCategoryChange(e.target.value)}
					>
						<option value="All">All categories</option>
						{DOCUMENT_CATEGORY_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				<div className="documents-filter">
					<SlidersHorizontal size={16} />
					<select
						value={linkedTo}
						onChange={(e) => onLinkedToChange(e.target.value)}
					>
						<option value="All">All links</option>
						<option value="CUSTOMER">Linked to customer</option>
						<option value="VEHICLE">Linked to vehicle</option>
						<option value="UNLINKED">Unlinked</option>
					</select>
				</div>
			</div>
		</div>
	);
}
