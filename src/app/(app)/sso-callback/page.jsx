"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";

export default function SSOCallbackPage() {
	const clerk = useClerk();
	const { signIn } = useSignIn();
	const { signUp } = useSignUp();
	const router = useRouter();
	const hasRun = useRef(false);
	const searchParams = useSearchParams();
	const targetRedirect = searchParams.get("redirect") || "/dashboard";
	useEffect(() => {
		(async () => {
			if (!clerk.loaded || hasRun.current || !signIn || !signUp) return;
			hasRun.current = true;

			const goDashboard = async () => {
				const url = "/dashboard";
				router.push(url);
			};

			const finalizeSignIn = async () => {
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
			};

			const finalizeSignUp = async () => {
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
			};

			if (signIn.status === "complete") {
				await finalizeSignIn();
				return;
			}

			if (signUp.isTransferable) {
				await signIn.create({ transfer: true });
				if (signIn.status === "complete") {
					await finalizeSignIn();
					return;
				}
				router.push("/sign-in");
				return;
			}

			if (
				signIn.status === "needs_first_factor" &&
				!signIn.supportedFirstFactors?.every(
					(f) => f.strategy === "enterprise_sso",
				)
			) {
				router.push("/sign-in");
				return;
			}

			if (signIn.isTransferable) {
				await signUp.create({ transfer: true });

				if (signUp.status === "complete") {
					await finalizeSignUp();
					return;
				}

				router.push("/sign-up");
				return;
			}

			if (signUp.status === "complete") {
				await finalizeSignUp();
				return;
			}

			if (
				signIn.status === "needs_second_factor" ||
				signIn.status === "needs_new_password"
			) {
				router.push("/sign-in");
				return;
			}

			if (signIn.existingSession || signUp.existingSession) {
				const sessionId =
					signIn.existingSession?.sessionId ||
					signUp.existingSession?.sessionId;

				if (sessionId) {
					await clerk.setActive({
						session: sessionId,
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
					return;
				}
			}

			await goDashboard();
		})();
	}, [clerk, signIn, signUp, router]);

	return (
		<div className="auth-page">
			<div className="auth-card">
				<p className="text-muted">Completing sign-in…</p>
				<div id="clerk-captcha" data-cl-theme="dark" data-cl-size="flexible" />
			</div>
		</div>
	);
}
