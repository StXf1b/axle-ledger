"use client";

import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function CustomerEditAccessModal({ customerId }) {
	const router = useRouter();

	function returnToCustomer() {
		router.replace(`/customers/${customerId}`);
	}

	return (
		<ConfirmModal
			open
			onClose={returnToCustomer}
			onConfirm={returnToCustomer}
			title="Admin access required"
			description="Only workspace admins and owners can edit customer records."
			confirmText="Back to customer"
			showCancelButton={false}
			note="Ask the workspace owner to make you an admin if you need to update customer details."
		/>
	);
}
