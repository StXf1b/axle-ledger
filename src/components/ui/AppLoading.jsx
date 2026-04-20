import "./AppLoading.css";

export default function AppLoading({
	title = "Loading AxleLedger",
	description = "Preparing your dashboard...",
}) {
	return (
		<div className="app-loading-page" role="status" aria-live="polite">
			<div className="app-loading-card">
				<div className="app-loading-glow" />

				<p className="app-loading-eyebrow">AxleLedger</p>

				<div className="app-loading-spinner-wrap" aria-hidden="true">
					<div className="app-loading-spinner-ring" />
					<div className="app-loading-spinner-core" />
				</div>

				<h2 className="app-loading-title">{title}</h2>
				<p className="app-loading-description">{description}</p>

				<div className="app-loading-bar">
					<div className="app-loading-bar-fill" />
				</div>

				<div className="app-loading-dots" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
			</div>
		</div>
	);
}
