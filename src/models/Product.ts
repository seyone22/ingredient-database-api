import { Schema, model, Document, Types, models, Model } from "mongoose";

export interface IProductData {
    name: string;
    ingredient: Types.ObjectId;    // ref Ingredient
    source: Types.ObjectId;        // ref PriceSource
    brand?: string;
    unit?: string;                 // e.g., kg, liter, unit
    quantity?: number;             // e.g., 1, 0.5
    price: number;
    currency?: string;
    last_fetched: Date;
    url?: string;
}

export interface IProduct extends IProductData, Document {}

const ProductSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
    source: { type: Schema.Types.ObjectId, ref: "PriceSource", required: true },
    brand: { type: String },
    unit: { type: String },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    currency: { type: String, default: "LKR" },
    last_fetched: { type: Date, default: Date.now },
    url: { type: String },
}, { timestamps: true, collection: "products" });

export const Product: Model<IProduct> = models?.Product || model<IProduct>("Product", ProductSchema);
