"use server";

import { Buffer } from "node:buffer";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canExportCustomerData } from "@/lib/billing/export-permissions";
import { getResolvedWorkspaceEntitlements } from "@/lib/billing/workspace-subscription";
import { assertWorkspaceLimit } from "@/lib/billing/workspace-quotas";
import {
	ABUSE_LIMITS,
	assertWorkspaceTierAbuseLimit,
} from "@/lib/abuse-limits";

const CUSTOMER_EXPORT_FORMATS = new Set(["pdf", "json"]);
const CUSTOMER_EDIT_ROLES = new Set(["OWNER", "ADMIN"]);

async function getWorkspaceContextOrThrow() {
	const { userId } = await auth();

	if (!userId) {
		throw new Error("Unauthorized");
	}

	const appUser = await db.user.findUnique({
		where: {
			clerkUserId: userId,
		},
		include: {
			memberships: true,
		},
	});

	if (!appUser || appUser.memberships.length === 0) {
		throw new Error("No workspace membership found");
	}

	return {
		appUser,
		membership: appUser.memberships[0],
		workspaceId: appUser.memberships[0].workspaceId,
	};
}

function normalizeTags(value) {
	if (!value) return [];

	if (Array.isArray(value)) {
		return value.map((tag) => tag.trim()).filter(Boolean);
	}

	return value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

function normalizeCustomerPayload(data) {
	return {
		firstName: data.firstName?.trim() || "",
		lastName: data.lastName?.trim() || "",
		companyName: data.companyName?.trim() || null,
		phone: data.phone?.trim() || null,
		email: data.email?.trim() || null,
		preferredContact: data.preferredContact || "PHONE",
		status: data.status || "ACTIVE",
		addressLine1: data.addressLine1?.trim() || null,
		addressLine2: data.addressLine2?.trim() || null,
		city: data.city?.trim() || null,
		county: data.county?.trim() || null,
		country: data.country?.trim() || "Ireland",
		notes: data.notes?.trim() || null,
		tags: normalizeTags(data.tags),
	};
}

function assertCanEditCustomers(membership) {
	if (!CUSTOMER_EDIT_ROLES.has(membership?.role)) {
		throw new Error("Only workspace admins and owners can edit customer records.");
	}
}

function normalizeExportFormat(format) {
	const safeFormat = String(format || "").toLowerCase();

	if (!CUSTOMER_EXPORT_FORMATS.has(safeFormat)) {
		throw new Error("Unsupported export format");
	}

	return safeFormat;
}

function toIsoString(value) {
	return value ? new Date(value).toISOString() : null;
}

function toMoneyString(value) {
	return value?.toString?.() || "0";
}

function safeFilePart(value) {
	return (
		String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "customer"
	);
}

function buildCustomerName(customer) {
	const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
	return name || customer.companyName || "Customer";
}

function buildUserSummary(user) {
	if (!user) return null;

	return {
		id: user.id,
		email: user.email,
		fullName:
			user.fullName ||
			[user.firstName, user.lastName].filter(Boolean).join(" ") ||
			null,
	};
}

function buildVehicleSummary(vehicle) {
	if (!vehicle) return null;

	return {
		id: vehicle.id,
		registration: vehicle.registration,
		make: vehicle.make,
		model: vehicle.model,
		year: vehicle.year,
	};
}

function serializeCustomerExport(customer, exportedBy) {
	return {
		export: {
			type: "customer",
			version: 1,
			exportedAt: new Date().toISOString(),
			exportedBy: buildUserSummary(exportedBy),
			workspace: customer.workspace
				? {
						id: customer.workspace.id,
						name: customer.workspace.name,
						slug: customer.workspace.slug,
						businessEmail: customer.workspace.businessEmail,
						businessPhone: customer.workspace.businessPhone,
						website: customer.workspace.website,
						address: {
							addressLine1: customer.workspace.addressLine1,
							addressLine2: customer.workspace.addressLine2,
							city: customer.workspace.city,
							county: customer.workspace.county,
							country: customer.workspace.country,
						},
					}
				: null,
		},
		customer: {
			id: customer.id,
			firstName: customer.firstName,
			lastName: customer.lastName,
			displayName: buildCustomerName(customer),
			companyName: customer.companyName,
			phone: customer.phone,
			email: customer.email,
			preferredContact: customer.preferredContact,
			status: customer.status,
			address: {
				addressLine1: customer.addressLine1,
				addressLine2: customer.addressLine2,
				city: customer.city,
				county: customer.county,
				country: customer.country,
			},
			notes: customer.notes,
			tags: customer.tags,
			createdAt: toIsoString(customer.createdAt),
			updatedAt: toIsoString(customer.updatedAt),
		},
		vehicles: customer.vehicles.map((vehicle) => ({
			id: vehicle.id,
			registration: vehicle.registration,
			vin: vehicle.vin,
			make: vehicle.make,
			model: vehicle.model,
			year: vehicle.year,
			odometerValue: vehicle.odometerValue,
			odometerUnit: vehicle.odometerUnit,
			fuelType: vehicle.fuelType,
			colour: vehicle.colour,
			status: vehicle.status,
			taxDueAt: toIsoString(vehicle.taxDueAt),
			insuranceDueAt: toIsoString(vehicle.insuranceDueAt),
			nctDueAt: toIsoString(vehicle.nctDueAt),
			serviceDueAt: toIsoString(vehicle.serviceDueAt),
			notes: vehicle.notes,
			createdAt: toIsoString(vehicle.createdAt),
			updatedAt: toIsoString(vehicle.updatedAt),
		})),
		workLogs: customer.workLogs.map((log) => ({
			id: log.id,
			title: log.title,
			description: log.description,
			completedAt: toIsoString(log.completedAt),
			odometerValue: log.odometerValue,
			odometerUnit: log.odometerUnit,
			labourCharge: toMoneyString(log.labourCharge),
			partsCharge: toMoneyString(log.partsCharge),
			totalCharge: toMoneyString(log.totalCharge),
			notes: log.notes,
			nextServiceDueAt: toIsoString(log.nextServiceDueAt),
			nextServiceOdometer: log.nextServiceOdometer,
			nextServiceOdometerUnit: log.nextServiceOdometerUnit,
			vehicle: buildVehicleSummary(log.vehicle),
			performedBy: buildUserSummary(log.performedByUser),
			createdBy: buildUserSummary(log.createdByUser),
			createdAt: toIsoString(log.createdAt),
			updatedAt: toIsoString(log.updatedAt),
		})),
		reminders: customer.reminders.map((reminder) => ({
			id: reminder.id,
			title: reminder.title,
			type: reminder.type,
			status: reminder.status,
			dueAt: toIsoString(reminder.dueAt),
			completedAt: toIsoString(reminder.completedAt),
			notes: reminder.notes,
			vehicle: buildVehicleSummary(reminder.vehicle),
			createdBy: buildUserSummary(reminder.createdByUser),
			createdAt: toIsoString(reminder.createdAt),
			updatedAt: toIsoString(reminder.updatedAt),
		})),
		documents: customer.documents.map((document) => ({
			id: document.id,
			title: document.title,
			fileName: document.fileName,
			mimeType: document.mimeType,
			fileExtension: document.fileExtension,
			sizeBytes: document.sizeBytes,
			category: document.category,
			notes: document.notes,
			vehicle: buildVehicleSummary(document.vehicle),
			uploadedBy: buildUserSummary(document.uploadedByUser),
			createdAt: toIsoString(document.createdAt),
			updatedAt: toIsoString(document.updatedAt),
		})),
	};
}

function valueOrDash(value) {
	return value === null || value === undefined || value === "" ? "-" : String(value);
}

function formatPdfDate(value) {
	if (!value) return "-";
	return new Date(value).toISOString().slice(0, 10);
}

function pdfSafeText(value) {
	return valueOrDash(value)
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value) {
	return pdfSafeText(value).replace(/[\\()]/g, "\\$&");
}

function wrapPdfLine(text, maxLength = 92) {
	const safeText = pdfSafeText(text);

	if (safeText.length <= maxLength) return [safeText];

	const words = safeText.split(/\s+/);
	const lines = [];
	let currentLine = "";

	words.forEach((word) => {
		const nextLine = currentLine ? `${currentLine} ${word}` : word;

		if (nextLine.length <= maxLength) {
			currentLine = nextLine;
			return;
		}

		if (currentLine) {
			lines.push(currentLine);
		}

		currentLine = word;
	});

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines;
}

function addPdfLine(lines, text = "") {
	wrapPdfLine(text).forEach((line) => lines.push(line));
}

function addPdfSection(lines, title) {
	lines.push("");
	lines.push(title.toUpperCase());
	lines.push("-".repeat(Math.min(72, title.length)));
}

function addPdfRecord(lines, index, title, fields) {
	lines.push(`${index}. ${valueOrDash(title)}`);
	fields.forEach(([label, value]) => {
		addPdfLine(lines, `   ${label}: ${valueOrDash(value)}`);
	});
}

function buildCustomerPdfLines(payload) {
	const lines = [];
	const customer = payload.customer;
	const address = [
		customer.address.addressLine1,
		customer.address.addressLine2,
		customer.address.city,
		customer.address.county,
		customer.address.country,
	]
		.filter(Boolean)
		.join(", ");

	lines.push("AxleLedger Customer Export");
	lines.push(`Generated: ${payload.export.exportedAt}`);
	lines.push(`Workspace: ${payload.export.workspace?.name || "-"}`);
	lines.push("");
	lines.push(`Customer: ${customer.displayName}`);
	lines.push(`Company: ${valueOrDash(customer.companyName)}`);
	lines.push(`Status: ${customer.status}`);
	lines.push(`Phone: ${valueOrDash(customer.phone)}`);
	lines.push(`Email: ${valueOrDash(customer.email)}`);
	lines.push(`Preferred contact: ${customer.preferredContact}`);
	lines.push(`Address: ${valueOrDash(address)}`);
	lines.push(`Tags: ${customer.tags.length ? customer.tags.join(", ") : "-"}`);
	addPdfLine(lines, `Notes: ${valueOrDash(customer.notes)}`);

	addPdfSection(lines, `Vehicles (${payload.vehicles.length})`);
	if (payload.vehicles.length === 0) {
		lines.push("No vehicles linked to this customer.");
	} else {
		payload.vehicles.forEach((vehicle, index) => {
			addPdfRecord(lines, index + 1, vehicle.registration, [
				["Make/model", `${vehicle.make} ${vehicle.model}`.trim()],
				["Year", vehicle.year],
				["VIN", vehicle.vin],
				["Odometer", `${valueOrDash(vehicle.odometerValue)} ${valueOrDash(vehicle.odometerUnit)}`],
				["Status", vehicle.status],
				["Tax due", formatPdfDate(vehicle.taxDueAt)],
				["Insurance due", formatPdfDate(vehicle.insuranceDueAt)],
				["NCT due", formatPdfDate(vehicle.nctDueAt)],
				["Service due", formatPdfDate(vehicle.serviceDueAt)],
				["Notes", vehicle.notes],
			]);
		});
	}

	addPdfSection(lines, `Work logs (${payload.workLogs.length})`);
	if (payload.workLogs.length === 0) {
		lines.push("No work logs linked to this customer.");
	} else {
		payload.workLogs.forEach((log, index) => {
			addPdfRecord(lines, index + 1, log.title, [
				["Completed", formatPdfDate(log.completedAt)],
				["Vehicle", log.vehicle?.registration],
				["Total", `EUR ${log.totalCharge}`],
				["Labour", `EUR ${log.labourCharge}`],
				["Parts", `EUR ${log.partsCharge}`],
				["Odometer", `${valueOrDash(log.odometerValue)} ${valueOrDash(log.odometerUnit)}`],
				["Description", log.description],
				["Notes", log.notes],
			]);
		});
	}

	addPdfSection(lines, `Reminders (${payload.reminders.length})`);
	if (payload.reminders.length === 0) {
		lines.push("No reminders linked to this customer.");
	} else {
		payload.reminders.forEach((reminder, index) => {
			addPdfRecord(lines, index + 1, reminder.title, [
				["Type", reminder.type],
				["Status", reminder.status],
				["Due", formatPdfDate(reminder.dueAt)],
				["Completed", formatPdfDate(reminder.completedAt)],
				["Vehicle", reminder.vehicle?.registration],
				["Notes", reminder.notes],
			]);
		});
	}

	addPdfSection(lines, `Documents (${payload.documents.length})`);
	if (payload.documents.length === 0) {
		lines.push("No documents linked to this customer.");
	} else {
		payload.documents.forEach((document, index) => {
			addPdfRecord(lines, index + 1, document.title, [
				["File", document.fileName],
				["Category", document.category],
				["MIME type", document.mimeType],
				["Size bytes", document.sizeBytes],
				["Vehicle", document.vehicle?.registration],
				["Created", formatPdfDate(document.createdAt)],
				["Notes", document.notes],
			]);
		});
	}

	return lines;
}

function getPdfLineHeight(line, nextLine) {
	if (!line.trim()) return 8;
	if (nextLine && /^-+$/.test(nextLine.trim())) return 30;
	if (/^-{3,}$/.test(line.trim())) return 0;
	if (/^\d+\.\s/.test(line)) return 22;

	if (line.includes(":")) {
		const { value } = splitPdfField(line);
		const wrapLength = line.startsWith("   ") ? 58 : 62;
		return Math.max(1, wrapPdfLine(value, wrapLength).length) * 12 + 5;
	}

	return Math.max(1, wrapPdfLine(line, 86).length) * 13;
}

function paginateMeasuredPdfLines(lines, maxPageHeight = 620) {
	const pages = [];
	let currentPage = [];
	let usedHeight = 0;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const nextLine = lines[index + 1];
		const isSectionHeader = nextLine && /^-+$/.test(nextLine.trim());
		const height = getPdfLineHeight(line, nextLine);

		if (currentPage.length && usedHeight + height > maxPageHeight) {
			pages.push(currentPage);
			currentPage = [];
			usedHeight = 0;
		}

		currentPage.push(line);

		if (isSectionHeader) {
			currentPage.push(nextLine);
			index += 1;
		}

		usedHeight += height;
	}

	if (currentPage.length) {
		pages.push(currentPage);
	}

	return pages.length ? pages : [["No export data found."]];
}

