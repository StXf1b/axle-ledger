import "./AuthDivider.css";

export default function AuthDivider({ text = "or continue with" }) {
	return (
		<div className="ax-auth-divider" role="separator" aria-label={text}>
			<span className="ax-auth-divider__line" />
			<span className="ax-auth-divider__text">{text}</span>
			<span className="ax-auth-divider__line" />
		</div>
	);
}
