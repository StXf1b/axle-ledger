"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import "./ConfirmModal.css";

export default function ConfirmModal({
	open,
	onClose,
	onConfirm,
	title = "Are you sure?",
	description = "Please confirm this action.",
	confirmText = "Confirm",
	cancelText = "Cancel",
	loading = false,
	danger = false,
	note = "",
	showCancelButton = true,
}) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return;

		function handleKeyDown(event) {
			if (event.key === "Escape" && !loading) {
				onClose?.();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = originalOverflow;
		};
	}, [open, loading, onClose]);

	if (!mounted || !open) return null;

	return createPortal(
		<div
			className="confirm-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-modal-title"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget && !loading) {
					onClose?.();
				}
			}}
		>
			<div
				className={`confirm-modal__card ${danger ? "confirm-modal__card--danger" : ""}`}
			>
				<div className="confirm-modal__header">
					<div className="confirm-modal__header-left">
						<div
							className={`confirm-modal__icon ${danger ? "confirm-modal__icon--danger" : ""}`}
						>
							<AlertTriangle size={20} />
						</div>

						<div className="confirm-modal__heading">
							<h3 id="confirm-modal-title">{title}</h3>
							<p>{description}</p>
						</div>
					</div>

					<button
						type="button"
						className="confirm-modal__close"
						onClick={onClose}
						disabled={loading}
						aria-label="Close confirmation modal"
					>
						<X size={18} />
					</button>
				</div>

				{note ? (
					<div className="confirm-modal__note">
						<p>{note}</p>
					</div>
				) : null}

				{showCancelButton ? (
					<div className="confirm-modal__actions">
						<button
							type="button"
							className="btn btn-secondary"
							onClick={onClose}
							disabled={loading}
						>
							{cancelText}
						</button>

						<button
							type="button"
							className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
							onClick={onConfirm}
							disabled={loading}
						>
							{loading ? "Working..." : confirmText}
						</button>
					</div>
				) : (
					<div className="confirm-modal__actions">
						<button
							type="button"
							className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
							onClick={onConfirm}
							disabled={loading}
						>
							{loading ? "Working..." : confirmText}
						</button>
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}
