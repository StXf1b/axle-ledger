import { notFound } from "next/navigation";
import CustomerForm from "@/components/customers/CustomerForm";
import "@/components/customers/CustomerForm.css";
import { getCustomerById } from "@/lib/queries/customers";

export const metadata = {
	title: "Edit Customer",
};

export default async function EditCustomerPage({ params }) {
	const { customerId } = await params;
	const customer = await getCustomerById(customerId);

	if (!customer) {
		notFound();
	}

	return (
		<section className="customer-detail-page">
			<div className="customer-detail-page__topbar">
				<div>
					<p className="customers-page__eyebrow">Customer management</p>
					<h2 className="customers-page__title">Edit customer</h2>
					<p className="customers-page__subtitle">
						Update customer details, address, contact preferences, and notes.
					</p>
				</div>
			</div>

			<div className="card" style={{ padding: "20px" }}>
				<CustomerForm
					mode="edit"
					customerId={customer.id}
					initialData={customer}
				/>
			</div>
		</section>
	);
}
