import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IPriceHistory {
    product: Types.ObjectId; // Link to the raw Product
    price: number;
    currency: string;
    timestamp: Date;
}

export interface IPriceHistoryDoc extends IPriceHistory, Document {}

const PriceHistorySchema = new Schema<IPriceHistoryDoc>({
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "LKR" },
    timestamp: { type: Date, default: Date.now, index: true }
});

// Compound index so we can quickly query a product's history sorted by time
PriceHistorySchema.index({ product: 1, timestamp: -1 });

export const PriceHistory = mongoose.models.PriceHistory || model<IPriceHistoryDoc>("PriceHistory", PriceHistorySchema);