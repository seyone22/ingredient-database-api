import {Document, Model, model, models, Schema} from "mongoose";

export interface IPriceSourceData {
    name: string;
    country: string;      // e.g., "LK"
    logo?: string;
    baseUrl?: string;
    type?: "api" | "scraper";
    last_fetch?: Date;
    notes?: string;
}

export interface IPriceSource extends IPriceSourceData, Document {}

const PriceSourceSchema = new Schema<IPriceSource>({
    name: { type: String, required: true, unique: true },
    country: { type: String, required: true },
    logo: { type: String },
    baseUrl: { type: String },
    type: { type: String, enum: ["api", "scraper"], default: "api" },
    last_fetch: { type: Date },
    notes: { type: String },
}, { timestamps: true, collection: "price_sources" });

export const PriceSource: Model<IPriceSource> = models?.PriceSource || model<IPriceSource>("PriceSource", PriceSourceSchema);

export default PriceSource;