import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name) {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}

	return value;
}

export function getR2BucketName() {
	return requireEnv("R2_BUCKET_NAME");
}

export function getR2Client() {
	const accountId = requireEnv("R2_ACCOUNT_ID");
	const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
	const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

	return new S3Client({
		region: "auto",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});
}
