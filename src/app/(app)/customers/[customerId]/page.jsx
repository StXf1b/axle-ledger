import { notFound } from "next/navigation";
import "./customer-detail.css";
import CustomerDetailView from "@/components/customers/CustomerDetailView";
import {
	getCanExportCustomersForCurrentWorkspace,
	getCustomerById,
} from "@/lib/queries/customers";
import { getCurrentUserRoleContext } from "@/lib/queries/current-user-role";

export default async function CustomerDetailPage({ params }) {
	const { customerId } = await params;
	const [customer, canExportCustomers, roleContext] = await Promise.all([
		getCustomerById(customerId),
		getCanExportCustomersForCurrentWorkspace(),
		getCurrentUserRoleContext(),
	]);

	if (!customer) {
		notFound();
	}

	return (
		<CustomerDetailView
			customer={customer}
			canExportCustomers={canExportCustomers}
			canEditCustomers={["OWNER", "ADMIN"].includes(roleContext.role)}
		/>
	);
}
