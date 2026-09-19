import { assertScope, McpAuthContext } from "./auth";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

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

      const params = new URLSearchParams({
        query: args.query || "",
        page: String(page),
        limit: String(limit),
        includeProducts: String(Boolean(args.includeProducts)),
      });
      if (args.cuisine) params.append("cuisine", args.cuisine);
      if (args.country) params.append("country", args.country);
      if (args.region) params.append("region", args.region);
      if (args.flavor) params.append("flavor", args.flavor);

      const res = await fetch(`${NESTJS_API_BASE}/ingredients?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      return await res.json();
    },
  },

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

      const res = await fetch(
        `${NESTJS_API_BASE}/ingredients/${args.id}?includeProducts=${args.includeProducts ?? true}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) {
        throw new Error(`Ingredient with id '${args.id}' not found`);
      }
      return await res.json();
    },
  },

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

      const res = await fetch(`${NESTJS_API_BASE}/ingredients/${args.id}/price`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Ingredient with id '${args.id}' not found`);
      }
      return await res.json();
    },
  },

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

      const res = await fetch(`${NESTJS_API_BASE}/ingredients/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: args.query.trim() }),
      });
      return await res.json();
    },
  },

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
          description: "Taste and aromatic attributes",
        },
        dietary_flags: {
          type: "array",
          items: { type: "string" },
          description: "Dietary categorizations (e.g. 'Vegan', 'Halal')",
        },
        comment: {
          type: "string",
          description: "Culinary notes or usage guidance",
        },
        photo: {
          type: "string",
          description: "Public URL of high-resolution representative photograph",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "write:ingredients");
      const res = await fetch(`${NESTJS_API_BASE}/ingredients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: args.name,
          aliases: args.aliases || [],
          country: args.country || [],
          cuisine: args.cuisine || [],
          region: args.region || [],
          flavor_profile: args.flavor_profile || [],
          dietary_flags: args.dietary_flags || [],
          comment: args.comment || "",
          photo: args.photo || "",
        }),
      });
      return await res.json();
    },
  },

  update_ingredient: {
    name: "update_ingredient",
    description:
      "Update an existing canonical ingredient record by ID with verified metadata or dietary flags.",
    requiredScope: "write:ingredients",
    annotations: {
      title: "Update Canonical Ingredient",
      readOnlyHint: false,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["id", "data"],
      properties: {
        id: {
          type: "string",
          description: "UUID of the ingredient to update",
        },
        data: {
          type: "object",
          description: "Key-value fields to update",
        },
      },
    },
    handler: async (args, auth) => {
      assertScope(auth, "write:ingredients");
      const res = await fetch(`${NESTJS_API_BASE}/ingredients/${args.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(args.data),
      });
      return await res.json();
    },
  },
};

export const mcpResources = [
  {
    uri: "foodrepo://taxonomies/cuisines",
    name: "Supported Cuisines Taxonomy",
    description: "Standardized list of regional and international culinary traditions indexed in FoodRepo.",
    mimeType: "application/json",
  },
  {
    uri: "foodrepo://taxonomies/dietary-flags",
    name: "Supported Dietary Flags",
    description: "Standardized allergen, lifestyle, and religious dietary flags supported by the knowledge base.",
    mimeType: "application/json",
  },
];