function pdfRect(x, y, width, height, color) {
	return `${color} rg\n${x} ${y} ${width} ${height} re f`;
}

function pdfText(
	text,
	{ x, y, font = "F1", size = 10, color = "0.16 0.20 0.29" },
) {
	return `BT\n/${font} ${size} Tf\n${color} rg\n${x} ${y} Td\n(${escapePdfText(text)}) Tj\nET`;
}

function splitPdfField(line) {
	const trimmedLine = pdfSafeText(line).trim();
	const separatorIndex = trimmedLine.indexOf(":");

	if (separatorIndex === -1) {
		return {
			label: "",
			value: trimmedLine,
		};
	}

	return {
		label: trimmedLine.slice(0, separatorIndex),
		value: trimmedLine.slice(separatorIndex + 1).trim(),
	};
}

function addPdfField(commands, line, y, { x = 56, labelWidth = 116 } = {}) {
	const { label, value } = splitPdfField(line);
	const valueLines = wrapPdfLine(value, 62);

	if (!label) {
		commands.push(
			pdfText(value, {
				x,
				y,
				size: 9,
				color: "0.25 0.31 0.41",
			}),
		);
		return y - 13;
	}

	commands.push(
		pdfText(`${label}:`, {
			x,
			y,
			font: "F2",
			size: 9,
			color: "0.20 0.27 0.39",
		}),
	);

	valueLines.forEach((valueLine, index) => {
		commands.push(
			pdfText(valueLine, {
				x: x + labelWidth,
				y: y - index * 12,
				size: 9,
				color: "0.25 0.31 0.41",
			}),
		);
	});

	return y - Math.max(1, valueLines.length) * 12 - 3;
}

