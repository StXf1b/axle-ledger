"use client";

import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function DocumentEditAccessModal({ documentId }) {
	const router = useRouter();

	function returnToDocument() {
		router.replace(`/documents/${documentId}`);
	}

	return (
		<ConfirmModal
			open
			onClose={returnToDocument}
			onConfirm={returnToDocument}
			title="Admin access required"
			description="Only workspace admins and owners can edit document records."
			confirmText="Back to document"
			showCancelButton={false}
			note="Ask the workspace owner to make you an admin if you need to update document details."
		/>
	);
}
