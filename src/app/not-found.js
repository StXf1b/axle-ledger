"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, SearchX } from "lucide-react";

export default function NotFound() {
	const router = useRouter();

	return (
		<section className="notfound-page">
			<div className="notfound-card">
				<div className="notfound-icon-wrap">
					<div className="notfound-icon">
						<SearchX size={34} />
					</div>
				</div>

				<p className="notfound-eyebrow">404 error</p>
				<h1 className="notfound-title">Page not found</h1>
				<p className="notfound-description">
					The page you’re looking for doesn’t exist, may have been moved, or the
					link may be incorrect.
				</p>

				<div className="notfound-actions">
					<Link href="/dashboard" className="btn btn-primary btn-lg">
						<Home size={18} />
						Go to dashboard
					</Link>

					<button
						type="button"
						className="btn btn-secondary btn-lg"
						onClick={() => router.back()}
					>
						<ArrowLeft size={18} />
						Go back
					</button>
				</div>

				<div className="notfound-help">
					<p>Helpful shortcuts</p>
					<div className="notfound-help-links">
						<Link href="/dashboard">Dashboard</Link>
						<Link href="/customers">Customers</Link>
						<Link href="/vehicles">Vehicles</Link>
						<Link href="/settings">Settings</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