function buildPdfPageContent(lines, { pageNumber, pageCount, payload }) {
	const customerNameLines = wrapPdfLine(payload.customer.displayName, 34).slice(
		0,
		2,
	);
	const workspaceLabel =
		payload.export.workspace?.name || "Workspace not recorded";
	const workspaceLine = wrapPdfLine(
		`Workspace: ${workspaceLabel} | Generated: ${formatPdfDate(
			payload.export.exportedAt,
		)}`,
		42,
	)[0];
	const commands = [
		pdfRect(0, 724, 612, 68, "0.92 0.96 1"),
		pdfRect(0, 728, 612, 2, "0.20 0.45 0.84"),
		pdfRect(318, 736, 250, 42, "1 1 1"),
		pdfRect(318, 736, 4, 42, "0.20 0.45 0.84"),
		pdfText("AxleLedger", {
			x: 48,
			y: 762,
			font: "F2",
			size: 11,
			color: "0.20 0.45 0.84",
		}),
		pdfText("Customer Export", {
			x: 48,
			y: 744,
			font: "F2",
			size: 18,
			color: "0.05 0.09 0.16",
		}),
		pdfText(customerNameLines[0] || "Customer", {
			x: 332,
			y: customerNameLines[1] ? 760 : 756,
			font: "F2",
			size: 11,
			color: "0.05 0.09 0.16",
		}),
		...(customerNameLines[1]
			? [
					pdfText(customerNameLines[1], {
						x: 332,
						y: 746,
						size: 9,
						color: "0.20 0.27 0.39",
					}),
				]
			: []),
		pdfText(workspaceLine, {
			x: 332,
			y: 740,
				size: 8,
				color: "0.35 0.42 0.54",
		}),
	];

	let y = 704;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const nextLine = lines[index + 1];

		if (!line.trim()) {
			y -= 8;
			continue;
		}

		if (/^-{3,}$/.test(line.trim())) {
			continue;
		}

		if (nextLine && /^-+$/.test(nextLine.trim())) {
			commands.push(pdfRect(44, y - 9, 524, 24, "0.94 0.97 1"));
			commands.push(pdfRect(44, y - 9, 4, 24, "0.20 0.45 0.84"));
			commands.push(
				pdfText(line, {
					x: 56,
					y: y - 1,
					font: "F2",
					size: 10,
					color: "0.20 0.45 0.84",
				}),
			);
			y -= 30;
			index += 1;
			continue;
		}

		if (/^\d+\.\s/.test(line)) {
			commands.push(pdfRect(52, y - 11, 508, 23, "0.98 0.99 1"));
			commands.push(pdfRect(52, y - 11, 3, 23, "0.56 0.67 0.84"));
			commands.push(
				pdfText(line, {
					x: 56,
					y: y + 1,
					font: "F2",
					size: 10,
					color: "0.10 0.15 0.23",
				}),
			);
			y -= 22;
			continue;
		}

		if (line.includes(":")) {
			y = addPdfField(commands, line, y, {
				x: line.startsWith("   ") ? 72 : 56,
				labelWidth: line.startsWith("   ") ? 104 : 116,
			});
			continue;
		}

		commands.push(
			pdfText(line, {
				x: 56,
				y,
				size: 9,
				color: "0.25 0.31 0.41",
			}),
		);
		y -= 13;
	}

	commands.push(pdfRect(44, 54, 524, 1, "0.86 0.90 0.96"));
	commands.push(
		pdfText(`Page ${pageNumber} of ${pageCount}`, {
			x: 48,
			y: 36,
			size: 8,
			color: "0.44 0.50 0.60",
		}),
	);

	return commands.join("\n");
}

