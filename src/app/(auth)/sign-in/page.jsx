"use client";

import { useState } from "react";
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

export default function SignInPage() {
	const router = useRouter();
	const { signIn, errors, fetchStatus } = useSignIn();

	const [step, setStep] = useState("form");
	const [code, setCode] = useState("");
	const [form, setForm] = useState({
		email: "",
		password: "",
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
	const searchParams = useSearchParams();
	const targetRedirect = searchParams.get("redirect") || "/dashboard";

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

	async function handleSubmit(e) {
		e.preventDefault();

		if (!signIn) return;

		const validationErrors = validateForm();
		if (Object.keys(validationErrors).length > 0) {
			setLocalErrors(validationErrors);
			return;
		}

		const { error } = await signIn.password({
			emailAddress: form.email,
			password: form.password,
		});

		if (error) return;

		if (signIn.status === "complete") {
			await finalizeToTarget();
			return;
		}

		if (signIn.status === "needs_client_trust") {
			const emailCodeFactor = signIn.supportedSecondFactors?.find(
				(factor) => factor.strategy === "email_code",
			);

			if (emailCodeFactor) {
				await signIn.mfa.sendEmailCode();
				setStep("verify");
				return;
			}
		}

		if (signIn.status === "needs_second_factor") {
			setLocalErrors({
				form: "This account needs an additional second factor flow. Add MFA handling next.",
			});
			return;
		}

		setLocalErrors({
			form: "Sign-in attempt not complete.",
		});
	}

	async function handleVerify(e) {
		e.preventDefault();

		if (!signIn || !code.trim()) return;

		await signIn.mfa.verifyEmailCode({ code });

		if (signIn.status === "complete") {
			await finalizeToTarget();
		}
	}

	async function handleGoogleSignIn() {
		if (!signIn) return;

		try {
			setGoogleLoading(true);

			const { error } = await signIn.sso({
				strategy: "oauth_google",
				redirectCallbackUrl: `/sso-callback?redirect=${encodeURIComponent(targetRedirect)}`,
				redirectUrl: targetRedirect,
			});

			if (error) {
				console.error(error);
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
							<button type="button" onClick={() => signIn?.mfa.sendEmailCode()}>
								Send a new code
							</button>
						</p>
						<p>
							<button type="button" onClick={() => signIn?.reset()}>
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
						onChange={(e) => setCode(e.target.value)}
						placeholder="Enter the code"
						error={errors?.fields?.code?.message}
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
						error={localErrors.email || errors?.fields?.identifier?.message}
						required
					/>

					<PasswordInput
						label="Password"
						name="password"
						value={form.password}
						onChange={handleChange}
						placeholder="Enter your password"
						icon={<Lock size={18} />}
						error={localErrors.password || errors?.fields?.password?.message}
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
						loading={fetchStatus === "fetching"}
						rightIcon={
							fetchStatus !== "fetching" ? <ArrowRight size={18} /> : null
						}
					>
						Sign in
					</Button>
				</form>
			</div>
		</AuthCard>
	);
}
