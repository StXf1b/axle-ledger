"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, Wrench, FileText, BellRing } from "lucide-react";
import "./VehicleNav.css";

const tabs = [
	{
		id: "overview",
		label: "Overview",
		icon: LayoutDashboard,
	},
	{
		id: "history",
		label: "Service History",
		icon: Wrench,
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

export default function VehicleNav() {
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
		<nav className="vehicle-nav" aria-label="Vehicle sections">
			<div className="vehicle-nav__inner">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;

					return (
						<button
							key={tab.id}
							type="button"
							className={`vehicle-nav__tab ${isActive ? "vehicle-nav__tab--active" : ""}`}
							onClick={() => handleTabChange(tab.id)}
							aria-pressed={isActive}
						>
							<Icon size={16} />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
