"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import {
	Mail,
	Lock,
	ArrowRight,
	ShieldCheck,
	Smartphone,
	KeyRound,
	RefreshCw,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthCard from "@/components/ui/AuthCard";
import AuthDivider from "@/components/ui/AuthDivider";
import GoogleButton from "@/components/ui/GoogleButton";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";

function sanitizeRedirect(value) {
	if (!value || typeof value !== "string") return "/dashboard";
	if (!value.startsWith("/")) return "/dashboard";
	if (value.startsWith("//")) return "/dashboard";
	return value;
}

function getFieldError(fieldValue) {
	if (!fieldValue) return "";

	if (typeof fieldValue === "string") return fieldValue;

	if (Array.isArray(fieldValue)) {
		return fieldValue[0]?.message || fieldValue[0]?.longMessage || "";
	}

	if (typeof fieldValue === "object") {
		return fieldValue.message || fieldValue.longMessage || "";
	}

	return "";
}

const SECOND_FACTOR_META = {
	email_code: {
		label: "Email code",
		icon: Mail,
		description: "Enter the verification code sent to your email.",
		codeLabel: "Email verification code",
		codePlaceholder: "Enter the email code",
	},
	phone_code: {
		label: "SMS code",
		icon: Smartphone,
		description: "Enter the verification code sent to your phone.",
		codeLabel: "SMS verification code",
		codePlaceholder: "Enter the SMS code",
	},
	totp: {
		label: "Authenticator app",
		icon: ShieldCheck,
		description: "Enter the code from your authenticator app.",
		codeLabel: "Authenticator code",
		codePlaceholder: "Enter the 6-digit code",
	},
	backup_code: {
		label: "Backup code",
		icon: KeyRound,
		description: "Enter one of your backup codes.",
		codeLabel: "Backup code",
		codePlaceholder: "Enter your backup code",
	},
};

function normalizeSupportedStrategies(signIn) {
	const rawFactors = signIn?.supportedSecondFactors || [];

	const supported = rawFactors
		.map((factor) => factor?.strategy)
		.filter((strategy) =>
			["email_code", "phone_code", "totp", "backup_code"].includes(strategy),
		);

	return [...new Set(supported)];
}

