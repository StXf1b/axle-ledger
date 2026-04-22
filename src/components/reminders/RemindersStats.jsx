import {
	BellRing,
	CircleAlert,
	Clock3,
	CheckCircle2,
	ClipboardList,
} from "lucide-react";

export default function RemindersStats({ stats }) {
	const items = [
		{
			key: "total",
			label: "Total reminders",
			value: stats.total,
			icon: ClipboardList,
		},
		{
			key: "open",
			label: "Open reminders",
			value: stats.open,
			icon: BellRing,
		},
		{
			key: "overdue",
			label: "Overdue",
			value: stats.overdue,
			icon: CircleAlert,
		},
		{
			key: "dueSoon",
			label: "Due soon",
			value: stats.dueSoon,
			icon: Clock3,
		},
		{
			key: "completed",
			label: "Completed",
			value: stats.completed,
			icon: CheckCircle2,
		},
	];

	return (
		<div className="reminders-stats-grid">
			{items.map((item) => {
				const Icon = item.icon;

				return (
					<div key={item.key} className="reminders-stat-card">
						<div className="reminders-stat-card__top">
							<span className="reminders-stat-card__icon">
								<Icon size={18} />
							</span>
							<p className="reminders-stat-card__label">{item.label}</p>
						</div>

						<h3 className="reminders-stat-card__value">{item.value}</h3>
					</div>
				);
			})}
		</div>
	);
}
