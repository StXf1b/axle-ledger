"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { User, Mail, Lock, ArrowRight } from "lucide-react";

import AuthCard from "@/components/ui/AuthCard";
import AuthDivider from "@/components/ui/AuthDivider";
import GoogleButton from "@/components/ui/GoogleButton";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";

export default function SignUpPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { signIn } = useSignIn();
	const { signUp, errors, fetchStatus } = useSignUp();

	const targetRedirect = searchParams.get("redirect") || "/dashboard";
	const isInviteFlow = targetRedirect.startsWith("/accept-invite");

	const [step, setStep] = useState("form");
	const [code, setCode] = useState("");
	const [form, setForm] = useState({
		fullName: "",
		email: "",
		password: "",
		confirmPassword: "",
	});

	const [localErrors, setLocalErrors] = useState({});
	const [googleLoading, setGoogleLoading] = useState(false);

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
		}));
	}

	function validateForm() {
		const nextErrors = {};

		if (!form.fullName.trim()) {
			nextErrors.fullName = "Full name is required.";
		}

		if (!form.email.trim()) {
			nextErrors.email = "Email is required.";
		} else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
			nextErrors.email = "Enter a valid email address.";
		}

		if (!form.password) {
			nextErrors.password = "Password is required.";
		} else if (form.password.length < 8) {
			nextErrors.password = "Password must be at least 8 characters.";
		}

		if (!form.confirmPassword) {
			nextErrors.confirmPassword = "Please confirm your password.";
		} else if (form.password !== form.confirmPassword) {
			nextErrors.confirmPassword = "Passwords do not match.";
		}

		return nextErrors;
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!signUp) return;

		const validationErrors = validateForm();
		if (Object.keys(validationErrors).length > 0) {
			setLocalErrors(validationErrors);
			return;
		}

		const { error } = await signUp.password({
			emailAddress: form.email,
			password: form.password,
			unsafeMetadata: {
				fullName: form.fullName,
			},
		});

		if (error) return;

		await signUp.verifications.sendEmailCode();
		setStep("verify");
	}

	async function handleVerify(e) {
		e.preventDefault();

		if (!signUp || !code.trim()) return;

		await signUp.verifications.verifyEmailCode({ code });

		if (signUp.status === "complete") {
			await signUp.finalize({
				navigate: ({ session, decorateUrl }) => {
					if (session?.currentTask) return;

					const url = decorateUrl(targetRedirect);

					if (url.startsWith("http")) {
						window.location.href = url;
					} else {
						router.push(url);
					}
				},
			});
		}
	}

	async function handleGoogleSignUp() {
		if (!signIn || googleLoading) return;

		try {
			setGoogleLoading(true);
			setLocalErrors((prev) => ({ ...prev, form: "" }));

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
		} catch (err) {
			console.error("Google OAuth start failed:", err);
			setLocalErrors({
				form: "Could not start Google sign-in. Please try again.",
			});
		} finally {
			setGoogleLoading(false);
		}
	}

	if (step === "verify") {
		return (
			<AuthCard
				title={isInviteFlow ? "Verify your account" : "Verify your email"}
				subtitle={`We sent a verification code to ${form.email}.`}
				footer={
					<div className="stack-sm">
						<p>
							Wrong email?{" "}
							<button type="button" onClick={() => setStep("form")}>
								Go back
							</button>
						</p>
						<p>
							<button
								type="button"
								onClick={() => signUp?.verifications.sendEmailCode()}
							>
								Send a new code
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
						onChange={(e) => setCode(e.target.value)}
						placeholder="Enter the code"
						required
					/>

					<Button
						type="submit"
						variant="primary"
						size="lg"
						fullWidth
						loading={fetchStatus === "fetching"}
						rightIcon={
							fetchStatus !== "fetching" ? <ArrowRight size={18} /> : null
						}
					>
						{isInviteFlow ? "Verify and continue" : "Verify email"}
					</Button>
				</form>

				<div id="clerk-captcha" data-cl-theme="dark" data-cl-size="flexible" />
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title={isInviteFlow ? "Join your workspace" : "Create your account"}
			subtitle={
				isInviteFlow
					? "Create your AxleLedger account to join the invited workspace."
					: "Create your AxleLedger account to set up your workshop dashboard."
			}
			footer={
				<p>
					Already have an account?{" "}
					<Link
						href={`/sign-in?redirect=${encodeURIComponent(targetRedirect)}`}
					>
						Sign in
					</Link>
				</p>
			}
		>
			<div className="stack-md">
				<GoogleButton onClick={handleGoogleSignUp} loading={googleLoading}>
					Continue with Google
				</GoogleButton>

				<AuthDivider text="or create an account with email" />

				<form onSubmit={handleSubmit} className="stack-md">
					<Input
						label="Full name"
						name="fullName"
						value={form.fullName}
						onChange={handleChange}
						placeholder="John Murphy"
						icon={<User size={18} />}
						error={localErrors.fullName}
						required
					/>

					<Input
						label="Email address"
						name="email"
						type="email"
						value={form.email}
						onChange={handleChange}
						placeholder="you@example.com"
						icon={<Mail size={18} />}
						error={localErrors.email || errors?.fields?.emailAddress?.message}
						required
					/>

					<PasswordInput
						label="Password"
						name="password"
						value={form.password}
						onChange={handleChange}
						placeholder="Create a password"
						icon={<Lock size={18} />}
						error={localErrors.password || errors?.fields?.password?.message}
						required
					/>

					<PasswordInput
						label="Confirm password"
						name="confirmPassword"
						value={form.confirmPassword}
						onChange={handleChange}
						placeholder="Re-enter your password"
						icon={<Lock size={18} />}
						error={localErrors.confirmPassword}
						required
					/>

					<div
						id="clerk-captcha"
						data-cl-theme="dark"
						data-cl-size="flexible"
					/>

					<Button
						type="submit"
						variant="primary"
						size="lg"
						fullWidth
						loading={fetchStatus === "fetching"}
						rightIcon={
							fetchStatus !== "fetching" ? <ArrowRight size={18} /> : null
						}
					>
						{isInviteFlow ? "Create account and continue" : "Create account"}
					</Button>
				</form>
			</div>
		</AuthCard>
	);
}
