import { Schema, model, Document, Types, models, Model } from "mongoose";
import { PriceSource } from "@/models/PriceSource";

export interface IProductData {
    name: string;
    source: Types.ObjectId;        // ref PriceSource
    brand?: string | null;
    unit?: string | null;          // e.g., kg, liter, unit
    quantity?: number | null;      // e.g., 1, 0.5
    price: number;
    currency?: string;
    last_fetched: Date;
    url?: string | null;
    externalId?: string | null;
    departmentCode?: string | null;

    // --- Advanced Market Data Fields (Optional & Nullable) ---
    stockInHand?: number | null;   // Internal inventory count
    averageSale?: number | null;   // Sales velocity/demand metric
    maxQty?: number | null;        // Maximum purchase limit per order
    categoryPath?: string[] | null;// e.g., ["Beverages", "Juices"]
    subDepartmentCode?: string | null;
    isPromotionApplied?: boolean | null;
    promotionDiscountValue?: number | null;
    sku?: string | null;           // Store-specific SKU or itemCode

    raw?: string | null;
}

export interface IProduct extends IProductData, Document {}

const ProductSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    source: { type: Schema.Types.ObjectId, ref: "PriceSource", required: true },
    brand: { type: String, default: null },
    unit: { type: String, default: null },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    currency: { type: String, default: "LKR" },
    last_fetched: { type: Date, default: Date.now },
    url: { type: String, default: null },
    externalId: { type: String, default: null },
    departmentCode: { type: String, default: null },

    // --- Advanced Market Data Implementations ---
    stockInHand: { type: Number, default: null },
    averageSale: { type: Number, default: null },
    maxQty: { type: Number, default: null },
    categoryPath: { type: [String], default: null },
    subDepartmentCode: { type: String, default: null },
    isPromotionApplied: { type: Boolean, default: null },
    promotionDiscountValue: { type: Number, default: null },
    sku: { type: String, default: null },

    raw: { type: String, default: null },
}, { timestamps: true, collection: "products" });

// Indexing remains critical for upsert performance during scraping
ProductSchema.index({ externalId: 1, source: 1 }, { unique: true });
ProductSchema.index({ sku: 1 }); // Added for faster lookups by store SKU

export const Product: Model<IProduct> = models?.Product || model<IProduct>("Product", ProductSchema);