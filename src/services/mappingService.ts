import { db } from "@/utils/db";
import { mappings, products, auditLogs } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { toPgId } from "@/utils/uuid";

export async function createManualMapping(productId: string, ingredientId: string) {
    const pgProductId = toPgId(productId);
    const pgIngredientId = toPgId(ingredientId);

    // 1. Create the "Pending" Audit Log
    const [log] = await db.insert(auditLogs).values({
        type: "MANUAL_MAPPING",
        tag: "MANUAL_UI",
        initiatedBy: "admin", // Replace with dynamic user ID later if auth is added
        status: "pending",
        metadata: {
            productId: pgProductId,
            ingredientId: pgIngredientId,
            step: "validation"
        }
    }).returning({ id: auditLogs.id });

    try {
        // 2. Verify Product exists and grab its sourceId (needed for the mapping table)
        const productData = await db
            .select({ id: products.id, name: products.name, sourceId: products.sourceId })
            .from(products)
            .where(eq(products.id, pgProductId))
            .limit(1);

        if (productData.length === 0) {
            throw new Error("Product not found");
        }

        const product = productData[0];

        // 3. Check for duplicates
        const existing = await db
            .select({ id: mappings.id })
            .from(mappings)
            .where(eq(mappings.productId, pgProductId))
            .limit(1);

        if (existing.length > 0) {
            throw new Error("Mapping already exists for this product");
        }

        // 4. Create the mapping
        const [mapping] = await db.insert(mappings).values({
            productId: pgProductId,
            sourceId: product.sourceId,
            matchedIngredients: [pgIngredientId], // UUID Array per your schema
            method: "manual",
            confidence: 1.0,
            notes: "Created via manual UI",
            updatedAt: new Date()
        }).returning();

        // 5. Update Audit Log to Success
        await db.update(auditLogs).set({
            status: "completed",
            message: `Manually mapped "${product.name}" to ingredient ID ${pgIngredientId}`,
            metadata: {
                productId: pgProductId,
                ingredientId: pgIngredientId,
                productName: product.name,
                step: "completed"
            },
            endTime: new Date(),
            updatedAt: new Date()
        }).where(eq(auditLogs.id, log.id));

        return mapping;

    } catch (err: any) {
        // 6. Update Audit Log to Failed
        await db.update(auditLogs).set({
            status: "failed",
            error: err.message,
            metadata: {
                productId: pgProductId,
                ingredientId: pgIngredientId,
                step: "failed"
            },
            endTime: new Date(),
            updatedAt: new Date()
        }).where(eq(auditLogs.id, log.id));

        throw err;
    }
}