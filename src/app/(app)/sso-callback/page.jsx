"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";

function sanitizeRedirect(value) {
	if (!value || typeof value !== "string") return "/dashboard";
	if (!value.startsWith("/")) return "/dashboard";
	if (value.startsWith("//")) return "/dashboard";
	return value;
}

export default function SSOCallbackPage() {
	const clerk = useClerk();
	const { signIn } = useSignIn();
	const { signUp } = useSignUp();
	const router = useRouter();
	const hasRun = useRef(false);
	const searchParams = useSearchParams();

	const targetRedirect = useMemo(
		() => sanitizeRedirect(searchParams.get("redirect")),
		[searchParams],
	);

	useEffect(() => {
		async function run() {
			if (!clerk.loaded || hasRun.current || !signIn || !signUp) return;
			hasRun.current = true;

			const goTo = (path) => {
				router.push(path);
			};

			const goToSignIn = () => {
				router.push(`/sign-in?redirect=${encodeURIComponent(targetRedirect)}`);
			};

			const goToSignUp = () => {
				router.push(`/sign-up?redirect=${encodeURIComponent(targetRedirect)}`);
			};

			const goToContinue = () => {
				router.push(
					`/sign-in/continue?redirect=${encodeURIComponent(targetRedirect)}`,
				);
			};

			const handleNavigate = async ({ session, decorateUrl }) => {
				if (session?.currentTask) {
					router.push(
						`/sign-in/tasks?redirect=${encodeURIComponent(targetRedirect)}`,
					);
					return;
				}

				const url = decorateUrl(targetRedirect);

				if (url.startsWith("http")) {
					window.location.href = url;
				} else {
					router.push(url);
				}
			};

			if (signIn.status === "complete") {
				const { error } = await signIn.finalize({
					navigate: handleNavigate,
				});

				if (error) {
					console.error("signIn.finalize error:", error);
					goToSignIn();
				}
				return;
			}

			if (signUp.isTransferable) {
				const { error } = await signIn.create({ transfer: true });

				if (error) {
					console.error("signIn.create transfer error:", error);
					goToSignIn();
					return;
				}

				if (signIn.status === "complete") {
					const { error: finalizeError } = await signIn.finalize({
						navigate: handleNavigate,
					});

					if (finalizeError) {
						console.error(
							"signIn.finalize after transfer error:",
							finalizeError,
						);
						goToSignIn();
					}
					return;
				}

				goToSignIn();
				return;
			}

			if (
				signIn.status === "needs_first_factor" &&
				!signIn.supportedFirstFactors?.every(
					(factor) => factor.strategy === "enterprise_sso",
				)
			) {
				goToSignIn();
				return;
			}

			if (signIn.isTransferable) {
				const { error } = await signUp.create({ transfer: true });

				if (error) {
					console.error("signUp.create transfer error:", error);
					goToSignUp();
					return;
				}

				if (signUp.status === "complete") {
					const { error: finalizeError } = await signUp.finalize({
						navigate: handleNavigate,
					});

					if (finalizeError) {
						console.error(
							"signUp.finalize after transfer error:",
							finalizeError,
						);
						goToSignUp();
					}
					return;
				}

				goToContinue();
				return;
			}

			if (signUp.status === "complete") {
				const { error } = await signUp.finalize({
					navigate: handleNavigate,
				});

				if (error) {
					console.error("signUp.finalize error:", error);
					goToSignUp();
				}
				return;
			}

			if (
				signIn.status === "needs_second_factor" ||
				signIn.status === "needs_new_password"
			) {
				goToSignIn();
				return;
			}

			if (signIn.existingSession || signUp.existingSession) {
				const sessionId =
					signIn.existingSession?.sessionId ||
					signUp.existingSession?.sessionId;

				if (sessionId) {
					await clerk.setActive({
						session: sessionId,
						navigate: handleNavigate,
					});
					return;
				}
			}

			goTo(targetRedirect);
		}

		run();
	}, [clerk, signIn, signUp, router, targetRedirect]);

	return (
		<div className="auth-page">
			<div className="auth-card">
				<p className="text-muted">Completing sign-in…</p>
				<div id="clerk-captcha" data-cl-theme="dark" data-cl-size="flexible" />
			</div>
		</div>
	);
}
