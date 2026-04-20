import "./Input.css";

export default function Input({
	label,
	name,
	type = "text",
	value,
	onChange,
	placeholder = "",
	required = false,
	disabled = false,
	error = "",
	hint = "",
	icon = null,
	className = "",
	inputClassName = "",
	fullWidth = true,
	...props
}) {
	const wrapperClasses = [
		"ax-input-field",
		fullWidth ? "ax-input-field--full" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const inputWrapClasses = [
		"ax-input-wrap",
		icon ? "ax-input-wrap--with-icon" : "",
		error ? "ax-input-wrap--error" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={wrapperClasses}>
			{label && (
				<label htmlFor={name} className="ax-input-label">
					{label}
					{required && <span className="ax-input-required">*</span>}
				</label>
			)}

			<div className={inputWrapClasses}>
				{icon && <span className="ax-input-icon">{icon}</span>}

				<input
					id={name}
					name={name}
					type={type}
					value={value}
					onChange={onChange}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
					className={`ax-input ${inputClassName}`.trim()}
					{...props}
				/>
			</div>

			{error ? (
				<p className="ax-input-message ax-input-message--error">{error}</p>
			) : hint ? (
				<p className="ax-input-message ax-input-message--hint">{hint}</p>
			) : null}
		</div>
	);
}
