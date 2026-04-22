import { randomUUID } from "crypto";

export function getFileExtension(fileName = "") {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1) return null;
	return fileName.slice(lastDot + 1).toLowerCase() || null;
}

function slugify(value = "") {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
}

export function stripExtension(fileName = "") {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1) return fileName;
	return fileName.slice(0, lastDot);
}

export function buildDocumentObjectKey({ workspaceId, title, fileName }) {
	const datePrefix = new Date().toISOString().slice(0, 10);
	const ext = getFileExtension(fileName);
	const base = slugify(title || stripExtension(fileName) || "document");

	return `workspaces/${workspaceId}/documents/${datePrefix}/${randomUUID()}-${base}${ext ? `.${ext}` : ""}`;
}
