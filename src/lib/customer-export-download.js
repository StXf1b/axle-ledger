function base64ToBlob(base64Content, mimeType) {
	const byteCharacters = window.atob(base64Content);
	const byteArrays = [];

	for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
		const slice = byteCharacters.slice(offset, offset + 1024);
		const byteNumbers = Array.from(slice, (character) =>
			character.charCodeAt(0),
		);
		byteArrays.push(new Uint8Array(byteNumbers));
	}

	return new Blob(byteArrays, { type: mimeType });
}

export function downloadCustomerExportFile(result) {
	if (!result?.ok) {
		throw new Error("Could not export customer data.");
	}

	const blob =
		result.encoding === "base64"
			? base64ToBlob(result.content, result.mimeType)
			: new Blob([result.content], { type: result.mimeType });

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = result.fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
