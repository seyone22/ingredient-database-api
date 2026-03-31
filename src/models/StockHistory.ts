import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IStockHistory {
    product: Types.ObjectId;
    stock: number;
    averageDailySales?: number;
    timestamp: Date;
}

export interface IStockHistoryDoc extends IStockHistory, Document {}

const StockHistorySchema = new Schema<IStockHistoryDoc>({
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    stock: { type: Number, required: true },
    averageDailySales: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true }
});

StockHistorySchema.index({ product: 1, timestamp: -1 });

export const StockHistory = mongoose.models.StockHistory || model<IStockHistoryDoc>("StockHistory", StockHistorySchema);