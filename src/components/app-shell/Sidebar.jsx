"use client";

import Link from "next/link";
import {
	LayoutDashboard,
	Users,
	CarFront,
	Bell,
	FileText,
	Settings,
	Wrench,
	X,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import Image from "next/image";

const navItems = [
	{
		label: "Dashboard",
		href: "/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "Customers",
		href: "/customers",
		icon: Users,
	},
	{
		label: "Vehicles",
		href: "/vehicles",
		icon: CarFront,
	},
	{
		label: "Reminders",
		href: "/reminders",
		icon: Bell,
	},
	{
		label: "Documents",
		href: "/documents",
		icon: FileText,
	},
	{
		label: "Work Logs",
		href: "/work-logs",
		icon: Wrench,
	},
	{
		label: "Settings",
		href: "/settings",
		icon: Settings,
	},
];

function isActive(pathname, href) {
	if (href === "/dashboard") return pathname === "/dashboard";
	return pathname.startsWith(href);
}

export default function Sidebar({
	pathname,
	collapsed,
	mobileOpen,
	onCloseMobile,
	onToggleCollapse,
}) {
	return (
		<>
			<aside
				className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${
					mobileOpen ? styles.mobileOpen : ""
				}`}
			>
				<div className={styles.header}>
					<Link href="/dashboard" className={styles.brand}>
						<div>
							<Image
								src="/logo.png"
								alt="AxleLedger Logo"
								width={50}
								height={50}
							/>
						</div>

						{!collapsed && (
							<div className={styles.brandText}>
								<span className={styles.brandTitle}>AxleLedger</span>
								<span className={styles.brandSubtitle}>Dashboard</span>
							</div>
						)}
					</Link>

					<div className={styles.headerActions}>
						<button
							type="button"
							className={styles.iconButtonMobile}
							onClick={onCloseMobile}
							aria-label="Close sidebar"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				<nav className={styles.nav}>
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = isActive(pathname, item.href);

						return (
							<Link
								key={item.href}
								href={item.href}
								className={`${styles.link} ${active ? styles.active : ""}`}
								title={collapsed ? item.label : ""}
							>
								<span className={styles.linkIcon}>
									<Icon size={20} />
								</span>

								{!collapsed && (
									<span className={styles.linkText}>{item.label}</span>
								)}
							</Link>
						);
					})}
				</nav>
			</aside>
		</>
	);
}
