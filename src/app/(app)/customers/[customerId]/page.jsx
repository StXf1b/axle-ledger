import { notFound } from "next/navigation";
import "./customer-detail.css";
import CustomerDetailView from "@/components/customers/CustomerDetailView";
import {
	getCanExportCustomersForCurrentWorkspace,
	getCustomerById,
} from "@/lib/queries/customers";

export default async function CustomerDetailPage({ params }) {
	const { customerId } = await params;
	const [customer, canExportCustomers] = await Promise.all([
		getCustomerById(customerId),
		getCanExportCustomersForCurrentWorkspace(),
	]);

	if (!customer) {
		notFound();
	}

	return (
		<CustomerDetailView
			customer={customer}
			canExportCustomers={canExportCustomers}
		/>
	);
}
