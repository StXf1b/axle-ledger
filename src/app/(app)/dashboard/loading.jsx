export default function DashboardLoading() {
	return (
		<section className="page-section">
			<div className="content-grid two-col">
				<div className="card" style={{ minHeight: 140, opacity: 0.7 }} />
				<div className="card" style={{ minHeight: 140, opacity: 0.7 }} />
			</div>

			<div className="content-grid two-col">
				<div className="card" style={{ minHeight: 320, opacity: 0.7 }} />
				<div className="card" style={{ minHeight: 320, opacity: 0.7 }} />
			</div>

			<div className="card" style={{ minHeight: 300, opacity: 0.7 }} />
		</section>
	);
}
