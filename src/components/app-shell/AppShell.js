"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import styles from "./AppShell.module.css";

export default function AppShell({ children }) {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		const saved = window.localStorage.getItem("axleledger:sidebar-collapsed");
		if (saved === "true") {
			setCollapsed(true);
		}
	}, []);

	useEffect(() => {
		window.localStorage.setItem(
			"axleledger:sidebar-collapsed",
			String(collapsed),
		);
	}, [collapsed]);

	useEffect(() => {
		setMobileOpen(false);
	}, [pathname]);

	return (
		<div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
			<Sidebar
				pathname={pathname}
				collapsed={collapsed}
				mobileOpen={mobileOpen}
				onCloseMobile={() => setMobileOpen(false)}
				onToggleCollapse={() => setCollapsed((prev) => !prev)}
			/>

			{mobileOpen && (
				<button
					type="button"
					className={styles.backdrop}
					aria-label="Close sidebar"
					onClick={() => setMobileOpen(false)}
				/>
			)}

			<div className={styles.main}>
				<Topbar
					pathname={pathname}
					collapsed={collapsed}
					onOpenMobileSidebar={() => setMobileOpen(true)}
					onToggleCollapse={() => setCollapsed((prev) => !prev)}
				/>

				<main className={styles.page}>{children}</main>
			</div>
		</div>
	);
}
