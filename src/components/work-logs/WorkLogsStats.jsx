import {
	Wrench,
	CalendarClock,
	BadgeEuro,
	Package,
	ReceiptText,
} from "lucide-react";
import { formatCurrency } from "@/lib/work-log-utils";

export default function WorkLogsStats({ stats }) {
	const items = [
		{
			key: "totalLogs",
			label: "Total work logs",
			value: stats.totalLogs,
			icon: Wrench,
		},
		{
			key: "logsThisMonth",
			label: "This month",
			value: stats.logsThisMonth,
			icon: CalendarClock,
		},
		{
			key: "labourTotal",
			label: "Labour total",
			value: formatCurrency(stats.labourTotal),
			icon: BadgeEuro,
		},
		{
			key: "partsTotal",
			label: "Parts total",
			value: formatCurrency(stats.partsTotal),
			icon: Package,
		},
		{
			key: "billedTotal",
			label: "Billed total",
			value: formatCurrency(stats.billedTotal),
			icon: ReceiptText,
		},
	];

	return (
		<div className="work-logs-stats-grid">
			{items.map((item) => {
				const Icon = item.icon;

				return (
					<div key={item.key} className="work-logs-stat-card">
						<div className="work-logs-stat-card__top">
							<span className="work-logs-stat-card__icon">
								<Icon size={18} />
							</span>
							<p className="work-logs-stat-card__label">{item.label}</p>
						</div>

						<h3 className="work-logs-stat-card__value">{item.value}</h3>
					</div>
				);
			})}
		</div>
	);
}
