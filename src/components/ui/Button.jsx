import "./Button.css";

export default function Button({
	children,
	type = "button",
	variant = "primary",
	size = "md",
	fullWidth = false,
	loading = false,
	disabled = false,
	leftIcon = null,
	rightIcon = null,
	className = "",
	onClick,
}) {
	const classes = [
		"ax-button",
		`ax-button--${variant}`,
		`ax-button--${size}`,
		fullWidth ? "ax-button--full" : "",
		loading ? "ax-button--loading" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<button
			type={type}
			className={classes}
			onClick={onClick}
			disabled={disabled || loading}
		>
			{loading && <span className="ax-button__spinner" aria-hidden="true" />}

			{!loading && leftIcon && (
				<span className="ax-button__icon ax-button__icon--left">
					{leftIcon}
				</span>
			)}

			<span className="ax-button__text">{children}</span>

			{!loading && rightIcon && (
				<span className="ax-button__icon ax-button__icon--right">
					{rightIcon}
				</span>
			)}
		</button>
	);
}
