import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-body",
	display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-heading",
	display: "swap",
});

export const metadata = {
	title: {
		default: "AxleLedger Dashboard",
		template: "%s | AxleLedger Dashboard",
	},
	description:
		"AxleLedger dashboard for managing customers, vehicles, service history, reminders, and documents.",
	robots: {
		index: false,
		follow: false,
	},
	icons: {
		icon: "/favicon.ico",
	},
};

export const viewport = {
	themeColor: "#0b0f14",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({ children }) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body className={`${inter.variable} ${jakarta.variable} antialiased`}>
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
