"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, FileText, BellRing, CarFront } from "lucide-react";
import "./CustomersNav.css";
const tabs = [
	{
		id: "overview",
		label: "Overview",
		icon: LayoutDashboard,
	},
	{
		id: "vehicles",
		label: `Linked Vehicles`,
		icon: CarFront,
	},
	{
		id: "documents",
		label: "Documents",
		icon: FileText,
	},
	{
		id: "reminders",
		label: "Reminders",
		icon: BellRing,
	},
];
export default function CustomersNav({ total }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const activeTab = useMemo(() => {
		const value = searchParams.get("tab");
		return tabs.some((tab) => tab.id === value) ? value : "overview";
	}, [searchParams]);

	function handleTabChange(tabId) {
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", tabId);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	}

	return (
		<nav className="customers-nav" aria-label="customers sections">
			<div className="customers-nav__inner">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;

					return (
						<button
							key={tab.id}
							type="button"
							className={`customers-nav__tab ${isActive ? "customers-nav__tab--active" : ""}`}
							onClick={() => handleTabChange(tab.id)}
							aria-pressed={isActive}
						>
							<Icon size={16} />
							{tab.label === "Linked Vehicles" && total !== undefined
								? `${tab.label} (${total})`
								: tab.label}
						</button>
					);
				})}
			</div>
		</nav>
	);
}
