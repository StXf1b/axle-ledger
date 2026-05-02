import "./AppLoading.css";

export default function AppLoading({ title }) {
	return (
		<div className="loading-spinner-page">
			<div className="loading-spinner-card">
				<div className="loading-spinner" />
				<p>{title}</p>
			</div>
		</div>
	);
}
