"use client";

import "./TablePagination.css";

export default function TablePagination({
	currentPage = 1,
	totalPages = 1,
	totalItems = 0,
	itemsPerPage = 10,
	onPageChange,
	label = "items",
}) {
	if (totalItems === 0) return null;

	const start = (currentPage - 1) * itemsPerPage + 1;
	const end = Math.min(currentPage * itemsPerPage, totalItems);

	function goToPage(page) {
		if (page < 1 || page > totalPages || page === currentPage) return;
		onPageChange(page);
	}

	function getPageNumbers() {
		const pages = [];

		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i += 1) {
				pages.push(i);
			}
			return pages;
		}

		pages.push(1);

		if (currentPage > 3) {
			pages.push("start-ellipsis");
		}

		const startPage = Math.max(2, currentPage - 1);
		const endPage = Math.min(totalPages - 1, currentPage + 1);

		for (let i = startPage; i <= endPage; i += 1) {
			pages.push(i);
		}

		if (currentPage < totalPages - 2) {
			pages.push("end-ellipsis");
		}

		pages.push(totalPages);

		return pages;
	}

	return (
		<div className="table-pagination">
			<div className="table-pagination__info">
				Showing <strong>{start}</strong> to <strong>{end}</strong> of{" "}
				<strong>{totalItems}</strong> {label}
			</div>

			<div className="table-pagination__controls">
				<button
					type="button"
					className="table-pagination__button"
					onClick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1}
				>
					Previous
				</button>

				<div className="table-pagination__pages">
					{getPageNumbers().map((page, index) => {
						if (typeof page !== "number") {
							return (
								<span
									key={`${page}-${index}`}
									className="table-pagination__ellipsis"
								>
									…
								</span>
							);
						}

						const isActive = page === currentPage;

						return (
							<button
								key={page}
								type="button"
								className={`table-pagination__page ${isActive ? "table-pagination__page--active" : ""}`}
								onClick={() => goToPage(page)}
								aria-current={isActive ? "page" : undefined}
							>
								{page}
							</button>
						);
					})}
				</div>

				<button
					type="button"
					className="table-pagination__button"
					onClick={() => goToPage(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next
				</button>
			</div>
		</div>
	);
}
