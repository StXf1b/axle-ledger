import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

async function getCurrentWorkspaceId() {
	const { userId } = await auth();
	if (!userId) return null;

	const user = await db.user.findUnique({
		where: { clerkUserId: userId },
		include: {
			memberships: true,
		},
	});

	return user?.memberships?.[0]?.workspaceId || null;
}

function buildDocumentsWhere({
	workspaceId,
	search = "",
	category = "All",
	linkedTo = "All",
	customerId = "",
	vehicleId = "",
}) {
	const trimmedSearch = search.trim();

	const where = {
		workspaceId,
		...(customerId ? { customerId } : {}),
		...(vehicleId ? { vehicleId } : {}),
		...(category && category !== "All" ? { category } : {}),
	};

	if (linkedTo === "CUSTOMER") {
		where.customerId = { not: null };
	}

	if (linkedTo === "VEHICLE") {
		where.vehicleId = { not: null };
	}

	if (linkedTo === "UNLINKED") {
		where.customerId = null;
		where.vehicleId = null;
	}

	if (trimmedSearch) {
		where.OR = [
			{
				title: {
					contains: trimmedSearch,
					mode: "insensitive",
				},
			},
			{
				fileName: {
					contains: trimmedSearch,
					mode: "insensitive",
				},
			},
			{
				mimeType: {
					contains: trimmedSearch,
					mode: "insensitive",
				},
			},
			{
				notes: {
					contains: trimmedSearch,
					mode: "insensitive",
				},
			},
			{
				customer: {
					is: {
						OR: [
							{
								firstName: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								lastName: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								companyName: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
						],
					},
				},
			},
			{
				vehicle: {
					is: {
						OR: [
							{
								registration: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								make: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
							{
								model: {
									contains: trimmedSearch,
									mode: "insensitive",
								},
							},
						],
					},
				},
			},
		];
	}

	return where;
}

function serializeDocuments(documents) {
	return documents.map((document) => ({
		...document,
		createdAt: document.createdAt?.toISOString() || null,
		updatedAt: document.updatedAt?.toISOString() || null,
	}));
}

export async function getDocumentsListPage({
	search = "",
	category = "All",
	linkedTo = "All",
	customerId = "",
	vehicleId = "",
	page = 1,
	pageSize = 10,
}) {
	const workspaceId = await getCurrentWorkspaceId();

	if (!workspaceId) {
		return {
			documents: [],
			totalCount: 0,
			stats: {
				totalDocuments: 0,
				customerLinked: 0,
				vehicleLinked: 0,
				totalStorageBytes: 0,
			},
		};
	}

	const safePage = Math.max(1, Number(page) || 1);
	const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
	const skip = (safePage - 1) * safePageSize;

	const baseWhere = {
		workspaceId,
		...(customerId ? { customerId } : {}),
		...(vehicleId ? { vehicleId } : {}),
	};

	const where = buildDocumentsWhere({
		workspaceId,
		search,
		category,
		linkedTo,
		customerId,
		vehicleId,
	});

	const [
		documents,
		totalCount,
		totalDocuments,
		customerLinked,
		vehicleLinked,
		storageAgg,
	] = await Promise.all([
		db.document.findMany({
			where,
			orderBy: {
				createdAt: "desc",
			},
			skip,
			take: safePageSize,
			select: {
				id: true,
				title: true,
				fileName: true,
				fileExtension: true,
				mimeType: true,
				sizeBytes: true,
				category: true,
				notes: true,
				createdAt: true,
				updatedAt: true,
				customer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						companyName: true,
					},
				},
				vehicle: {
					select: {
						id: true,
						registration: true,
						make: true,
						model: true,
					},
				},
				uploadedByUser: {
					select: {
						id: true,
						fullName: true,
						email: true,
					},
				},
			},
		}),
		db.document.count({ where }),
		db.document.count({
			where: baseWhere,
		}),
		db.document.count({
			where: {
				...baseWhere,
				customerId: { not: null },
			},
		}),
		db.document.count({
			where: {
				...baseWhere,
				vehicleId: { not: null },
			},
		}),
		db.document.aggregate({
			where: baseWhere,
			_sum: {
				sizeBytes: true,
			},
		}),
	]);

	return {
		documents: serializeDocuments(documents),
		totalCount,
		stats: {
			totalDocuments,
			customerLinked,
			vehicleLinked,
			totalStorageBytes: storageAgg._sum.sizeBytes || 0,
		},
	};
}
