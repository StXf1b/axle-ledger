"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	Mail,
	Send,
} from "lucide-react";

import { sendWorkLogsToCustomer } from "@/actions/work-log-emails";
import Button from "@/components/ui/Button";
import {
	formatCurrency,
	formatOdometer,
	formatWorkLogDate,
	getVehicleLabel,
} from "@/lib/work-log-utils";
import "./SendWorkLogsToCustomerPageClient.css";

function getCustomerName(customer) {
	if (!customer) return "Select a customer";

	return (
		customer.companyName ||
		[customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
		customer.email ||
		"Customer"
	);
}

function WorkLogSelection({
	customer,
	workLogs,
	resendConfigured,
	canSendWorkLogs,
}) {
	const [selectedIds, setSelectedIds] = useState([]);
	const [isSending, setIsSending] = useState(false);
	const [status, setStatus] = useState({ type: "", message: "" });

	const selectedTotal = useMemo(
		() =>
			workLogs
				.filter((log) => selectedIds.includes(log.id))
				.reduce((total, log) => total + Number(log.totalCharge || 0), 0),
		[workLogs, selectedIds],
	);

	const allSelected = workLogs.length > 0 && selectedIds.length === workLogs.length;
	const canSend =
		canSendWorkLogs && resendConfigured && selectedIds.length > 0 && !isSending;

	function toggleWorkLog(workLogId) {
		setSelectedIds((current) =>
			current.includes(workLogId)
				? current.filter((id) => id !== workLogId)
				: [...current, workLogId],
		);
		setStatus({ type: "", message: "" });
	}

	function toggleAll() {
		setSelectedIds(allSelected ? [] : workLogs.map((log) => log.id));
		setStatus({ type: "", message: "" });
	}

	async function handleSend() {
		if (!canSend) return;

		setIsSending(true);
		setStatus({ type: "", message: "" });

		try {
			const result = await sendWorkLogsToCustomer({
				customerId: customer.id,
				workLogIds: selectedIds,
			});
			setSelectedIds([]);
			setStatus({
				type: "success",
				message: `Sent ${result.sentCount} work log${
					result.sentCount === 1 ? "" : "s"
				} to ${result.recipient}.`,
			});
		} catch (error) {
			setStatus({
				type: "error",
				message:
					error?.message ||
					"Could not send these work logs. Please try again.",
			});
		} finally {
			setIsSending(false);
		}
	}

	if (!workLogs.length) {
		return (
			<div className="send-work-logs-empty">
				<p className="send-work-logs-empty__title">No work logs found</p>
				<p className="send-work-logs-empty__text">
					This customer does not have any work logs ready to send.
				</p>
			</div>
		);
	}

	return (
		<div className="send-work-logs-selection">
			<div className="send-work-logs-selection__bar">
				<div>
					<p className="send-work-logs-selection__label">Selected</p>
					<h3>
						{selectedIds.length} of {workLogs.length} logs
					</h3>
					<p>{formatCurrency(selectedTotal)} selected total</p>
				</div>

				<div className="send-work-logs-selection__actions">
					<Button variant="secondary" onClick={toggleAll}>
						{allSelected ? "Clear all" : "Select all"}
					</Button>
					<Button
						variant="primary"
						leftIcon={<Send size={16} />}
						onClick={handleSend}
						loading={isSending}
						disabled={!canSend}
					>
						Send to customer
					</Button>
				</div>
			</div>

			{!resendConfigured ? (
				<div className="send-work-logs-notice send-work-logs-notice--warning">
					<AlertTriangle size={18} />
					<p>
						Email sending is not configured yet. Add{" "}
						<strong>RESEND_API_KEY</strong> and{" "}
						<strong>RESEND_FROM_EMAIL</strong> to enable sending.
					</p>
				</div>
			) : null}

			{status.message ? (
				<div
					className={`send-work-logs-notice send-work-logs-notice--${status.type}`}
				>
					{status.type === "success" ? (
						<CheckCircle2 size={18} />
					) : (
						<AlertTriangle size={18} />
					)}
					<p>{status.message}</p>
				</div>
			) : null}

			<div className="send-work-logs-list">
				{workLogs.map((log) => {
					const checked = selectedIds.includes(log.id);

					return (
						<label
							key={log.id}
							className={`send-work-log-card ${
								checked ? "send-work-log-card--selected" : ""
							}`}
						>
							<input
								type="checkbox"
								checked={checked}
								onChange={() => toggleWorkLog(log.id)}
							/>

							<div className="send-work-log-card__content">
								<div className="send-work-log-card__top">
									<div>
										<p className="send-work-log-card__title">{log.title}</p>
										<p className="send-work-log-card__vehicle">
											{getVehicleLabel(log.vehicle)}
										</p>
									</div>
									<strong>{formatCurrency(log.totalCharge)}</strong>
								</div>

								<p className="send-work-log-card__description">
									{log.description || "No customer-facing description added."}
								</p>

								<div className="send-work-log-card__meta">
									<span>Completed {formatWorkLogDate(log.completedAt)}</span>
									<span>
										Odometer {formatOdometer(log.odometerValue, log.odometerUnit)}
									</span>
									<span>
										Performed by{" "}
										{log.performedByUser?.fullName ||
											log.performedByUser?.email ||
											"staff"}
									</span>
								</div>
							</div>
						</label>
					);
				})}
			</div>
		</div>
	);
}

export default function SendWorkLogsToCustomerPageClient({ pageData }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const selectedCustomer = useMemo(
		() =>
			pageData.customers.find(
				(customer) => customer.id === pageData.selectedCustomerId,
			) || null,
		[pageData],
	);

	function handleCustomerChange(event) {
		const nextCustomerId = event.target.value;
		const params = new URLSearchParams(searchParams.toString());

		if (nextCustomerId) {
			params.set("customerId", nextCustomerId);
		} else {
			params.delete("customerId");
		}

		const queryString = params.toString();

		startTransition(() => {
			router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
				scroll: false,
			});
		});
	}

	if (!pageData.canSendWorkLogs) {
		return (
			<section className="send-work-logs-page">
				<Link href="/work-logs" className="send-work-logs-back">
					<ArrowLeft size={16} />
					Back to work logs
				</Link>

				<div className="send-work-logs-upgrade card">
					<div className="send-work-logs-upgrade__icon">
						<Mail size={22} />
					</div>
					<h2>Starter plan required</h2>
					<p>
						Sending work logs to customers by email is available on Starter,
						Pro, Business, and Custom plans.
					</p>
					<Link href="/settings?tab=billing">
						<Button variant="primary">View plans</Button>
					</Link>
				</div>
			</section>
		);
	}

	return (
		<section className="send-work-logs-page">
			<div className="send-work-logs-header">
				<div>
					<Link href="/work-logs" className="send-work-logs-back">
						<ArrowLeft size={16} />
						Back to work logs
					</Link>
					<p className="send-work-logs-page__eyebrow">Customer email</p>
					<h2>Send work logs to customer</h2>
					<p>
						Select one customer, choose one or more work logs, and send a
						formatted email with a PDF summary attached.
					</p>
				</div>
			</div>

			<div className="send-work-logs-panel card">
				<div className="send-work-logs-panel__top">
					<div>
						<p className="send-work-logs-panel__label">Customer</p>
						<h3>{getCustomerName(selectedCustomer)}</h3>
						<p>
							Internal notes are not included in the email or attached PDF.
						</p>
					</div>

					<div className="send-work-logs-customer-select">
						<label htmlFor="work-log-customer">Send to</label>
						<select
							id="work-log-customer"
							value={pageData.selectedCustomerId}
							onChange={handleCustomerChange}
							disabled={isPending}
						>
							{pageData.customers.map((customer) => (
								<option key={customer.id} value={customer.id}>
									{getCustomerName(customer)} - {customer.email}
								</option>
							))}
						</select>
					</div>
				</div>

				{pageData.customers.length === 0 ? (
					<div className="send-work-logs-empty">
						<p className="send-work-logs-empty__title">
							No customers ready to email
						</p>
						<p className="send-work-logs-empty__text">
							Add an email address to a customer with work logs before sending a
							summary.
						</p>
					</div>
				) : (
					<WorkLogSelection
						key={pageData.selectedCustomerId}
						customer={selectedCustomer}
						workLogs={pageData.workLogs}
						resendConfigured={pageData.resendConfigured}
						canSendWorkLogs={pageData.canSendWorkLogs}
					/>
				)}
			</div>
		</section>
	);
}
