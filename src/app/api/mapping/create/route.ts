import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { Mapping } from "@/models/Mapping";
import { Product } from "@/models/Product";
import { withAuditLog } from "@/utils/logger";

export const POST = async (req: NextRequest) => {
    await dbConnect();

    try {
        const body = await req.json();
        const { productId, ingredientId } = body;

        if (!productId || !ingredientId) {
            return NextResponse.json(
                { error: "productId and ingredientId are required" },
                { status: 400 }
            );
        }

        // Wrap the mapping logic in the audit log
        const result = await withAuditLog(
            {
                type: 'MANUAL_MAPPING',
                tag: 'MANUAL_UI',
                initiatedBy: 'admin', // Replace with dynamic user ID if available
                metadata: {
                    productId,
                    ingredientId,
                    step: 'validation'
                }
            },
            async (log) => {
                // 1. Verify Product exists
                const product = await Product.findById(productId);
                if (!product) {
                    throw new Error("Product not found");
                }

                // 2. Check for duplicates
                const existing = await Mapping.findOne({ product: productId });
                if (existing) {
                    throw new Error("Mapping already exists for this product");
                }

                log.metadata.step = 'creating_record';
                log.metadata.productName = product.name;

                // 3. Create mapping
                const mapping = await Mapping.create({
                    product: productId,
                    matchedIngredients: [ingredientId],
                    method: "manual",
                    confidence: 1,
                    createdAt: new Date(),
                });

                log.message = `Manually mapped "${product.name}" to ingredient ID ${ingredientId}`;
                log.metadata.step = 'completed';

                return mapping;
            }
        );

        return NextResponse.json(
            { message: "Mapping created", mapping: result },
            { status: 201 }
        );
    } catch (err: any) {
        // withAuditLog will have already logged the failure if it happened inside the wrapper
        console.error("Mapping Route Error:", err);

        // Return 400 for logic errors (like product not found) or 500 for system crashes
        const status = (err.message.includes("not found") || err.message.includes("exists")) ? 400 : 500;

        return NextResponse.json(
            { error: err.message || "Server error" },
            { status }
        );
    }
};