import { db } from "@/utils/db";
import { products, priceSources, priceHistories, stockHistories, mappings } from "@/utils/schema";
import { and, asc, desc, eq, ilike, inArray, or, sql, isNull } from "drizzle-orm";
import {KeellsFetcher} from "@/services/keelsFetcher";
import {SparFetcher} from "@/services/sparFetcher";
import {CargillsFetcher} from "@/services/cargillsFetcher";
import {toPgId} from "@/utils/uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ProductRow = typeof products.$inferSelect;
type PriceSourceRow = typeof priceSources.$inferSelect;

export type IProductData = ProductRow & {
    source: Pick<PriceSourceRow, "id" | "name"> | null;
};

export interface ProductFetchResponse {
    product: IProductData | null;
}

export interface ProductListResponse {
    products: IProductData[];
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}

interface FetchAllOptions {
    page?: number;
    limit?: number;
}

// ---------------------------------------------------------------------------
// Shared column selection + the source join every read function uses
// ---------------------------------------------------------------------------
const productColumns = {
    id: products.id,
    name: products.name,
    sourceId: products.sourceId,
    brand: products.brand,
    unit: products.unit,
    quantity: products.quantity,
    price: products.price,
    currency: products.currency,
    lastFetched: products.lastFetched,
    url: products.url,
    externalId: products.externalId,
    departmentCode: products.departmentCode,
    stockInHand: products.stockInHand,
    averageSale: products.averageSale,
    maxQty: products.maxQty,
    categoryPath: products.categoryPath,
    subDepartmentCode: products.subDepartmentCode,
    isPromotionApplied: products.isPromotionApplied,
    promotionDiscountValue: products.promotionDiscountValue,
    sku: products.sku,
    raw: products.raw,
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
};

function productsWithSource() {
    return db
        .select({ ...productColumns, source: { id: priceSources.id, name: priceSources.name } })
        .from(products)
        .leftJoin(priceSources, eq(priceSources.id, products.sourceId));
}

