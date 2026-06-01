import { randomUUID } from "crypto";

const MAX_FILE_NAME_LENGTH = 240;

export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
	"csv",
	"doc",
	"docx",
	"gif",
	"heic",
	"heif",
	"jpeg",
	"jpg",
	"ods",
	"odt",
	"pdf",
	"png",
	"rtf",
	"txt",
	"webp",
	"xls",
	"xlsx",
]);

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
	"application/csv",
	"application/msword",
	"application/pdf",
	"application/rtf",
	"application/vnd.ms-excel",
	"application/vnd.oasis.opendocument.spreadsheet",
	"application/vnd.oasis.opendocument.text",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"image/gif",
	"image/heic",
	"image/heif",
	"image/jpeg",
	"image/png",
	"image/webp",
	"text/csv",
	"text/plain",
	"text/rtf",
]);

const DEFAULT_MIME_TYPE_BY_EXTENSION = {
	csv: "text/csv",
	doc: "application/msword",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	gif: "image/gif",
	heic: "image/heic",
	heif: "image/heif",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	ods: "application/vnd.oasis.opendocument.spreadsheet",
	odt: "application/vnd.oasis.opendocument.text",
	pdf: "application/pdf",
	png: "image/png",
	rtf: "application/rtf",
	txt: "text/plain",
	webp: "image/webp",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const MIME_TYPES_BY_EXTENSION = {
	csv: new Set(["application/csv", "text/csv", "text/plain"]),
	doc: new Set(["application/msword"]),
	docx: new Set([
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	]),
	gif: new Set(["image/gif"]),
	heic: new Set(["image/heic"]),
	heif: new Set(["image/heif"]),
	jpeg: new Set(["image/jpeg"]),
	jpg: new Set(["image/jpeg"]),
	ods: new Set(["application/vnd.oasis.opendocument.spreadsheet"]),
	odt: new Set(["application/vnd.oasis.opendocument.text"]),
	pdf: new Set(["application/pdf"]),
	png: new Set(["image/png"]),
	rtf: new Set(["application/rtf", "text/rtf"]),
	txt: new Set(["text/plain"]),
	webp: new Set(["image/webp"]),
	xls: new Set(["application/vnd.ms-excel"]),
	xlsx: new Set([
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	]),
};

export function getFileExtension(fileName = "") {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1) return null;
	return fileName.slice(lastDot + 1).toLowerCase() || null;
}

function normalizeMimeType(fileType = "") {
	return String(fileType || "")
		.split(";")[0]
		.trim()
		.toLowerCase();
}

export function getDocumentObjectKeyPrefix(workspaceId) {
	return `workspaces/${workspaceId}/documents/`;
}

export function isDocumentObjectKeyForWorkspace(fileKey, workspaceId) {
	const key = String(fileKey || "");
	const prefix = getDocumentObjectKeyPrefix(workspaceId);

	return key.startsWith(prefix) && !key.includes("..");
}

export function normalizeDocumentUploadFile({
	fileName,
	fileType,
	sizeBytes,
} = {}) {
	const safeFileName = String(fileName || "").trim();

	if (!safeFileName) {
		throw new Error("File name is required.");
	}

	if (safeFileName.length > MAX_FILE_NAME_LENGTH) {
		throw new Error("File name is too long.");
	}

	if (/[\x00-\x1F\x7F]/.test(safeFileName)) {
		throw new Error("File name contains unsupported characters.");
	}

	const fileExtension = getFileExtension(safeFileName);

	if (!fileExtension || !ALLOWED_DOCUMENT_EXTENSIONS.has(fileExtension)) {
		throw new Error("This file type is not allowed for document uploads.");
	}

	const numericSize = Number(sizeBytes);

	if (!Number.isFinite(numericSize) || numericSize <= 0) {
		throw new Error("File size is required.");
	}

	if (numericSize > Number.MAX_SAFE_INTEGER) {
		throw new Error("File size is too large.");
	}

	const normalizedMimeType = normalizeMimeType(fileType);
	const mimeType =
		normalizedMimeType && normalizedMimeType !== "application/octet-stream"
			? normalizedMimeType
			: DEFAULT_MIME_TYPE_BY_EXTENSION[fileExtension] ||
				"application/octet-stream";

	if (
		mimeType !== "application/octet-stream" &&
		!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)
	) {
		throw new Error("This file type is not allowed for document uploads.");
	}

	const expectedMimeTypes = MIME_TYPES_BY_EXTENSION[fileExtension];
	if (
		mimeType !== "application/octet-stream" &&
		expectedMimeTypes &&
		!expectedMimeTypes.has(mimeType)
	) {
		throw new Error("File extension does not match the uploaded file type.");
	}

	return {
		fileName: safeFileName,
		fileExtension,
		mimeType,
		sizeBytes: Math.ceil(numericSize),
	};
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
