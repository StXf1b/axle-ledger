"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Mail, KeyRound, Lock, ArrowRight } from "lucide-react";

import AuthCard from "@/components/ui/AuthCard";
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

export default function ForgotPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { signIn, errors, fetchStatus } = useSignIn();

	const [step, setStep] = useState("identifier"); // identifier | code | password
	const [emailAddress, setEmailAddress] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [localErrors, setLocalErrors] = useState({});

	const isSubmitting = fetchStatus === "fetching";
	const targetRedirect = useMemo(
		() => sanitizeRedirect(searchParams.get("redirect")),
		[searchParams],
	);

	function clearErrors() {
		setLocalErrors({});
	}

	function validateEmail() {
		const nextErrors = {};

		if (!emailAddress.trim()) {
			nextErrors.email = "Email is required.";
		} else if (!/^\S+@\S+\.\S+$/.test(emailAddress.trim())) {
			nextErrors.email = "Enter a valid email address.";
		}

		return nextErrors;
	}

	function validatePassword() {
		const nextErrors = {};

		if (!password) {
			nextErrors.password = "New password is required.";
		} else if (password.length < 8) {
			nextErrors.password = "Password must be at least 8 characters.";
		}

		if (!confirmPassword) {
			nextErrors.confirmPassword = "Please confirm your new password.";
		} else if (password !== confirmPassword) {
			nextErrors.confirmPassword = "Passwords do not match.";
		}

		return nextErrors;
	}

	async function finalizeToTarget() {
		if (!signIn) return;

		await signIn.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (session?.currentTask) {
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

	async function handleSendCode(event) {
		event.preventDefault();

		if (!signIn || isSubmitting) return;

		const validationErrors = validateEmail();
		if (Object.keys(validationErrors).length > 0) {
			setLocalErrors(validationErrors);
			return;
		}

		clearErrors();

		const { error: createError } = await signIn.create({
			identifier: emailAddress.trim(),
		});

		if (createError) {
			setLocalErrors({
				email:
					createError.message ||
					createError.longMessage ||
					"Could not start password reset.",
			});
			return;
		}

		const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();

		if (sendError) {
			setLocalErrors({
				form:
					sendError.message ||
					sendError.longMessage ||
					"Could not send password reset code.",
			});
			return;
		}

		setStep("code");
	}

	async function handleVerifyCode(event) {
		event.preventDefault();

		if (!signIn || !code.trim() || isSubmitting) return;

		setLocalErrors((prev) => ({
			...prev,
			code: "",
			form: "",
		}));

		const { error } = await signIn.resetPasswordEmailCode.verifyCode({
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

		if (signIn.status === "needs_new_password") {
			setStep("password");
			return;
		}

		setLocalErrors((prev) => ({
			...prev,
			form: "Verification was not completed.",
		}));
	}

	async function handleSubmitNewPassword(event) {
		event.preventDefault();

		if (!signIn || isSubmitting) return;

		const validationErrors = validatePassword();
		if (Object.keys(validationErrors).length > 0) {
			setLocalErrors(validationErrors);
			return;
		}

		setLocalErrors((prev) => ({
			...prev,
			password: "",
			confirmPassword: "",
			form: "",
		}));

		const { error } = await signIn.resetPasswordEmailCode.submitPassword({
			password,
		});

		if (error) {
			setLocalErrors((prev) => ({
				...prev,
				form:
					error.message || error.longMessage || "Could not update password.",
			}));
			return;
		}

		if (signIn.status === "complete") {
			await finalizeToTarget();
			return;
		}

		if (signIn.status === "needs_second_factor") {
			setLocalErrors((prev) => ({
				...prev,
				form: "Your password was updated, but this account still requires MFA. Please sign in again to complete verification.",
			}));
			return;
		}

		setLocalErrors((prev) => ({
			...prev,
			form: "Password reset was not completed.",
		}));
	}

	if (step === "code") {
		return (
			<AuthCard
				title="Check your email"
				subtitle={`We sent a password reset code to ${emailAddress}.`}
				footer={
					<div className="stack-sm">
						<p>
							Wrong email?{" "}
							<button
								type="button"
								onClick={() => {
									setStep("identifier");
									setCode("");
									setLocalErrors({});
								}}
							>
								Go back
							</button>
						</p>
						<p>
							<button
								type="button"
								onClick={async () => {
									if (!signIn) return;
									const { error } =
										await signIn.resetPasswordEmailCode.sendCode();
									if (error) {
										setLocalErrors((prev) => ({
											...prev,
											code:
												error.message ||
												error.longMessage ||
												"Could not send a new code.",
										}));
									}
								}}
							>
								Send a new code
							</button>
						</p>
					</div>
				}
			>
				<form onSubmit={handleVerifyCode} className="stack-md">
					<Input
						label="Reset code"
						name="code"
						value={code}
						onChange={(e) => {
							setCode(e.target.value);
							setLocalErrors((prev) => ({ ...prev, code: "", form: "" }));
						}}
						placeholder="Enter the code from your email"
						icon={<KeyRound size={18} />}
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
						Verify code
					</Button>
				</form>
			</AuthCard>
		);
	}

	if (step === "password") {
		return (
			<AuthCard
				title="Set a new password"
				subtitle="Choose a new password for your account."
				footer={
					<p>
						Remembered it?{" "}
						<Link
							href={`/sign-in?redirect=${encodeURIComponent(targetRedirect)}`}
						>
							Back to sign in
						</Link>
					</p>
				}
			>
				<form onSubmit={handleSubmitNewPassword} className="stack-md">
					<PasswordInput
						label="New password"
						name="password"
						value={password}
						onChange={(e) => {
							setPassword(e.target.value);
							setLocalErrors((prev) => ({
								...prev,
								password: "",
								form: "",
							}));
						}}
						placeholder="Enter your new password"
						icon={<Lock size={18} />}
						error={
							localErrors.password || getFieldError(errors?.fields?.password)
						}
						required
					/>

					<PasswordInput
						label="Confirm new password"
						name="confirmPassword"
						value={confirmPassword}
						onChange={(e) => {
							setConfirmPassword(e.target.value);
							setLocalErrors((prev) => ({
								...prev,
								confirmPassword: "",
								form: "",
							}));
						}}
						placeholder="Re-enter your new password"
						icon={<Lock size={18} />}
						error={localErrors.confirmPassword}
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
						Update password
					</Button>
				</form>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title="Forgot your password?"
			subtitle="Enter your email and we’ll send you a password reset code."
			footer={
				<p>
					Back to{" "}
					<Link
						href={`/sign-in?redirect=${encodeURIComponent(targetRedirect)}`}
					>
						sign in
					</Link>
				</p>
			}
		>
			<form onSubmit={handleSendCode} className="stack-md">
				<Input
					label="Email address"
					name="emailAddress"
					type="email"
					value={emailAddress}
					onChange={(e) => {
						setEmailAddress(e.target.value);
						setLocalErrors((prev) => ({
							...prev,
							email: "",
							form: "",
						}));
					}}
					placeholder="you@example.com"
					icon={<Mail size={18} />}
					error={localErrors.email || getFieldError(errors?.fields?.identifier)}
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
					Send reset code
				</Button>
			</form>
		</AuthCard>
	);
}
