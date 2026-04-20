import CustomerForm from "@/components/customers/CustomerForm";
import "@/components/customers/CustomerForm.css";

export const metadata = {
	title: "New Customer",
};

export default function NewCustomerPage() {
	return (
		<section className="customer-detail-page">
			<div className="customer-detail-page__topbar">
				<div>
					<p className="customers-page__eyebrow">Customer management</p>
					<h2 className="customers-page__title">New customer</h2>
					<p className="customers-page__subtitle">
						Create a customer record with contact details, preferences, and
						notes.
					</p>
				</div>
			</div>

			<div className="card" style={{ padding: "20px" }}>
				<CustomerForm mode="create" />
			</div>
		</section>
	);
}
