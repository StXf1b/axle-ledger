"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	Download,
	Pencil,
	Mail,
	Phone,
	MapPin,
	Building2,
	StickyNote,
	CarFront,
	BadgeCheck,
	Plus,
	Copy,
} from "lucide-react";

import { exportCustomerData } from "@/actions/customers";
import { downloadCustomerExportFile } from "@/lib/customer-export-download";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import LinkedRemindersCard from "@/components/reminders/LinkedRemindersCard";
import LinkedDocumentsCard from "@/components/documents/LinkedDocumentsCard";
import CustomersNav from "@/components/customers/CustomersNav";
import CustomerExportModal from "@/components/customers/CustomerExportModal";

function getInitials(firstName, lastName, companyName) {
	if (firstName || lastName) {
		return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
	}

	return (companyName?.slice(0, 2) || "CU").toUpperCase();
}

export default function CustomerDetailView({
	customer,
	canExportCustomers = false,
	canEditCustomers = false,
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [exportModalOpen, setExportModalOpen] = useState(false);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const [editAccessModalOpen, setEditAccessModalOpen] = useState(false);
	const [exportFormat, setExportFormat] = useState("pdf");
	const [isExporting, setIsExporting] = useState(false);
	const [exportError, setExportError] = useState("");

	const createHref = useMemo(() => {
		const params = new URLSearchParams();
		params.set("customerId", customer.id);
		return `/vehicles/new?${params.toString()}`;
	}, [customer.id]);

	const activeTab = useMemo(() => {
		const value = searchParams.get("tab");
		if (["overview", "vehicles", "documents", "reminders"].includes(value)) {
			return value;
		}
		return "overview";
	}, [searchParams]);

	const getTotalVehicles = () => {
		return customer.vehicles ? customer.vehicles.length : 0;
	};

	function handleOpenExportModal() {
		if (!canExportCustomers) {
			setUpgradeModalOpen(true);
			return;
		}

		setExportModalOpen(true);
		setExportFormat("pdf");
		setExportError("");
	}

	function handleCloseExportModal() {
		if (isExporting) return;

		setExportModalOpen(false);
		setExportError("");
	}

	async function handleConfirmExport() {
		setIsExporting(true);
		setExportError("");

		try {
			const result = await exportCustomerData(customer.id, exportFormat);
			downloadCustomerExportFile(result);
			setExportModalOpen(false);
		} catch (error) {
			setExportError(
				error?.message || "Could not export this customer. Please try again.",
			);
		} finally {
			setIsExporting(false);
		}
	}

	function handleViewPlans() {
		setUpgradeModalOpen(false);
		router.push("/settings?tab=billing");
	}

	function handleEditCustomer() {
		if (!canEditCustomers) {
			setEditAccessModalOpen(true);
			return;
		}

		router.push(`/customers/${customer.id}/edit`);
	}

	return (
		<section className="customer-detail-page">
			<div className="customer-detail-page__topbar">
				<Link href="/customers" className="customer-detail-back">
					<ArrowLeft size={16} />
					Back to customers
				</Link>

				<div className="customer-detail-actions">
					<span
						title={
							canExportCustomers
								? "Export customer"
								: "Starter plan required to export customer data"
						}
					>
						<Button
							variant="secondary"
							leftIcon={<Download size={16} />}
							onClick={handleOpenExportModal}
							loading={isExporting}
						>
							Export
						</Button>
					</span>

					<Button
						variant="secondary"
						leftIcon={<Pencil size={16} />}
						onClick={handleEditCustomer}
					>
						Edit customer
					</Button>
				</div>
			</div>

			<CustomerExportModal
				open={exportModalOpen}
				customer={customer}
				format={exportFormat}
				onFormatChange={setExportFormat}
				onClose={handleCloseExportModal}
				onConfirm={handleConfirmExport}
				loading={isExporting}
				error={exportError}
			/>

			<ConfirmModal
				open={upgradeModalOpen}
				onClose={() => setUpgradeModalOpen(false)}
				onConfirm={handleViewPlans}
				title="Upgrade required"
				description="Your plan does not include this functionality. Upgrade to Starter or higher to export customer records as PDF or JSON."
				confirmText="View plans"
				cancelText="Not now"
				note="Customer exports are included on Starter, Pro, Business, and Custom plans."
			/>

			<ConfirmModal
				open={editAccessModalOpen}
				onClose={() => setEditAccessModalOpen(false)}
				onConfirm={() => setEditAccessModalOpen(false)}
				title="Admin access required"
				description="Only workspace admins and owners can edit customer records."
				confirmText="Got it"
				showCancelButton={false}
				note="Ask the workspace owner to make you an admin if you need to update customer details."
			/>

			<div className="customer-hero card">
				<div className="customer-hero__left">
					<div className="customer-hero__avatar">
						{getInitials(
							customer.firstName,
							customer.lastName,
							customer.companyName,
						)}
					</div>

					<div className="customer-hero__identity">
						<div className="customer-hero__heading">
							<h2>
								{customer.firstName} {customer.lastName}
							</h2>
							<span
								className={`badge ${
									customer.status === "ACTIVE"
										? "badge-success"
										: "badge-neutral"
								}`}
							>
								{customer.status}
							</span>
						</div>

						<p className="customer-hero__sub">
							{customer.companyName ? (
								<>
									<Building2 size={16} />
									{customer.companyName}
								</>
							) : (
								<>
									<BadgeCheck size={16} />
									Private customer
								</>
							)}
						</p>

						<div className="customer-hero__tags">
							{customer.tags.map((tag) => (
								<span key={tag} className="customer-detail-tag">
									{tag}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className="customer-hero__stats">
					<div className="customer-mini-stat">
						<p>Vehicles</p>
						<h4>{customer.vehicles.length}</h4>
					</div>
					<div className="customer-mini-stat">
						<p>Preferred contact</p>
						<h4>{customer.preferredContact}</h4>
					</div>
				</div>
			</div>
			<CustomersNav total={getTotalVehicles()} />
			{activeTab === "overview" && (
				<div className="customer-detail-grid">
					<div className="card stack-md">
						<h3 className="customer-detail-card__title">Contact details</h3>

						<div className="customer-detail-list">
							<div className="customer-detail-list__item">
								<span className="flex items-center gap-1 justify-between">
									<span>
										<Phone size={16} /> Phone
									</span>
									<span className="copy-icon" title="Copy phone to clipboard">
										<Copy
											onClick={() =>
												navigator.clipboard.writeText(customer.phone)
											}
											size={18}
										/>
									</span>
								</span>
								<strong>{customer.phone || "Not added"}</strong>
							</div>

							<div className="customer-detail-list__item">
								<span className="flex items-center gap-1 justify-between">
									<span>
										<Mail size={16} /> Email
									</span>
									<span className="copy-icon" title="Copy email to clipboard">
										<Copy
											onClick={() =>
												navigator.clipboard.writeText(customer.email)
											}
											size={18}
										/>
									</span>
								</span>
								<strong>{customer.email || "Not added"}</strong>
							</div>

							<div className="customer-detail-list__item">
								<span>
									<MapPin size={16} /> Address
								</span>
								<strong>
									{[
										customer.addressLine1,
										customer.addressLine2,
										customer.city,
										customer.county,
										customer.country,
									]
										.filter(Boolean)
										.join(", ") || "Not added"}
								</strong>
							</div>
						</div>
					</div>

					<div className="card stack-md">
						<h3 className="customer-detail-card__title">Internal notes</h3>

						<div className="customer-notes-box">
							<div className="customer-notes-box__icon">
								<StickyNote size={18} />
							</div>
							<p>{customer.notes || "No notes added yet."}</p>
						</div>
					</div>
				</div>
			)}

			{activeTab === "vehicles" && (
				<div className="card stack-md">
					<div className="customer-vehicles-header">
						<div className="linked-documents-card__header-left">
							<p className="linked-documents-card__eyebrow">Vehicles</p>
							<h3 className="linked-documents-card__title">
								Customer Vehicles
							</h3>
							<p className="linked-documents-card__subtitle">
								Manage and view all vehicles associated with this customer.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Link href="/vehicles" className="btn btn-secondary btn-sm">
								View all
							</Link>
							<Link href={createHref} className="btn btn-primary btn-sm">
								<Plus size={16} />
								Add vehicle
							</Link>
						</div>
					</div>
					<div className="customer-vehicles-table-wrap">
						<table className="customer-vehicles-table">
							<thead>
								<tr>
									<th>Registration</th>
									<th>Make</th>
									<th>Model</th>
								</tr>
							</thead>
							<tbody>
								{customer.vehicles.slice(0, 10).map((vehicle) => (
									<tr key={vehicle.id}>
										<td>
											<div className="customer-vehicle-reg">
												<CarFront size={16} />
												{vehicle.registration}
											</div>
										</td>
										<td>{vehicle.make}</td>
										<td>{vehicle.model}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
			{activeTab === "documents" && (
				<LinkedDocumentsCard
					title="Customer documents"
					subtitle="Recent files linked to this customer record."
					documents={customer.documents || []}
					customerId={customer.id}
				/>
			)}

			{activeTab === "reminders" && (
				<LinkedRemindersCard
					title="Customer reminders"
					subtitle="Follow-up, service, and compliance reminders linked to this customer."
					reminders={customer.reminders || []}
					customerId={customer.id}
					showVehicle
				/>
			)}
		</section>
	);
}
