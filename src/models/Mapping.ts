import mongoose, { Schema, model, Document } from "mongoose";

export interface IMapping extends Document {
    product: mongoose.Types.ObjectId;             // Reference to Product
    matchedIngredients: mongoose.Types.ObjectId[]; // Linked Ingredient(s)
    confidence?: number;                          // 0–1
    method?: string;                              // "manual" | "ai" | "text-similarity"
    notes?: string;
    meta?: Record<string, any>;
}

const MappingSchema = new Schema<IMapping>(
    {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        matchedIngredients: [{ type: Schema.Types.ObjectId, ref: "Ingredient" }],
        confidence: { type: Number, min: 0, max: 1 },
        method: { type: String, default: "manual" },
        notes: { type: String },
        meta: { type: Schema.Types.Mixed },
    },
    {
        timestamps: true,
        collection: "mappings",
    }
);

// Ensure unique mapping per product per source
MappingSchema.index({ product: 1, source: 1 }, { unique: true });

export const Mapping =
    mongoose.models.Mapping || model<IMapping>("Mapping", MappingSchema);

export default Mapping;
