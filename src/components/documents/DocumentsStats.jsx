import { FileText, UserRound, CarFront, HardDrive } from "lucide-react";
import "./DocumentsStats.css";

export default function DocumentsStats({ stats }) {
	const items = [
		{
			key: "totalDocuments",
			label: "Total documents",
			value: stats.totalDocuments,
			icon: FileText,
		},
		{
			key: "customerLinked",
			label: "Linked to customers",
			value: stats.customerLinked,
			icon: UserRound,
		},
		{
			key: "vehicleLinked",
			label: "Linked to vehicles",
			value: stats.vehicleLinked,
			icon: CarFront,
		},
		{
			key: "totalStorage",
			label: "Stored file size",
			value: stats.totalStorageFormatted,
			icon: HardDrive,
		},
	];

	return (
		<div className="documents-stats-grid">
			{items.map((item) => {
				const Icon = item.icon;

				return (
					<div key={item.key} className="documents-stat-card">
						<div className="documents-stat-card__top">
							<span className="documents-stat-card__icon">
								<Icon size={18} />
							</span>

							<p className="documents-stat-card__label">{item.label}</p>
						</div>

						<h3 className="documents-stat-card__value">{item.value}</h3>
					</div>
				);
			})}
		</div>
	);
}
