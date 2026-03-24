import mongoose, { Schema, model, Document } from "mongoose";

export interface IIngredientData {
    id: string;
    name: string;
    aliases: string[];
    country: string[];
    cuisine: string[];
    region?: string[];
    flavor_profile?: string[];
    dietary_flags?: string[];
    provenance?: string;
    comment?: string;
    pronunciation?: string;
    last_modified: Date;
    embedding?: number[];
    products?: any[];
    image?: {
        url?: string; license?: string; author?: string; source?: string; missing?: boolean;
    };
    partOf?: string[]; derivatives?: string[]; varieties?: string[]; usedIn?: string[]; substitutes?: string[]; pairsWith?: string[];
}

// FIX: Omit 'id' from IIngredientData so it doesn't collide with Mongoose's Document 'id'
export interface IIngredient extends Omit<IIngredientData, "id">, Document {}

const IngredientSchema = new Schema<IIngredient>({
    name: { type: String, required: true, unique: true },
    aliases: [String], country: [String], cuisine: [String], region: [String],
    flavor_profile: [String], dietary_flags: [String],
    provenance: { type: String, default: "MISSING" },
    comment: String, pronunciation: String,
    last_modified: { type: Date, default: Date.now },
    embedding: [Number],
    image: {
        url: String, license: String, author: String, source: String, missing: { type: Boolean, default: true }
    },
    partOf: [String], derivatives: [String], varieties: [String],
    usedIn: [String], substitutes: [String], pairsWith: [String]
}, {
    timestamps: true,
    collection: "ingredients",
    // Configure virtuals directly in the schema options
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

IngredientSchema.virtual("products", {
    ref: "Product",
    localField: "_id",
    foreignField: "ingredient",
});

export const Ingredient = mongoose.models.Ingredient || model<IIngredient>("Ingredient", IngredientSchema);
export default Ingredient;