"use client";

import { useState, useTransition } from "react";
import { Building2, Mail, Phone, ArrowRight } from "lucide-react";

import AuthCard from "@/components/ui/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createOwnerWorkspace } from "@/actions/onboarding";

export default function OnboardingForm({ user }) {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");

	const [form, setForm] = useState({
		businessName: "",
		businessEmail: user?.email || "",
		businessPhone: "",
	});

	function handleChange(e) {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
		setError("");
	}

	function handleSubmit(e) {
		e.preventDefault();

		startTransition(() => {
			createOwnerWorkspace(form).catch((err) => {
				setError(err?.message || "Failed to create workspace.");
			});
		});
	}

	return (
		<AuthCard
			title="Set up your workspace"
			subtitle="Create your business workspace before entering the dashboard."
		>
			<form onSubmit={handleSubmit} className="stack-md">
				<Input
					label="Business name"
					name="businessName"
					value={form.businessName}
					onChange={handleChange}
					placeholder="Murphy Auto Services"
					icon={<Building2 size={18} />}
					required
				/>

				<Input
					label="Business email"
					name="businessEmail"
					type="email"
					value={form.businessEmail}
					onChange={handleChange}
					placeholder="hello@yourbusiness.ie"
					icon={<Mail size={18} />}
				/>

				<Input
					label="Business phone"
					name="businessPhone"
					value={form.businessPhone}
					onChange={handleChange}
					placeholder="+353 87 123 4567"
					icon={<Phone size={18} />}
				/>

				{error ? (
					<p className="text-danger" style={{ fontSize: "0.9rem" }}>
						{error}
					</p>
				) : null}

				<Button
					type="submit"
					variant="primary"
					size="lg"
					fullWidth
					loading={isPending}
					rightIcon={!isPending ? <ArrowRight size={18} /> : null}
				>
					Create workspace
				</Button>
			</form>
		</AuthCard>
	);
}
