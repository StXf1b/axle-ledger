"use client";

import SocialButton from "./SocialButton";

function GoogleIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
			<path
				fill="#FFC107"
				d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.192 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.85 1.154 7.971 3.029l5.657-5.657C34.053 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
			/>
			<path
				fill="#FF3D00"
				d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.85 1.154 7.971 3.029l5.657-5.657C34.053 6.053 29.277 4 24 4c-7.682 0-14.348 4.337-17.694 10.691Z"
			/>
			<path
				fill="#4CAF50"
				d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.141 35.091 26.715 36 24 36c-5.171 0-9.625-3.329-11.29-7.946l-6.522 5.025C9.495 39.556 16.227 44 24 44Z"
			/>
			<path
				fill="#1976D2"
				d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.57h.003l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
			/>
		</svg>
	);
}

export default function GoogleButton({
	onClick,
	disabled = false,
	loading = false,
	children = "Continue with Google",
}) {
	return (
		<SocialButton
			onClick={onClick}
			disabled={disabled}
			loading={loading}
			icon={<GoogleIcon />}
		>
			{children}
		</SocialButton>
	);
}