export default function SignInPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { signIn, errors, fetchStatus } = useSignIn();

	const [step, setStep] = useState("form");
	const [verificationMode, setVerificationMode] = useState(null); // "client_trust" | "second_factor"
	const [verificationStrategy, setVerificationStrategy] = useState("");
	const [availableStrategies, setAvailableStrategies] = useState([]);
	const [code, setCode] = useState("");
	const [form, setForm] = useState({
		email: "",
		password: "",
	});
	const [localErrors, setLocalErrors] = useState({});
	const [googleLoading, setGoogleLoading] = useState(false);

	const isSubmitting = fetchStatus === "fetching";
	const targetRedirect = useMemo(
		() => sanitizeRedirect(searchParams.get("redirect")),
		[searchParams],
	);

	const activeStrategyMeta =
		SECOND_FACTOR_META[verificationStrategy] || SECOND_FACTOR_META.email_code;

	function clearErrors() {
		setLocalErrors({});
	}

	function handleChange(e) {
		const { name, value } = e.target;

		setForm((prev) => ({
			...prev,
			[name]: value,
		}));

		setLocalErrors((prev) => ({
			...prev,
			[name]: "",
			form: "",
			code: "",
		}));
	}

	function validateForm() {
		const nextErrors = {};

		if (!form.email.trim()) {
			nextErrors.email = "Email is required.";
		} else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
			nextErrors.email = "Enter a valid email address.";
		}

		if (!form.password) {
			nextErrors.password = "Password is required.";
		}

		return nextErrors;
	}

	async function finalizeToTarget() {
		if (!signIn) return;

		await signIn.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (session?.currentTask) {
					// Add a dedicated task route later if you enable required MFA setup.
					router.push("/dashboard");
					return;
				}

				const url = decorateUrl(targetRedirect);

				if (url.startsWith("http")) {
					window.location.href = url;
				} else {
					router.push(url);
				}
			},
		});
	}

	function pickDefaultStrategy(mode, supported) {
		if (mode === "client_trust") {
			if (supported.includes("email_code")) return "email_code";
			if (supported.includes("phone_code")) return "phone_code";
			return "";
		}

		if (supported.includes("phone_code")) return "phone_code";
		if (supported.includes("email_code")) return "email_code";
		if (supported.includes("totp")) return "totp";
		if (supported.includes("backup_code")) return "backup_code";
		return "";
	}

	async function sendCodeIfNeeded(strategy) {
		if (!signIn) return { ok: false, message: "Sign-in is not ready yet." };

		if (strategy === "email_code") {
			const { error } = await signIn.mfa.sendEmailCode();
			if (error) {
				return {
					ok: false,
					message:
						error.message || error.longMessage || "Could not send email code.",
				};
			}
		}

		if (strategy === "phone_code") {
			const { error } = await signIn.mfa.sendPhoneCode();
			if (error) {
				return {
					ok: false,
					message:
						error.message || error.longMessage || "Could not send SMS code.",
				};
			}
		}

		return { ok: true };
	}

	async function beginVerification(mode, preferredStrategy) {
		if (!signIn) return;

		const supported = normalizeSupportedStrategies(signIn);
		const chosen =
			preferredStrategy && supported.includes(preferredStrategy)
				? preferredStrategy
				: pickDefaultStrategy(mode, supported);

		if (!chosen) {
			setLocalErrors({
				form: "This account requires a second factor that is not supported by this page.",
			});
			return;
		}

		const sendResult = await sendCodeIfNeeded(chosen);
		if (!sendResult.ok) {
			setLocalErrors({
				form: sendResult.message,
			});
			return;
		}

		setAvailableStrategies(supported);
		setVerificationMode(mode);
		setVerificationStrategy(chosen);
		setCode("");
		setLocalErrors({});
		setStep("verify");
	}

	async function switchStrategy(nextStrategy) {
		if (!signIn || nextStrategy === verificationStrategy) return;

		setLocalErrors((prev) => ({
			...prev,
			code: "",
			form: "",
		}));

		const sendResult = await sendCodeIfNeeded(nextStrategy);
		if (!sendResult.ok) {
			setLocalErrors({
				form: sendResult.message,
			});
			return;
		}

		setVerificationStrategy(nextStrategy);
		setCode("");
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!signIn || isSubmitting || googleLoading) return;

		const validationErrors = validateForm();
		if (Object.keys(validationErrors).length > 0) {
			setLocalErrors(validationErrors);
			return;
		}

		clearErrors();

		const { error } = await signIn.password({
			emailAddress: form.email.trim(),
			password: form.password,
		});

		if (error) {
			setLocalErrors({
				form: error.message || error.longMessage || "Sign-in failed.",
			});
			return;
		}

		if (signIn.status === "complete") {
			await finalizeToTarget();
			return;
		}

		if (signIn.status === "needs_client_trust") {
			await beginVerification("client_trust");
			return;
		}

		if (signIn.status === "needs_second_factor") {
			await beginVerification("second_factor");
			return;
		}

		if (signIn.status === "needs_new_password") {
			setLocalErrors({
				form: "This account must reset its password before sign-in can complete.",
			});
			return;
		}

		setLocalErrors({
			form: "Sign-in attempt not complete.",
		});
	}

	async function handleVerify(e) {
		e.preventDefault();

		if (!signIn || !code.trim() || isSubmitting) return;

		setLocalErrors((prev) => ({
			...prev,
			code: "",
			form: "",
		}));

		let result;

		if (verificationStrategy === "email_code") {
			result = await signIn.mfa.verifyEmailCode({ code: code.trim() });
		} else if (verificationStrategy === "phone_code") {
			result = await signIn.mfa.verifyPhoneCode({ code: code.trim() });
		} else if (verificationStrategy === "totp") {
			result = await signIn.mfa.verifyTOTP({ code: code.trim() });
		} else if (verificationStrategy === "backup_code") {
			result = await signIn.mfa.verifyBackupCode({ code: code.trim() });
		} else {
			setLocalErrors({
				form: "Unsupported verification method.",
			});
			return;
		}

		if (result?.error) {
			setLocalErrors((prev) => ({
				...prev,
				code:
					result.error.message ||
					result.error.longMessage ||
					"Verification failed. Please try again.",
			}));
			return;
		}

		if (signIn.status === "complete") {
			await finalizeToTarget();
			return;
		}

		setLocalErrors((prev) => ({
			...prev,
			form: "Verification was not completed.",
		}));
	}

	async function handleResendCode() {
		if (!signIn) return;

		const sendResult = await sendCodeIfNeeded(verificationStrategy);

		if (!sendResult.ok) {
			setLocalErrors((prev) => ({
				...prev,
				code: sendResult.message,
			}));
			return;
		}

		setLocalErrors((prev) => ({
			...prev,
			code: "",
			form: "",
		}));
	}

	async function handleStartOver() {
		await signIn?.reset();
		setStep("form");
		setVerificationMode(null);
		setVerificationStrategy("");
		setAvailableStrategies([]);
		setCode("");
		setLocalErrors({});
	}

	async function handleGoogleSignIn() {
		if (!signIn || isSubmitting || googleLoading) return;

		try {
			setGoogleLoading(true);

			const { error } = await signIn.sso({
				strategy: "oauth_google",
				redirectCallbackUrl: `/sso-callback?redirect=${encodeURIComponent(targetRedirect)}`,
				redirectUrl: targetRedirect,
			});

			if (error) {
				setLocalErrors({
					form: error.message || error.longMessage || "Google sign-in failed.",
				});
			}
		} finally {
			setGoogleLoading(false);
		}
	}

	if (step === "verify") {
		return (
			<AuthCard
				title={
					verificationMode === "client_trust"
						? "Verify this device"
						: "Verify your account"
				}
				subtitle={activeStrategyMeta.description}
				footer={
					<div className="stack-sm">
						{(verificationStrategy === "email_code" ||
							verificationStrategy === "phone_code") && (
							<p>
								<button type="button" onClick={handleResendCode}>
									Send a new code
								</button>
							</p>
						)}

						<p>
							<button type="button" onClick={handleStartOver}>
								Start over
							</button>
						</p>
					</div>
				}
			>
				<div className="stack-md">
					{availableStrategies.length > 1 ? (
						<div className="stack-sm">
							<p className="field-label">Choose a verification method</p>

							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "10px",
								}}
							>
								{availableStrategies.map((strategy) => {
									const meta = SECOND_FACTOR_META[strategy];
									if (!meta) return null;

									const Icon = meta.icon;
									const isActive = verificationStrategy === strategy;

									return (
										<button
											key={strategy}
											type="button"
											className={`tab ${isActive ? "active" : ""}`}
											onClick={() => switchStrategy(strategy)}
										>
											<Icon size={16} />
											{meta.label}
										</button>
									);
								})}
							</div>
						</div>
					) : null}

					<form onSubmit={handleVerify} className="stack-md">
						<Input
							label={activeStrategyMeta.codeLabel}
							name="code"
							value={code}
							onChange={(e) => {
								setCode(e.target.value);
								setLocalErrors((prev) => ({ ...prev, code: "", form: "" }));
							}}
							placeholder={activeStrategyMeta.codePlaceholder}
							error={localErrors.code || getFieldError(errors?.fields?.code)}
							required
						/>

						{localErrors.form ? (
							<p className="text-danger" style={{ fontSize: "0.9rem" }}>
								{localErrors.form}
							</p>
						) : null}

						<Button
							type="submit"
							variant="primary"
							size="lg"
							fullWidth
							loading={isSubmitting}
							rightIcon={!isSubmitting ? <ArrowRight size={18} /> : null}
						>
							Verify and sign in
						</Button>
					</form>
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title="Welcome back"
			subtitle="Sign in to access your dashboard and manage your workflow."
			footer={
				<div className="stack-sm">
					<p>
						Don&apos;t have an account?{" "}
						<Link
							href={`/sign-up?redirect=${encodeURIComponent(targetRedirect)}`}
						>
							Create one
						</Link>
					</p>
				</div>
			}
		>
			<div className="stack-md">
				<GoogleButton onClick={handleGoogleSignIn} loading={googleLoading}>
					Continue with Google
				</GoogleButton>

				<AuthDivider text="or sign in with email" />

				<form onSubmit={handleSubmit} className="stack-md">
					<Input
						label="Email address"
						name="email"
						type="email"
						value={form.email}
						onChange={handleChange}
						placeholder="you@example.com"
						icon={<Mail size={18} />}
						error={
							localErrors.email ||
							getFieldError(errors?.fields?.identifier) ||
							getFieldError(errors?.fields?.emailAddress)
						}
						required
					/>

					<PasswordInput
						label="Password"
						name="password"
						value={form.password}
						onChange={handleChange}
						placeholder="Enter your password"
						icon={<Lock size={18} />}
						error={
							localErrors.password || getFieldError(errors?.fields?.password)
						}
						required
					/>
					<Link
						href="/forgot-password"
						className="text-sm flex items-center gap-1 self-end"
					>
						Forgot password?
					</Link>

					{localErrors.form ? (
						<p className="text-danger" style={{ fontSize: "0.9rem" }}>
							{localErrors.form}
						</p>
					) : null}

					<Button
						type="submit"
						variant="primary"
						size="lg"
						fullWidth
						loading={isSubmitting}
						rightIcon={!isSubmitting ? <ArrowRight size={18} /> : null}
					>
						Sign in
					</Button>
				</form>
			</div>
		</AuthCard>
	);
}
