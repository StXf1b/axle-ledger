import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma";

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
