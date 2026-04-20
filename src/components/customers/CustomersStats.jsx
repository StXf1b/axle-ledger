import { Users, BadgeCheck, Building2, CarFront } from "lucide-react";

export default function CustomersStats({ stats }) {
	const cards = [
		{
			label: "Total customers",
			value: stats.totalCustomers,
			icon: Users,
		},
		{
			label: "Active customers",
			value: stats.activeCustomers,
			icon: BadgeCheck,
		},
		{
			label: "Business accounts",
			value: stats.businessCustomers,
			icon: Building2,
		},
		{
			label: "Linked vehicles",
			value: stats.linkedVehicles,
			icon: CarFront,
		},
	];

	return (
		<div className="customers-stats-grid">
			{cards.map((card) => {
				const Icon = card.icon;

				return (
					<div className="customers-stat-card" key={card.label}>
						<div className="customers-stat-card__top">
							<span className="customers-stat-card__icon">
								<Icon size={18} />
							</span>
							<p className="customers-stat-card__label">{card.label}</p>
						</div>
						<h3 className="customers-stat-card__value">{card.value}</h3>
					</div>
				);
			})}
		</div>
	);
}
