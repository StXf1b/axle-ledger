"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	FileText,
	Upload,
	UserRound,
	CarFront,
	Paperclip,
} from "lucide-react";
import "./DocumentForm.css";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
	createDocument,
	updateDocument,
	deleteDocument,
} from "@/actions/documents";
import {
	DOCUMENT_CATEGORY_OPTIONS,
	formatFileSize,
} from "@/lib/document-utils";
import ConfirmModal from "@/components/ui/ConfirmModal";

function stripExtension(fileName = "") {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1) return fileName;
	return fileName.slice(0, lastDot);
}

export default function DocumentForm({
	mode = "create",
	initialData = null,
	documentId = null,
	customers = [],
	vehicles = [],
}) {
	const router = useRouter();

	const [form, setForm] = useState({
		title: initialData?.title || "",
		category: initialData?.category || "GENERAL",
		customerId: initialData?.customerId || "",
		vehicleId: initialData?.vehicleId || "",
		notes: initialData?.notes || "",
		fileName: initialData?.fileName || "",
		fileKey: initialData?.fileKey || "",
		mimeType: initialData?.mimeType || "",
		sizeBytes: initialData?.sizeBytes?.toString() || "",
	});

	const [selectedFile, setSelectedFile] = useState(null);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showErrorModal, setShowErrorModal] = useState(false);

	const filteredVehicles = useMemo(() => {
		if (!form.customerId) return vehicles;

		return vehicles.filter(
			(vehicle) =>
				vehicle.customerId === form.customerId || vehicle.id === form.vehicleId,
		);
	}, [vehicles, form.customerId, form.vehicleId]);

	function handleChange(event) {
		const { name, value } = event.target;

		setForm((prev) => ({
			...prev,
			[name]: value,
		}));

		setError("");
	}

	function handleFileChange(event) {
		const file = event.target.files?.[0] || null;
		setSelectedFile(file);
		setError("");

		if (!file) return;

		setForm((prev) => ({
			...prev,
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
			sizeBytes: String(file.size),
			title: prev.title || stripExtension(file.name),
		}));
	}

	async function uploadFileToR2(file) {
		const response = await fetch("/api/documents/upload-url", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fileName: file.name,
				fileType: file.type || "application/octet-stream",
				title: form.title,
			}),
		});

		let data = null;
		try {
			data = await response.json();
		} catch {
			throw new Error("Failed to read upload URL response.");
		}

		if (!response.ok) {
			throw new Error(data?.error || "Failed to create upload URL.");
		}

		let uploadResponse;

		try {
			uploadResponse = await fetch(data.uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": file.type || "application/octet-stream",
				},
				body: file,
			});
		} catch (error) {
			console.error("R2 upload network error:", error);
			throw new Error(
				"Browser upload failed. Check R2 bucket CORS policy and allowed origins.",
			);
		}

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text().catch(() => "");
			console.error("R2 upload failed:", uploadResponse.status, errorText);

			throw new Error(
				`Upload failed with status ${uploadResponse.status}. Check CORS or signed request headers.`,
			);
		}

		return {
			fileKey: data.key,
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
			sizeBytes: file.size,
		};
	}

	async function handleSubmit(event) {
		event.preventDefault();

		setIsSubmitting(true);
		setError("");

		try {
			let payload = {
				...form,
			};

			if (selectedFile) {
				const uploadedFile = await uploadFileToR2(selectedFile);

				payload = {
					...payload,
					...uploadedFile,
				};
			}

			if (mode === "create" && !payload.fileKey) {
				throw new Error("Please select a file to upload.");
			}

			if (mode === "edit" && documentId) {
				const result = await updateDocument(documentId, payload);
				router.push(`/documents/${result.documentId}`);
				router.refresh();
				return;
			}

			const result = await createDocument(payload);
			router.push(`/documents/${result.documentId}`);
			router.refresh();
		} catch (err) {
			setError(err?.message || "Failed to save document.");
			setShowErrorModal(true);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!documentId) return;

		const confirmed = window.confirm("Delete this document?");
		if (!confirmed) return;

		setIsSubmitting(true);
		setError("");

		try {
			await deleteDocument(documentId);
			router.push("/documents");
			router.refresh();
		} catch (err) {
			setError(err?.message || "Failed to delete document.");
			setShowErrorModal(true);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="document-form-ui">
			<div className="document-form-ui__section">
				<div className="document-form-ui__section-header">
					<h3>Document details</h3>
					<p>Store the title, category, and linked workshop records.</p>
				</div>

				<div className="document-form-ui__grid">
					<Input
						label="Document title"
						name="title"
						value={form.title}
						onChange={handleChange}
						placeholder="Vehicle inspection report"
						icon={<FileText size={18} />}
						required
					/>

					<div className="field">
						<label className="field-label" htmlFor="category">
							Category
						</label>
						<select
							id="category"
							name="category"
							value={form.category}
							onChange={handleChange}
							className="select"
						>
							{DOCUMENT_CATEGORY_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div className="field">
						<label className="field-label" htmlFor="customerId">
							Linked customer
						</label>
						<select
							id="customerId"
							name="customerId"
							value={form.customerId}
							onChange={handleChange}
							className="select"
						>
							<option value="">No customer linked</option>
							{customers.map((customer) => (
								<option key={customer.id} value={customer.id}>
									{customer.companyName ||
										`${customer.firstName} ${customer.lastName}`}
								</option>
							))}
						</select>
					</div>

					<div className="field">
						<label className="field-label" htmlFor="vehicleId">
							Linked vehicle
						</label>
						<select
							id="vehicleId"
							name="vehicleId"
							value={form.vehicleId}
							onChange={handleChange}
							className="select"
						>
							<option value="">No vehicle linked</option>
							{filteredVehicles.map((vehicle) => (
								<option key={vehicle.id} value={vehicle.id}>
									{vehicle.registration} · {vehicle.make} {vehicle.model}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			<div className="document-form-ui__section">
				<div className="document-form-ui__section-header">
					<h3>{mode === "edit" ? "Replace file" : "Upload file"}</h3>
					<p>
						Choose the document file here. File name, type, and size are filled
						automatically.
					</p>
				</div>

				<label className="document-form-ui__upload">
					<input
						type="file"
						onChange={handleFileChange}
						className="document-form-ui__file-input"
					/>

					<div className="document-form-ui__upload-icon">
						<Upload size={20} />
					</div>

					<div className="stack-sm">
						<strong style={{ color: "var(--text)" }}>
							{selectedFile
								? "File selected"
								: mode === "edit"
									? "Choose a new file to replace the current one"
									: "Choose a file to upload"}
						</strong>

						<p className="text-muted">
							PDFs, images, receipts, service sheets, and workshop documents.
						</p>
					</div>
				</label>

				{selectedFile || form.fileKey ? (
					<div className="document-form-ui__file-summary">
						<div className="document-form-ui__file-summary-top">
							<span className="document-form-ui__file-badge">
								<Paperclip size={15} />
								File details
							</span>
						</div>

						<div className="document-form-ui__file-meta">
							<div>
								<p className="document-form-ui__file-label">Name</p>
								<p className="document-form-ui__file-value">
									{selectedFile ? selectedFile.name : form.fileName}
								</p>
							</div>

							<div>
								<p className="document-form-ui__file-label">Type</p>
								<p className="document-form-ui__file-value">
									{selectedFile
										? selectedFile.type || "application/octet-stream"
										: form.mimeType || "—"}
								</p>
							</div>

							<div>
								<p className="document-form-ui__file-label">Size</p>
								<p className="document-form-ui__file-value">
									{formatFileSize(
										selectedFile
											? selectedFile.size
											: Number(form.sizeBytes || 0),
									)}
								</p>
							</div>
						</div>
					</div>
				) : null}
			</div>

			<div className="document-form-ui__section">
				<div className="document-form-ui__section-header">
					<h3>Internal notes</h3>
					<p>Add workshop context, document purpose, or anything useful.</p>
				</div>

				<div className="field">
					<label className="field-label" htmlFor="notes">
						Notes
					</label>
					<textarea
						id="notes"
						name="notes"
						value={form.notes}
						onChange={handleChange}
						className="textarea"
						placeholder="Add useful notes about this document..."
					/>
				</div>
			</div>

			<div className="document-form-ui__actions">
				<div>
					{mode === "edit" ? (
						<Button
							type="button"
							variant="danger"
							onClick={handleDelete}
							disabled={isSubmitting}
						>
							Delete document
						</Button>
					) : null}
				</div>

				<div className="document-form-ui__actions-right">
					<Button
						type="button"
						variant="secondary"
						onClick={() =>
							router.push(
								mode === "edit" && documentId
									? `/documents/${documentId}`
									: "/documents",
							)
						}
						disabled={isSubmitting}
					>
						Cancel
					</Button>

					<Button
						type="submit"
						variant="primary"
						loading={isSubmitting}
						rightIcon={!isSubmitting ? <ArrowRight size={18} /> : null}
					>
						{mode === "edit" ? "Save document" : "Upload document"}
					</Button>
				</div>
			</div>
			<ConfirmModal
				open={showErrorModal}
				onClose={() => setShowErrorModal(false)}
				title="Error"
				description={error}
				confirmText="Close"
				danger
				onConfirm={() => setShowErrorModal(false)}
				showCancelButton={false}
			/>
		</form>
	);
}
