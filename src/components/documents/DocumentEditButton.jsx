"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function DocumentEditButton({
	documentId,
	canEditDocuments = false,
}) {
	const router = useRouter();
	const [accessModalOpen, setAccessModalOpen] = useState(false);

	function handleEditDocument() {
		if (!canEditDocuments) {
			setAccessModalOpen(true);
			return;
		}

		router.push(`/documents/${documentId}/edit`);
	}

	return (
		<>
			<button
				type="button"
				className="btn btn-secondary"
				onClick={handleEditDocument}
			>
				<PencilLine size={18} />
				Edit document
			</button>

			<ConfirmModal
				open={accessModalOpen}
				onClose={() => setAccessModalOpen(false)}
				onConfirm={() => setAccessModalOpen(false)}
				title="Admin access required"
				description="Only workspace admins and owners can edit document records."
				confirmText="Got it"
				showCancelButton={false}
				note="Ask the workspace owner to make you an admin if you need to update document details."
			/>
		</>
	);
}
