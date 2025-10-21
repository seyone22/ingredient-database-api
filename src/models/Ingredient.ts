import mongoose, { Schema, model, Document } from "mongoose";

export interface IIngredientData {
    name: string;
    aliases: string[];
    country: string[];      // list of countries
    cuisine: string[];      // list of cuisines
    region?: string[];
    flavor_profile?: string[];
    dietary_flags?: string[];
    provenance?: string;
    comment?: string;
    pronunciation?: string;
    last_modified: Date;

    // Image object
    image?: {
        url?: string;
        license?: string;
        author?: string;
        source?: string;
        missing?: boolean;
    };

    // Graph relationships (all use IDs, not names)
    partOf?: string[];
    derivatives?: string[];
    varieties?: string[];
    usedIn?: string[];
    substitutes?: string[];
    pairsWith?: string[];
}

export interface IIngredient extends IIngredientData, Document {
}

const IngredientSchema = new Schema<IIngredient>({
    name: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [] },
    country: { type: [String], default: [] },
    cuisine: { type: [String], default: [] },
    region: { type: [String], default: [] },
    flavor_profile: { type: [String], default: [] },
    dietary_flags: { type: [String], default: [] },
    provenance: { type: String, default: "MISSING" },
    comment: { type: String },
    pronunciation: { type: String },
    last_modified: { type: Date, default: Date.now },

    image: {
        url: { type: String },
        license: { type: String },
        author: { type: String },
        source: { type: String },
        missing: { type: Boolean, default: true },
    },

    // Relationships
    partOf: { type: [String], default: [] },
    derivatives: { type: [String], default: [] },
    varieties: { type: [String], default: [] },
    usedIn: { type: [String], default: [] },
    substitutes: { type: [String], default: [] },
    pairsWith: { type: [String], default: [] },
}, {
    timestamps: true,
    collection: "ingredients",
});

export const Ingredient = mongoose.models.Ingredient || model<IIngredient>("Ingredient", IngredientSchema);

export default Ingredient;