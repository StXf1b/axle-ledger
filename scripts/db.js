import { PrismaClient } from "../src/generated/prisma/index.js";
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
const globalForPrisma = globalThis;

const adapter = new PrismaNeon({
	connectionString: process.env.DATABASE_URL,
});

export const db =
	globalForPrisma.db ||
	new PrismaClient({
		adapter,
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.db = db;
}
