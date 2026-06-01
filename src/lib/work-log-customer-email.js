import { Buffer } from "node:buffer";

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function valueOrDash(value) {
	return value === null || value === undefined || value === "" ? "-" : String(value);
}

function formatDate(value) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en-IE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

function formatMoney(value) {
	const numeric = Number(value || 0);

	if (!Number.isFinite(numeric)) return "EUR 0.00";

	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
	}).format(numeric);
}

function formatMoneyPdf(value) {
	const numeric = Number(value || 0);
	if (!Number.isFinite(numeric)) return "EUR 0.00";
	return `EUR ${numeric.toFixed(2)}`;
}

function formatOdometer(value, unit) {
	if (value === null || value === undefined || value === "") return "-";
	return `${new Intl.NumberFormat("en-IE").format(Number(value))} ${unit || ""}`.trim();
}

function getCustomerName(customer) {
	return (
		customer.companyName ||
		[customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
		"Customer"
	);
}

function getVehicleLabel(vehicle) {
	if (!vehicle) return "Vehicle not recorded";
	return `${vehicle.registration} - ${vehicle.make} ${vehicle.model}`.trim();
}

function getWorkspaceAddress(workspace) {
	return [
		workspace?.addressLine1,
		workspace?.addressLine2,
		workspace?.city,
		workspace?.county,
		workspace?.country,
	]
		.filter(Boolean)
		.join(", ");
}

function sumCharges(workLogs, field) {
	return workLogs.reduce((total, log) => total + Number(log[field] || 0), 0);
}

function safeFilePart(value) {
	return (
		String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 70) || "work-logs"
	);
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

function wrapPdfLine(text, maxLength = 82) {
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

function addPdfField(lines, label, value) {
	addPdfLine(lines, `   ${label}: ${valueOrDash(value)}`);
}

function buildPdfLines({ workspace, customer, workLogs }) {
	const lines = [];
	const customerName = getCustomerName(customer);
	const billedTotal = sumCharges(workLogs, "totalCharge");

	lines.push("AxleLedger Work Summary");
	lines.push(`Customer: ${customerName}`);
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push("");
	lines.push(`Workshop: ${workspace?.name || "-"}`);
	lines.push(`Workshop contact: ${workspace?.businessEmail || workspace?.businessPhone || "-"}`);
	lines.push(`Workshop address: ${getWorkspaceAddress(workspace) || "-"}`);
	lines.push(`Prepared for: ${customerName}`);
	lines.push(`Email: ${customer.email}`);
	lines.push(`Work logs included: ${workLogs.length}`);
	lines.push(`Total billed: ${formatMoneyPdf(billedTotal)}`);

	addPdfSection(lines, "Work completed");

	workLogs.forEach((log, index) => {
		lines.push(`${index + 1}. ${log.title}`);
		addPdfField(lines, "Completed", formatDate(log.completedAt));
		addPdfField(lines, "Vehicle", getVehicleLabel(log.vehicle));
		addPdfField(lines, "Odometer", formatOdometer(log.odometerValue, log.odometerUnit));
		addPdfField(lines, "Description", log.description || "No description provided.");
		addPdfField(lines, "Labour", formatMoneyPdf(log.labourCharge));
		addPdfField(lines, "Parts", formatMoneyPdf(log.partsCharge));
		addPdfField(lines, "Total", formatMoneyPdf(log.totalCharge));

		if (log.nextServiceDueAt || log.nextServiceOdometer) {
			addPdfField(lines, "Next service due", formatDate(log.nextServiceDueAt));
			addPdfField(
				lines,
				"Next service odometer",
				formatOdometer(log.nextServiceOdometer, log.nextServiceOdometerUnit),
			);
		}

		lines.push("");
	});

	return lines;
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

function addPdfFieldCommands(commands, line, y, { x = 56, labelWidth = 118 } = {}) {
	const { label, value } = splitPdfField(line);
	const valueLines = wrapPdfLine(value, 58);

	if (!label) {
		commands.push(pdfText(value, { x, y, size: 9, color: "0.25 0.31 0.41" }));
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

function paginatePdfLines(lines, maxPageHeight = 620) {
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

	return pages.length ? pages : [["No work logs found."]];
}

function buildPdfPageContent(pageLines, { pageNumber, pageCount, customer, workspace }) {
	const customerNameLines = wrapPdfLine(getCustomerName(customer), 34).slice(0, 2);
	const workspaceNameLines = wrapPdfLine(workspace?.name || "Workshop", 30).slice(
		0,
		2,
	);
	const commands = [
		pdfRect(0, 724, 612, 68, "0.91 0.96 1"),
		pdfRect(0, 728, 612, 2, "0.20 0.45 0.84"),
		pdfRect(318, 736, 250, 42, "1 1 1"),
		pdfRect(318, 736, 4, 42, "0.20 0.45 0.84"),
		pdfText(workspaceNameLines[0] || "Workshop", {
			x: 48,
			y: workspaceNameLines[1] ? 764 : 762,
			font: "F2",
			size: 11,
			color: "0.20 0.45 0.84",
		}),
		...(workspaceNameLines[1]
			? [
					pdfText(workspaceNameLines[1], {
						x: 48,
						y: 751,
						size: 8,
						color: "0.20 0.45 0.84",
					}),
				]
			: []),
		pdfText("Work Summary", {
			x: 48,
			y: 740,
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
		pdfText(`Generated ${formatDate(new Date())}`, {
			x: 332,
			y: 740,
			size: 8,
			color: "0.35 0.42 0.54",
		}),
	];

	let y = 704;

	for (let index = 0; index < pageLines.length; index += 1) {
		const line = pageLines[index];
		const nextLine = pageLines[index + 1];

		if (!line.trim()) {
			y -= 8;
			continue;
		}

		if (/^-{3,}$/.test(line.trim())) {
			continue;
		}

		if (nextLine && /^-+$/.test(nextLine.trim())) {
			commands.push(pdfRect(44, y - 9, 524, 24, "0.95 0.97 1"));
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
			y = addPdfFieldCommands(commands, line, y, {
				x: line.startsWith("   ") ? 72 : 56,
				labelWidth: line.startsWith("   ") ? 110 : 118,
			});
			continue;
		}

		commands.push(pdfText(line, { x: 56, y, size: 9, color: "0.25 0.31 0.41" }));
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
	const pages = paginatePdfLines(buildPdfLines(payload));
	const objects = [];

	objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
	objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
	objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

	const pageObjectIds = [];

	pages.forEach((pageLines, index) => {
		const content = buildPdfPageContent(pageLines, {
			pageNumber: index + 1,
			pageCount: pages.length,
			customer: payload.customer,
			workspace: payload.workspace,
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

function buildEmailRows(workLogs) {
	return workLogs
		.map(
			(log) => `
				<tr>
					<td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb;">
						<strong style="display:block; color:#0f172a; font-size:15px;">${escapeHtml(log.title)}</strong>
						<span style="display:block; color:#64748b; margin-top:4px;">${escapeHtml(getVehicleLabel(log.vehicle))}</span>
						<span style="display:block; color:#64748b; margin-top:4px;">Completed ${escapeHtml(formatDate(log.completedAt))}</span>
					</td>
					<td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb; text-align:right; color:#0f172a; font-weight:700;">
						${escapeHtml(formatMoney(log.totalCharge))}
					</td>
				</tr>
			`,
		)
		.join("");
}

function buildPlainText({ workspace, customer, workLogs }) {
	const lines = [
		`${workspace?.name || "Your workshop"} has sent your work summary.`,
		"",
		`Customer: ${getCustomerName(customer)}`,
		`Work logs included: ${workLogs.length}`,
		`Total: ${formatMoney(sumCharges(workLogs, "totalCharge"))}`,
		"",
		"Work completed:",
	];

	workLogs.forEach((log, index) => {
		lines.push(
			`${index + 1}. ${log.title} - ${getVehicleLabel(log.vehicle)} - ${formatDate(
				log.completedAt,
			)} - ${formatMoney(log.totalCharge)}`,
		);
	});

	lines.push("", "A PDF copy is attached.");

	return lines.join("\n");
}

export function buildWorkLogCustomerEmailPayload({ workspace, customer, workLogs }) {
	const customerName = getCustomerName(customer);
	const total = sumCharges(workLogs, "totalCharge");
	const subject = `${workspace?.name || "Your workshop"} work summary`;
	const pdfContent = buildPdfBase64({ workspace, customer, workLogs });
	const filename = `${safeFilePart(customerName)}-work-summary.pdf`;
	const html = `
		<div style="margin:0; padding:0; background:#f8fafc; font-family:Arial, sans-serif; color:#0f172a;">
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc; padding:32px 16px;">
				<tr>
					<td align="center">
						<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border:1px solid #e5e7eb; border-radius:18px; overflow:hidden;">
							<tr>
								<td style="padding:28px 30px; background:#eff6ff; border-bottom:3px solid #3b82f6;">
									<p style="margin:0; color:#2563eb; font-weight:700; font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">${escapeHtml(workspace?.name || "Workshop")}</p>
									<h1 style="margin:8px 0 0; font-size:24px; line-height:1.25; color:#0f172a;">Your vehicle work summary</h1>
									<p style="margin:10px 0 0; color:#475569; line-height:1.6;">Hi ${escapeHtml(customerName)}, attached is a PDF summary of the completed work on your vehicle.</p>
								</td>
							</tr>
							<tr>
								<td style="padding:24px 30px;">
									<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
										<tr>
											<td style="padding:14px; border:1px solid #e5e7eb; border-radius:14px;">
												<span style="display:block; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Logs included</span>
												<strong style="display:block; margin-top:6px; font-size:22px;">${workLogs.length}</strong>
											</td>
											<td width="12"></td>
											<td style="padding:14px; border:1px solid #e5e7eb; border-radius:14px;">
												<span style="display:block; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Total</span>
												<strong style="display:block; margin-top:6px; font-size:22px;">${escapeHtml(formatMoney(total))}</strong>
											</td>
										</tr>
									</table>

									<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;">
										${buildEmailRows(workLogs)}
									</table>

									<p style="margin:24px 0 0; color:#475569; line-height:1.7;">The attached PDF includes the vehicle, completion date, odometer reading, work description, and charges for each selected log.</p>
									<p style="margin:10px 0 0; color:#64748b; font-size:13px; line-height:1.6;">If you have any questions, reply to your workshop directly.</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</div>
	`;

	return {
		subject,
		html,
		text: buildPlainText({ workspace, customer, workLogs }),
		attachment: {
			filename,
			content: pdfContent,
		},
	};
}
