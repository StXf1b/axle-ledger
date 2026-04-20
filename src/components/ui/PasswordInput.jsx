"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./PasswordInput.css";

export default function PasswordInput({
	label,
	name,
	value,
	onChange,
	placeholder = "Enter your password",
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
	const [showPassword, setShowPassword] = useState(false);

	const wrapperClasses = [
		"ax-password-field",
		fullWidth ? "ax-password-field--full" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const inputWrapClasses = [
		"ax-password-wrap",
		icon ? "ax-password-wrap--with-left-icon" : "",
		error ? "ax-password-wrap--error" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={wrapperClasses}>
			{label && (
				<label htmlFor={name} className="ax-password-label">
					{label}
					{required && <span className="ax-password-required">*</span>}
				</label>
			)}

			<div className={inputWrapClasses}>
				{icon && <span className="ax-password-left-icon">{icon}</span>}

				<input
					id={name}
					name={name}
					type={showPassword ? "text" : "password"}
					value={value}
					onChange={onChange}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
					className={`ax-password-input ${inputClassName}`.trim()}
					{...props}
				/>

				<button
					type="button"
					className="ax-password-toggle"
					onClick={() => setShowPassword((prev) => !prev)}
					disabled={disabled}
					aria-label={showPassword ? "Hide password" : "Show password"}
					aria-pressed={showPassword}
				>
					{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
				</button>
			</div>

			{error ? (
				<p className="ax-password-message ax-password-message--error">
					{error}
				</p>
			) : hint ? (
				<p className="ax-password-message ax-password-message--hint">{hint}</p>
			) : null}
		</div>
	);
}
