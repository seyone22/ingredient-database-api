import mongoose, { Schema, model, Document } from "mongoose";

export interface IIngredient extends Document {
    name: string;
    aliases: string[];
    country: string[];      // list of countries
    cuisine: string[];      // list of cuisines
    region?: string[];
    flavor_profile?: string[];
    provenance: string;     // fallback / single string
    comment?: string;
    pronunciation?: string;
    photo?: string;         // URL or relative path
    last_modified: Date;
}

export interface IIngredientData {
    name: string;
    aliases?: string[];
    country?: string[];
    cuisine?: string[];
    region?: string[];
    flavor_profile?: string[];
    provenance?: string;
    comment?: string;
    pronunciation?: string;
    photo?: string;
    last_modified?: Date;
}

const IngredientSchema = new Schema<IIngredient>({
    name: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [] },
    country: { type: [String], default: [] },
    cuisine: { type: [String], default: [] },
    region: { type: [String], default: [] },
    flavor_profile: { type: [String], default: [] },
    provenance: { type: String, default: "MISSING" },
    comment: { type: String },
    pronunciation: { type: String },
    photo: { type: String },
    last_modified: { type: Date, default: Date.now },
});

export const Ingredient = mongoose.models.Ingredient || model<IIngredient>("Ingredient", IngredientSchema);
