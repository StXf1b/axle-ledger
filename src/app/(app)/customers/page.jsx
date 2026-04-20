import "./customers.css";
import CustomersPageClient from "./CustomersPageClient";
import { getCustomersList } from "@/lib/queries/customers";

export const metadata = {
	title: "Customers",
};

export default async function CustomersPage() {
	const customers = await getCustomersList();

	return <CustomersPageClient initialCustomers={customers} />;
}
