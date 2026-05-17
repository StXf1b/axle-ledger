"use client";

import Link from "next/link";
import Image from "next/image";
import {
	LayoutDashboard,
	Users,
	CarFront,
	Bell,
	FileText,
	Settings,
	Wrench,
	X,
	Activity,
	PanelLeftClose,
	PanelLeftOpen,
} from "lucide-react";

import styles from "./Sidebar.module.css";

const navGroups = [
	{
		title: "Overview",
		items: [
			{
				label: "Dashboard",
				href: "/dashboard",
				icon: LayoutDashboard,
			},
			{
				label: "Recent Activity",
				href: "/recent-activity",
				icon: Activity,
			},
		],
	},
	{
		title: "Garage",
		items: [
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
				label: "Work Logs",
				href: "/work-logs",
				icon: Wrench,
			},
		],
	},
	{
		title: "Operations",
		items: [
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
		],
	},
	{
		title: "System",
		items: [
			{
				label: "Settings",
				href: "/settings",
				icon: Settings,
			},
		],
	},
];

function isActive(pathname, href) {
	if (href === "/dashboard") return pathname === "/dashboard";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
	pathname,
	collapsed,
	mobileOpen,
	onCloseMobile,
	onToggleCollapse,
}) {
	return (
		<aside
			className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${
				mobileOpen ? styles.mobileOpen : ""
			}`}
			aria-label="Main sidebar"
		>
			<div className={styles.sidebarGlow} />

			<div className={styles.header}>
				<Link href="/dashboard" className={styles.brand}>
					<div className={styles.logoWrap}>
						<Image
							src="/logo.png"
							alt="AxleLedger Logo"
							width={44}
							height={44}
							className={styles.logoImage}
							priority
						/>
					</div>

					{!collapsed && (
						<div className={styles.brandText}>
							<span className={styles.brandTitle}>AxleLedger</span>
							<span className={styles.brandSubtitle}>Garage Dashboard</span>
						</div>
					)}
				</Link>
			</div>

			<nav className={styles.nav}>
				{navGroups.map((group) => (
					<section className={styles.navGroup} key={group.title}>
						{!collapsed && <p className={styles.groupLabel}>{group.title}</p>}

						<div className={styles.groupLinks}>
							{group.items.map((item) => {
								const Icon = item.icon;
								const active = isActive(pathname, item.href);

								return (
									<Link
										key={item.href}
										href={item.href}
										className={`${styles.link} ${active ? styles.active : ""}`}
										title={collapsed ? item.label : ""}
										aria-current={active ? "page" : undefined}
										onClick={onCloseMobile}
									>
										<span className={styles.activeIndicator} />

										<span className={styles.linkIcon}>
											<Icon size={19} strokeWidth={2.1} />
										</span>

										{!collapsed && (
											<span className={styles.linkText}>{item.label}</span>
										)}
									</Link>
								);
							})}
						</div>
					</section>
				))}
			</nav>
		</aside>
	);
}
