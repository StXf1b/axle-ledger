import { FileText, UserRound, CarFront, HardDrive } from "lucide-react";

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
		<div className="content-grid four-col">
			{items.map((item) => {
				const Icon = item.icon;

				return (
					<div key={item.key} className="card">
						<div className="stack-sm">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "10px",
								}}
							>
								<span
									className="badge badge-info"
									style={{ minHeight: 34, padding: "0 10px" }}
								>
									<Icon size={16} />
								</span>
								<p className="text-muted">{item.label}</p>
							</div>

							<h3>{item.value}</h3>
						</div>
					</div>
				);
			})}
		</div>
	);
}