// -------------------------
// Search Products (Text & SKU)
// -------------------------
export async function searchProducts(
    query: string,
    page: number = 1,
    limit: number = 25
): Promise<ProductListResponse> {
    const offset = (page - 1) * limit;
    const cleanQuery = query.trim();

    let rows: IProductData[];
    let total: number;

    if (cleanQuery.length >= 2) {
        const pattern = `%${cleanQuery}%`;
        const prefixPattern = `${cleanQuery}%`;
        const whereClause = or(ilike(products.name, pattern), ilike(products.sku, pattern));

        const isExactMatch = sql<number>`CASE WHEN lower(${products.name}) = lower(${cleanQuery}) OR lower(${products.sku}) = lower(${cleanQuery}) THEN 1 ELSE 0 END`;
        const isStartsWith = sql<number>`CASE WHEN ${products.name} ILIKE ${prefixPattern} OR ${products.sku} ILIKE ${prefixPattern} THEN 1 ELSE 0 END`;

        const [results, totalResult] = await Promise.all([
            productsWithSource()
                .where(whereClause)
                .orderBy(desc(isExactMatch), desc(isStartsWith), asc(products.name))
                .limit(limit)
                .offset(offset),
            db.select({ value: sql<number>`count(*)` }).from(products).where(whereClause),
        ]);

        rows = results as IProductData[];
        total = Number(totalResult[0]?.value ?? 0);
    } else {
        const [results, totalResult] = await Promise.all([
            productsWithSource().orderBy(asc(products.name)).limit(limit).offset(offset),
            db.select({ value: sql<number>`count(*)` }).from(products),
        ]);

        rows = results as IProductData[];
        total = Number(totalResult[0]?.value ?? 0);
    }

    return { products: rows, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
}

// -------------------------
// Fetch single product by ID
// -------------------------
export async function fetchProduct(id: string): Promise<ProductFetchResponse> {
    try {
        const rows = await productsWithSource().where(eq(products.id, id)).limit(1);
        return { product: (rows[0] as IProductData) ?? null };
    } catch (err: any) {
        console.error(`Error fetching product ${id}:`, err);
        return { product: null };
    }
}

// -------------------------
// Fetch multiple products by IDs
// -------------------------
export async function fetchProductsByIds(ids: string[]): Promise<ProductListResponse> {
    try {
        if (ids.length === 0) return { products: [], total: 0 };

        const rows = await productsWithSource().where(inArray(products.id, ids));
        return { products: rows as IProductData[], total: rows.length };
    } catch (err: any) {
        console.error("Error fetching products by IDs:", err);
        return { products: [], total: 0 };
    }
}

// -------------------------
// Fetch all products (with optional pagination)
// -------------------------
export async function fetchAllProducts(
    { page = 1, limit = 50 }: FetchAllOptions = {}
): Promise<ProductListResponse> {
    try {
        const offset = (page - 1) * limit;
        const [rows, totalResult] = await Promise.all([
            productsWithSource().orderBy(asc(products.name)).limit(limit).offset(offset),
            db.select({ value: sql<number>`count(*)` }).from(products),
        ]);

        const total = Number(totalResult[0]?.value ?? 0);
        return {
            products: rows as IProductData[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
        };
    } catch (err: any) {
        console.error("Error fetching all products:", err);
        return { products: [], total: 0 };
    }
}

// -------------------------
// Refresh all products
// -------------------------
// Add more fetcher instances here as you build out other supermarkets
// (Cargills, Arpico, Glomark, etc.) — each just needs fetchFromSource() / mapToProduct().
const FETCHERS = [new KeellsFetcher(), new CargillsFetcher(), new SparFetcher()];

export async function refreshProducts(): Promise<void> {
    for (const fetcher of FETCHERS) {
        console.log(`Refreshing products from ${fetcher.sourceName}...`);

        let rawItems: any[];
        try {
            rawItems = await fetcher.fetchFromSource({});
        } catch (err) {
            console.error(`Failed to fetch from ${fetcher.sourceName}:`, err);
            continue; // one source failing shouldn't block the others
        }

        for (const raw of rawItems) {
            const mapped = fetcher.mapToProduct(raw);
            if (!mapped.externalId) continue; // can't upsert without a stable external id

            const existing = await db
                .select({ id: products.id, price: products.price, stockInHand: products.stockInHand })
                .from(products)
                .where(
                    and(eq(products.externalId, mapped.externalId), eq(products.sourceId, mapped.sourceId))
                )
                .limit(1);

            const [upserted] = await db
                .insert(products)
                .values(mapped)
                .onConflictDoUpdate({
                    target: [products.externalId, products.sourceId],
                    set: { ...mapped, updatedAt: new Date() },
                })
                .returning({ id: products.id });

            const previous = existing[0];
            const priceChanged = previous && previous.price !== mapped.price;
            const stockChanged =
                previous && mapped.stockInHand != null && previous.stockInHand !== mapped.stockInHand;

            if (!previous || priceChanged) {
                await db.insert(priceHistories).values({
                    productId: upserted.id,
                    price: mapped.price,
                    currency: mapped.currency ?? "LKR",
                });
            }

            if (mapped.stockInHand != null && (!previous || stockChanged)) {
                await db.insert(stockHistories).values({
                    productId: upserted.id,
                    stock: mapped.stockInHand,
                    averageDailySales: mapped.averageSale,
                });
            }
        }

        console.log(`${fetcher.sourceName}: processed ${rawItems.length} items.`);
    }
}

// -------------------------
// Fetch a random unmapped product
// -------------------------
export async function getRandomUnmappedProduct(): Promise<ProductFetchResponse> {
    try {
        // We reuse your existing `productsWithSource()` helper to ensure
        // the source data is attached to the payload automatically!
        const rows = await productsWithSource()
            .leftJoin(mappings, eq(products.id, mappings.productId))
            .where(isNull(mappings.productId)) // Filters out products that have a mapping
            .orderBy(sql`RANDOM()`)            // Native Postgres random sort
            .limit(1);

        return { product: (rows[0] as IProductData) ?? null };
    } catch (err: any) {
        console.error("Error fetching random unmapped product:", err);
        return { product: null };
    }
}

// -------------------------
// Fetch Price History for Charts
// -------------------------
export async function getProductPriceHistory(productId: string) {
    const pgProductId = toPgId(productId);

    // Fetch history, sorted oldest to newest (better for drawing charts)
    const history = await db
        .select({
            price: priceHistories.price,
            timestamp: priceHistories.timestamp,
        })
        .from(priceHistories)
        .where(eq(priceHistories.productId, pgProductId))
        .orderBy(asc(priceHistories.timestamp));

    // Format the data specifically for Recharts on the frontend
    return history.map(h => ({
        date: new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        price: h.price,
        fullDate: h.timestamp // Keep raw date for tooltips if needed
    }));
}