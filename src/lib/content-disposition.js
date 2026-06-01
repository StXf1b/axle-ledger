const MAX_DOWNLOAD_FILE_NAME_LENGTH = 180;

function normalizeFileName(value, fallback) {
	const normalized = String(value || fallback || "download")
		.replace(/[\x00-\x1F\x7F]/g, "")
		.replace(/[\\/:*?"<>|]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, MAX_DOWNLOAD_FILE_NAME_LENGTH);

	return normalized || fallback || "download";
}

function toAsciiFallback(fileName) {
	return (
		fileName
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^\x20-\x7E]/g, "_")
			.replace(/["\\]/g, "_")
			.trim() || "download"
	);
}

function encodeRFC5987Value(value) {
	return encodeURIComponent(value)
		.replace(/['()]/g, (char) =>
			`%${char.charCodeAt(0).toString(16).toUpperCase()}`,
		)
		.replace(/\*/g, "%2A");
}

export function buildAttachmentContentDisposition(fileName, fallback = "download") {
	const safeFileName = normalizeFileName(fileName, fallback);
	const asciiFileName = toAsciiFallback(safeFileName);

	return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeRFC5987Value(safeFileName)}`;
}
