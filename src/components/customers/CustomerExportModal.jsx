import { FileJson, FileText, X } from "lucide-react";

import Button from "@/components/ui/Button";
import "./CustomerExportModal.css";

const EXPORT_FORMAT_OPTIONS = [
	{
		value: "pdf",
		label: "PDF",
		description: "Human-readable customer report for sharing or filing.",
		icon: FileText,
	},
	{
		value: "json",
		label: "JSON",
		description: "Complete structured customer data for backups or imports.",
		icon: FileJson,
	},
];

function getCustomerName(customer) {
	if (!customer) return "this customer";

	const fullName = [customer.firstName, customer.lastName]
		.filter(Boolean)
		.join(" ");

	return fullName || customer.companyName || "this customer";
}

export default function CustomerExportModal({
	open,
	customer,
	format,
	onFormatChange,
	onClose,
	onConfirm,
	loading = false,
	error = "",
}) {
	if (!open || !customer) return null;

	return (
		<div
			className="customer-export-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="customer-export-modal-title"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget && !loading) {
					onClose();
				}
			}}
		>
			<div className="customer-export-modal__card">
				<div className="customer-export-modal__header">
					<div>
						<p className="customer-export-modal__eyebrow">Export customer</p>
						<h3 id="customer-export-modal-title">
							Export {getCustomerName(customer)}
						</h3>
						<p>
							Choose the file type to download. Exports are available on the
							Starter plan and above.
						</p>
					</div>

					<button
						type="button"
						className="customer-export-modal__close"
						onClick={onClose}
						disabled={loading}
						aria-label="Close export modal"
					>
						<X size={18} />
					</button>
				</div>

				<div
					className="customer-export-modal__formats"
					role="radiogroup"
					aria-label="Export file type"
				>
					{EXPORT_FORMAT_OPTIONS.map((option) => {
						const Icon = option.icon;
						const selected = format === option.value;

						return (
							<label
								key={option.value}
								className={`customer-export-format ${
									selected ? "customer-export-format--selected" : ""
								}`}
							>
								<input
									type="radio"
									name="customer-export-format"
									value={option.value}
									checked={selected}
									onChange={() => onFormatChange(option.value)}
									disabled={loading}
								/>

								<span className="customer-export-format__icon">
									<Icon size={20} />
								</span>

								<span className="customer-export-format__copy">
									<strong>{option.label}</strong>
									<span>{option.description}</span>
								</span>
							</label>
						);
					})}
				</div>

				{error ? <p className="customer-export-modal__error">{error}</p> : null}

				<div className="customer-export-modal__actions">
					<Button variant="secondary" onClick={onClose} disabled={loading}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={onConfirm}
						loading={loading}
						disabled={loading}
					>
						Export {format.toUpperCase()}
					</Button>
				</div>
			</div>
		</div>
	);
}
