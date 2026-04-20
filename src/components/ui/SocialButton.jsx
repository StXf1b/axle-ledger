import "./SocialButton.css";

export default function SocialButton({
	children,
	icon,
	onClick,
	type = "button",
	disabled = false,
	loading = false,
	className = "",
}) {
	const classes = ["ax-social-button", className].filter(Boolean).join(" ");

	return (
		<button
			type={type}
			className={classes}
			onClick={onClick}
			disabled={disabled || loading}
		>
			<span className="ax-social-button__icon">
				{loading ? <span className="ax-social-button__spinner" /> : icon}
			</span>

			<span className="ax-social-button__text">{children}</span>
		</button>
	);
}
