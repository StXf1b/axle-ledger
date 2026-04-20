"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import styles from "./Topbar.module.css";

function getPageTitle(pathname) {
	if (pathname === "/dashboard") return "Dashboard";
	if (pathname === "/customers") return "Customers";
	if (pathname === "/customers/new") return "New Customer";
	if (pathname.includes("/customers/") && pathname.endsWith("/edit"))
		return "Edit Customer";
	if (pathname.startsWith("/customers/")) return "Customer Details";

	if (pathname === "/vehicles") return "Vehicles";
	if (pathname === "/vehicles/new") return "New Vehicle";
	if (pathname.includes("/vehicles/") && pathname.endsWith("/edit"))
		return "Edit Vehicle";
	if (pathname.startsWith("/vehicles/")) return "Vehicle Details";

	if (pathname === "/reminders") return "Reminders";
	if (pathname.startsWith("/reminders/")) return "Reminder Details";

	if (pathname === "/documents") return "Documents";
	if (pathname === "/settings") return "Settings";
	if (pathname.startsWith("/settings/")) return "Settings";

	return "AxleLedger";
}

export default function Topbar({
	pathname,
	collapsed,
	onOpenMobileSidebar,
	onToggleCollapse,
}) {
	const title = getPageTitle(pathname);

	return (
		<header className={styles.topbar}>
			<div className={styles.left}>
				<button
					type="button"
					className={`${styles.iconButton} ${styles.mobileOnly}`}
					onClick={onOpenMobileSidebar}
					aria-label="Open sidebar"
				>
					<Menu size={20} />
				</button>

				<button
					type="button"
					className={`${styles.iconButton} ${styles.desktopOnly}`}
					onClick={onToggleCollapse}
					aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{collapsed ? (
						<PanelLeftOpen size={18} />
					) : (
						<PanelLeftClose size={18} />
					)}
				</button>

				<div className={styles.titleWrap}>
					<h1 className={styles.title}>{title}</h1>
					<p className={styles.subtitle}>
						Manage your records and daily workflow
					</p>
				</div>
			</div>

			<div className={styles.right}>
				<div className={styles.userButtonWrap}>
					<UserButton
						// Change later to marketing page
						afterSignOutUrl="/sign-in"
						appearance={{
							elements: {
								avatarBox: {
									width: "40px",
									height: "40px",
								},
							},
						}}
					/>
				</div>
			</div>
		</header>
	);
}
