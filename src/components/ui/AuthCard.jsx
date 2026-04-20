import "./AuthCard.css";

export default function AuthCard({
	title,
	subtitle,
	children,
	footer,
	logo = null,
	badge = "AxleLedger",
	className = "",
}) {
	const classes = ["ax-auth-card", className].filter(Boolean).join(" ");

	return (
		<div className="ax-auth-shell">
			<div className={classes}>
				<div className="ax-auth-card__glow" />

				<div className="ax-auth-card__inner">
					<div className="ax-auth-card__header">
						{logo ? (
							<div className="ax-auth-card__logo">{logo}</div>
						) : (
							<div className="ax-auth-card__brand">
								<div className="ax-auth-card__brand-mark">A</div>
								<span className="ax-auth-card__brand-text">{badge}</span>
							</div>
						)}

						<div className="ax-auth-card__heading">
							<h1 className="ax-auth-card__title">{title}</h1>
							{subtitle ? (
								<p className="ax-auth-card__subtitle">{subtitle}</p>
							) : null}
						</div>
					</div>

					<div className="ax-auth-card__body">{children}</div>

					{footer ? <div className="ax-auth-card__footer">{footer}</div> : null}
				</div>
			</div>
		</div>
	);
}
