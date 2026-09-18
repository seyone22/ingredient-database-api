import {
  searchIngredients,
  getIngredientById,
  getIngredientPrices,
  getBestIngredientMatch,
  addIngredient,
  updateIngredient,
} from "@/services/ingredientService";
import { withAuditLog } from "@/utils/logger";
import { assertScope, McpAuthContext } from "./auth";

export interface McpToolDefinition {
  name: string;
  description: string;
  requiredScope: string;
  annotations: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
  };
  inputSchema: Record<string, unknown>;
  handler: (args: any, auth: McpAuthContext) => Promise<unknown>;
}

export const mcpTools: Record<string, McpToolDefinition> = {
  // -------------------------------------------------------------------------
  // READ: Search Canonical Ingredients
  // -------------------------------------------------------------------------
  search_ingredients: {
    name: "search_ingredients",
    description:
      "Search canonical culinary ingredients across names, aliases, country of origin, regional sub-cuisines, and organoleptic flavor profiles.",
    requiredScope: "read:ingredients",
    annotations: {
      title: "Search Ingredients",
      readOnlyHint: true,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword for ingredient name or alias (e.g. 'cinnamon', 'goraka')",
        },
        cuisine: {
          type: "string",
          description: "Culinary tradition filter (e.g. 'Sri Lankan', 'Indian', 'Italian')",
        },
        country: {
          type: "string",
          description: "Country of origin filter (e.g. 'Sri Lanka', 'India')",
        },
        region: {
          type: "string",
          description: "Regional hierarchy filter (e.g. 'South Asia', 'Mediterranean')",
        },
        flavor: {
          type: "string",
          description: "Organoleptic flavor attribute (e.g. 'Sour', 'Aromatic', 'Pungent', 'Umami')",
        },
        page: {
          type: "integer",
          default: 1,
          description: "Pagination page number (1-indexed)",
        },
        limit: {
          type: "integer",
          default: 15,
          description: "Number of records to retrieve per page (max 50)",
        },
        includeProducts: {
          type: "boolean",
          default: false,
          description: "Whether to include mapped retail products and barcodes",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "read:ingredients");
      const page = Math.max(1, Number(args.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 15));

      return await searchIngredients(args.query || "", {
        page,
        limit,
        cuisine: args.cuisine || null,
        country: args.country || null,
        region: args.region || null,
        flavor: args.flavor || null,
        includeProducts: Boolean(args.includeProducts),
      });
    },
  },

  // -------------------------------------------------------------------------
  // READ: Get Complete Ingredient Record
  // -------------------------------------------------------------------------
  get_ingredient_details: {
    name: "get_ingredient_details",
    description:
      "Retrieve full canonical specification for an ingredient by UUID, including USDA nutritional facts, flavor pairings, varieties, and culinary derivatives.",
    requiredScope: "read:ingredients",
    annotations: {
      title: "Get Ingredient Details",
      readOnlyHint: true,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "Unique UUID or identifier of the canonical ingredient",
        },
        includeProducts: {
          type: "boolean",
          default: true,
          description: "Attach mapped supermarket retail products",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "read:ingredients");
      if (!args.id) {
        throw new Error("Missing required parameter 'id'");
      }

      const item = await getIngredientById(args.id, args.includeProducts ?? true);
      if (!item) {
        throw new Error(`Ingredient with id '${args.id}' not found`);
      }
      return item;
    },
  },

  // -------------------------------------------------------------------------
  // READ: Live Retail Prices Across Supermarkets
  // -------------------------------------------------------------------------
  get_ingredient_prices: {
    name: "get_ingredient_prices",
    description:
      "Fetch live pricing, stock, pack sizes, and store availability for an ingredient across supermarket chains (Keells, Cargills, Glomark).",
    requiredScope: "read:products",
    annotations: {
      title: "Get Ingredient Prices",
      readOnlyHint: true,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "Unique UUID of the canonical ingredient",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "read:products");
      if (!args.id) {
        throw new Error("Missing required parameter 'id'");
      }

      const priceData = await getIngredientPrices(args.id);
      if (!priceData) {
        throw new Error(`Ingredient with id '${args.id}' not found`);
      }
      return priceData;
    },
  },

  // -------------------------------------------------------------------------
  // READ: Semantic Vector Matcher
  // -------------------------------------------------------------------------
  match_ingredient: {
    name: "match_ingredient",
    description:
      "Performs semantic embedding vector matching to find the closest canonical ingredient match for any raw recipe text or product description.",
    requiredScope: "read:ingredients",
    annotations: {
      title: "Match Ingredient Semantics",
      readOnlyHint: true,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Raw food name or product phrase to match (e.g. 'Ceylon Cinnamon sticks 50g')",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "read:ingredients");
      if (!args.query?.trim()) {
        throw new Error("Missing required parameter 'query'");
      }

      return await getBestIngredientMatch(args.query.trim());
    },
  },

  // -------------------------------------------------------------------------
  // WRITE: Contribute New Canonical Ingredient
  // -------------------------------------------------------------------------
  contribute_ingredient: {
    name: "contribute_ingredient",
    description:
      "Add a newly discovered canonical ingredient into the knowledge base, automatically generating 1536-d vector embeddings and logging an audit trace.",
    requiredScope: "write:ingredients",
    annotations: {
      title: "Contribute Canonical Ingredient",
      readOnlyHint: false,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "Canonical English or common title of the ingredient",
        },
        aliases: {
          type: "array",
          items: { type: "string" },
          description: "Vernacular, regional, or scientific synonyms",
        },
        country: {
          type: "array",
          items: { type: "string" },
          description: "Countries of primary cultivation or usage",
        },
        cuisine: {
          type: "array",
          items: { type: "string" },
          description: "Associated cuisines (e.g. ['Sri Lankan', 'South Indian'])",
        },
        region: {
          type: "array",
          items: { type: "string" },
          description: "Broader regional categories",
        },
        flavor_profile: {
          type: "array",
          items: { type: "string" },
          description: "Taste and aromatic attributes (e.g. ['Spicy', 'Warm', 'Aromatic'])",
        },
        dietary_flags: {
          type: "array",
          items: { type: "string" },
          description: "Dietary compliance tags (e.g. ['Vegan', 'Gluten-Free'])",
        },
        provenance: {
          type: "string",
          description: "Citation source, collector ID, or reference context",
        },
        comment: {
          type: "string",
          description: "Culinary commentary, preparation techniques, or notes",
        },
        pronunciation: {
          type: "string",
          description: "Phonetic pronunciation guide",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "write:ingredients");
      if (!args.name?.trim()) {
        throw new Error("Missing required parameter 'name'");
      }

      return await withAuditLog(
        {
          type: "MCP_CONTRIBUTE",
          tag: "INGREDIENT_WRITE",
          initiatedBy: auth.clientId || auth.userId || "gemini-spark",
          metadata: { input: args },
        },
        async (ctx) => {
          const payload = {
            name: args.name.trim(),
            aliases: args.aliases || [],
            country: args.country || [],
            cuisine: args.cuisine || [],
            region: args.region || [],
            flavor_profile: args.flavor_profile || [],
            dietary_flags: args.dietary_flags || [],
            provenance: args.provenance || `SPARK_MCP_${auth.clientId || "AGENT"}`,
            comment: args.comment || null,
            pronunciation: args.pronunciation || null,
          };

          const created = await addIngredient(payload);
          ctx.message = `Created ingredient '${created.name}' (${created.id})`;
          ctx.metadata.ingredientId = created.id;

          return {
            success: true,
            ingredient: created,
          };
        },
      );
    },
  },

  // -------------------------------------------------------------------------
  // WRITE: Update Ingredient Metadata
  // -------------------------------------------------------------------------
  update_ingredient_metadata: {
    name: "update_ingredient_metadata",
    description:
      "Update or enrich metadata fields (aliases, cuisines, flavor profiles, comments) for an existing canonical ingredient record.",
    requiredScope: "write:ingredients",
    annotations: {
      title: "Update Ingredient Metadata",
      readOnlyHint: false,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["id", "updates"],
      properties: {
        id: {
          type: "string",
          description: "UUID of the ingredient to update",
        },
        updates: {
          type: "object",
          description: "Fields to update (aliases, country, cuisine, region, flavorProfile, dietaryFlags, comment, pronunciation)",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "write:ingredients");
      if (!args.id) {
        throw new Error("Missing required parameter 'id'");
      }
      if (!args.updates || typeof args.updates !== "object") {
        throw new Error("Missing or invalid 'updates' object");
      }

      return await withAuditLog(
        {
          type: "MCP_UPDATE",
          tag: "INGREDIENT_WRITE",
          initiatedBy: auth.clientId || auth.userId || "gemini-spark",
          metadata: { id: args.id, updates: args.updates },
        },
        async (ctx) => {
          const updated = await updateIngredient(args.id, args.updates);
          if (!updated) {
            throw new Error(`Ingredient with id '${args.id}' not found`);
          }

          ctx.message = `Updated metadata for ingredient '${updated.name}' (${updated.id})`;
          return {
            success: true,
            ingredient: updated,
          };
        },
      );
    },
  },
};

export const mcpResources = [
  {
    uri: "foodrepo://taxonomies/cuisines",
    name: "Standard Cuisine Taxonomy",
    description: "Supported cultural cuisines and sub-cuisines registered in FoodRepo",
    mimeType: "application/json",
  },
  {
    uri: "foodrepo://taxonomies/dietary-flags",
    name: "Dietary Compliance Flags",
    description: "Standard dietary compliance tags (Vegan, Halal, Kosher, Gluten-Free, etc.)",
    mimeType: "application/json",
  },
];
