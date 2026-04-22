"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthCard from "@/components/ui/AuthCard";
import AuthDivider from "@/components/ui/AuthDivider";
import GoogleButton from "@/components/ui/GoogleButton";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";

function sanitizeRedirect(value) {
	if (!value || typeof value !== "string") return "/dashboard";

	// Only allow internal absolute-path redirects.
	if (!value.startsWith("/")) return "/dashboard";

	// Block protocol-relative and malformed external-style redirects.
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

export default function SignInPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { signIn, errors, fetchStatus } = useSignIn();

	const [step, setStep] = useState("form");
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
				// If you configure ClerkProvider taskUrls, Clerk can route these.
				// Avoid pretending sign-in succeeded while doing nothing.
				if (session?.currentTask) {
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

	async function handleSubmit(e) {
		e.preventDefault();

		if (!signIn || isSubmitting || googleLoading) return;

		const validationErrors = validateForm();
		if (Object.keys(validationErrors).length > 0) {
			setLocalErrors(validationErrors);
			return;
		}

		setLocalErrors({});

		const { error } = await signIn.password({
			emailAddress: form.email.trim(),
			password: form.password,
		});

		if (error) {
			setLocalErrors((prev) => ({
				...prev,
				form: error.message || error.longMessage || "Sign-in failed.",
			}));
			return;
		}

		if (signIn.status === "complete") {
			await finalizeToTarget();
			return;
		}

		if (signIn.status === "needs_client_trust") {
			const emailCodeFactor = signIn.supportedSecondFactors?.find(
				(factor) => factor.strategy === "email_code",
			);

			if (emailCodeFactor) {
				const result = await signIn.mfa.sendEmailCode();

				if (result?.error) {
					setLocalErrors({
						form:
							result.error.message ||
							result.error.longMessage ||
							"Could not send verification code.",
					});
					return;
				}

				setStep("verify");
				return;
			}

			setLocalErrors({
				form: "Client trust verification is required, but no email code factor is available.",
			});
			return;
		}

		if (signIn.status === "needs_second_factor") {
			setLocalErrors({
				form: "This account requires another MFA step that is not handled on this page yet.",
			});
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

		const { error } = await signIn.mfa.verifyEmailCode({
			code: code.trim(),
		});

		if (error) {
			setLocalErrors((prev) => ({
				...prev,
				code:
					error.message ||
					error.longMessage ||
					"Verification failed. Please check the code and try again.",
			}));
			return;
		}

		if (signIn.status === "complete") {
			await finalizeToTarget();
			return;
		}

		setLocalErrors((prev) => ({
			...prev,
			code: "Verification was not completed.",
		}));
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
				title="Verify your account"
				subtitle={`We sent a code to ${form.email}.`}
				footer={
					<div className="stack-sm">
						<p>
							<button
								type="button"
								onClick={async () => {
									if (!signIn) return;
									const result = await signIn.mfa.sendEmailCode();
									if (result?.error) {
										setLocalErrors((prev) => ({
											...prev,
											code:
												result.error.message ||
												result.error.longMessage ||
												"Could not send a new code.",
										}));
									}
								}}
							>
								Send a new code
							</button>
						</p>
						<p>
							<button
								type="button"
								onClick={async () => {
									await signIn?.reset();
									setStep("form");
									setCode("");
									setLocalErrors({});
								}}
							>
								Start over
							</button>
						</p>
					</div>
				}
			>
				<form onSubmit={handleVerify} className="stack-md">
					<Input
						label="Verification code"
						name="code"
						value={code}
						onChange={(e) => {
							setCode(e.target.value);
							setLocalErrors((prev) => ({ ...prev, code: "" }));
						}}
						placeholder="Enter the code"
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
