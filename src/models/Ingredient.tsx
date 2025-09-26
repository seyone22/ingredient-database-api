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

    // Graph relationships (all use IDs, not names)
    partOf?: string[];      // Egg White -> Egg
    derivatives?: string[]; // Egg -> Egg White, Powdered Egg
    varieties?: string[];   // Egg -> Hen Egg, Duck Egg
    usedIn?: string[];      // Egg -> Eggnog
    substitutes?: string[]; // Egg -> Chia Seeds
    pairsWith?: string[];   // Egg -> Bacon
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

    partOf?: string[];
    derivatives?: string[];
    varieties?: string[];
    usedIn?: string[];
    substitutes?: string[];
    pairsWith?: string[];
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

    // Relationship arrays
    partOf: { type: [String], default: [] },
    derivatives: { type: [String], default: [] },
    varieties: { type: [String], default: [] },
    usedIn: { type: [String], default: [] },
    substitutes: { type: [String], default: [] },
    pairsWith: { type: [String], default: [] }
}, {
    timestamps: true,
    collection: "ingredients",
});

export const Ingredient = mongoose.models.Ingredient || model<IIngredient>("Ingredient", IngredientSchema);