function buildPdfBase64(payload) {
	const pages = paginateMeasuredPdfLines(buildCustomerPdfLines(payload).slice(4));
	const objects = [];

	objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
	objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
	objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

	const pageObjectIds = [];

	pages.forEach((pageLines, index) => {
		const content = buildPdfPageContent(pageLines, {
			pageNumber: index + 1,
			pageCount: pages.length,
			payload,
		});
		const pageObjectId = objects.length;
		const contentObjectId = pageObjectId + 1;

		pageObjectIds.push(pageObjectId);
		objects[pageObjectId] =
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
		objects[contentObjectId] =
			`<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`;
	});

	objects[2] =
		`<< /Type /Pages /Kids [${pageObjectIds
			.map((id) => `${id} 0 R`)
			.join(" ")}] /Count ${pageObjectIds.length} >>`;

	let pdf = "%PDF-1.4\n";
	const offsets = [0];

	for (let index = 1; index < objects.length; index += 1) {
		offsets[index] = Buffer.byteLength(pdf, "ascii");
		pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
	}

	const xrefOffset = Buffer.byteLength(pdf, "ascii");
	pdf += `xref\n0 ${objects.length}\n`;
	pdf += "0000000000 65535 f \n";

	for (let index = 1; index < objects.length; index += 1) {
		pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
	}

	pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n`;
	pdf += `startxref\n${xrefOffset}\n%%EOF`;

	return Buffer.from(pdf, "ascii").toString("base64");
}

async function assertCustomerExportAccess(workspaceId) {
	const entitlements = await getResolvedWorkspaceEntitlements(workspaceId);

	if (!canExportCustomerData(entitlements)) {
		throw new Error("Customer exports require the Starter plan or higher.");
	}

	return entitlements;
}

export async function createCustomer(data) {
	const { workspaceId } = await getWorkspaceContextOrThrow();

	const payload = normalizeCustomerPayload(data);

	if (!payload.firstName) {
		throw new Error("First name is required");
	}

	if (!payload.lastName) {
		throw new Error("Last name is required");
	}

	await assertWorkspaceLimit(workspaceId, "customers");

	const customer = await db.customer.create({
		data: {
			workspaceId,
			...payload,
		},
	});

	revalidatePath("/customers");

	return {
		ok: true,
		customerId: customer.id,
	};
}

export async function exportCustomerData(customerId, format) {
	const { appUser, workspaceId } = await getWorkspaceContextOrThrow();
	const exportFormat = normalizeExportFormat(format);

	if (!customerId || typeof customerId !== "string") {
		throw new Error("Customer not found");
	}

	const entitlements = await assertCustomerExportAccess(workspaceId);

	const customer = await db.customer.findFirst({
		where: {
			id: customerId,
			workspaceId,
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			companyName: true,
			phone: true,
			email: true,
			preferredContact: true,
			status: true,
			addressLine1: true,
			addressLine2: true,
			city: true,
			county: true,
			country: true,
			notes: true,
			tags: true,
			createdAt: true,
			updatedAt: true,
			workspace: {
				select: {
					id: true,
					name: true,
					slug: true,
					businessEmail: true,
					businessPhone: true,
					website: true,
					addressLine1: true,
					addressLine2: true,
					city: true,
					county: true,
					country: true,
				},
			},
			vehicles: {
				orderBy: [{ createdAt: "desc" }],
				select: {
					id: true,
					registration: true,
					vin: true,
					make: true,
					model: true,
					year: true,
					odometerValue: true,
					odometerUnit: true,
					fuelType: true,
					colour: true,
					status: true,
					taxDueAt: true,
					insuranceDueAt: true,
					nctDueAt: true,
					serviceDueAt: true,
					notes: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			workLogs: {
				orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
				select: {
					id: true,
					title: true,
					description: true,
					completedAt: true,
					odometerValue: true,
					odometerUnit: true,
					labourCharge: true,
					partsCharge: true,
					totalCharge: true,
					notes: true,
					nextServiceDueAt: true,
					nextServiceOdometer: true,
					nextServiceOdometerUnit: true,
					createdAt: true,
					updatedAt: true,
					vehicle: {
						select: {
							id: true,
							registration: true,
							make: true,
							model: true,
							year: true,
						},
					},
					performedByUser: {
						select: {
							id: true,
							email: true,
							fullName: true,
							firstName: true,
							lastName: true,
						},
					},
					createdByUser: {
						select: {
							id: true,
							email: true,
							fullName: true,
							firstName: true,
							lastName: true,
						},
					},
				},
			},
			reminders: {
				orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
				select: {
					id: true,
					title: true,
					type: true,
					status: true,
					dueAt: true,
					completedAt: true,
					notes: true,
					createdAt: true,
					updatedAt: true,
					vehicle: {
						select: {
							id: true,
							registration: true,
							make: true,
							model: true,
							year: true,
						},
					},
					createdByUser: {
						select: {
							id: true,
							email: true,
							fullName: true,
							firstName: true,
							lastName: true,
						},
					},
				},
			},
			documents: {
				orderBy: [{ createdAt: "desc" }],
				select: {
					id: true,
					title: true,
					fileName: true,
					mimeType: true,
					fileExtension: true,
					sizeBytes: true,
					category: true,
					notes: true,
					createdAt: true,
					updatedAt: true,
					vehicle: {
						select: {
							id: true,
							registration: true,
							make: true,
							model: true,
							year: true,
						},
					},
					uploadedByUser: {
						select: {
							id: true,
							email: true,
							fullName: true,
							firstName: true,
							lastName: true,
						},
					},
				},
			},
		},
	});

	if (!customer) {
		throw new Error("Customer not found");
	}

	await assertWorkspaceTierAbuseLimit({
		workspaceId,
		entitlements,
		...ABUSE_LIMITS.customerExport,
	});

	const payload = serializeCustomerExport(customer, appUser);
	const fileBase = safeFilePart(`${payload.customer.displayName}-${customer.id}`);

	if (exportFormat === "json") {
		return {
			ok: true,
			fileName: `${fileBase}.json`,
			mimeType: "application/json",
			encoding: "text",
			content: JSON.stringify(payload, null, 2),
		};
	}

	return {
		ok: true,
		fileName: `${fileBase}.pdf`,
		mimeType: "application/pdf",
		encoding: "base64",
		content: buildPdfBase64(payload),
	};
}

export async function updateCustomer(customerId, data) {
	const { membership, workspaceId } = await getWorkspaceContextOrThrow();

	assertCanEditCustomers(membership);

	const existingCustomer = await db.customer.findFirst({
		where: {
			id: customerId,
			workspaceId,
		},
	});

	if (!existingCustomer) {
		throw new Error("Customer not found");
	}

	const payload = normalizeCustomerPayload(data);

	if (!payload.firstName) {
		throw new Error("First name is required");
	}

	if (!payload.lastName) {
		throw new Error("Last name is required");
	}

	await db.customer.update({
		where: {
			id: customerId,
		},
		data: payload,
	});

	revalidatePath("/customers");
	revalidatePath(`/customers/${customerId}`);

	return {
		ok: true,
		customerId,
	};
}
