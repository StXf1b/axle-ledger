import { notFound } from "next/navigation";
import "./customer-detail.css";
import CustomerDetailView from "@/components/customers/CustomerDetailView";
import { getCustomerById } from "@/lib/queries/customers";

export default async function CustomerDetailPage({ params }) {
	const { customerId } = await params;
	const customer = await getCustomerById(customerId);

	if (!customer) {
		notFound();
	}

	return <CustomerDetailView customer={customer} />;
}
