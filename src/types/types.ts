export interface Ingredient {
  id: string;
  name: string;
  aliases: string[];
  country: string[];
  cuisine: string[];
  region: string[];
  flavorProfile: string[];
  dietaryFlags: string[];
  image: {
    url?: string;
    license?: string;
    author?: string;
    source?: string;
    missing?: boolean;
  };
  comment?: string;
  pronunciation?: string;
}

export interface IProductData {
  id: string;
  name: string;
  sourceId: string;
  brand?: string | null;
  unit?: string | null;
  quantity?: number | null;
  price: number;
  currency?: string | null;
  lastFetched?: Date | null;
  url?: string | null;
  externalId?: string | null;
  departmentCode?: string | null;
  stockInHand?: number | null;
  averageSale?: number | null;
  maxQty?: number | null;
  categoryPath?: string[] | null;
  subDepartmentCode?: string | null;
  isPromotionApplied?: boolean | null;
  promotionDiscountValue?: number | null;
  sku?: string | null;
  raw?: any;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  source?: {
    id: string;
    name: string;
  } | null;
}

export interface DerivativeItem {
  name: string;
  targetId?: string | null;
  process?: string | null;
  yieldRatio?: number | null;
  lossRatio?: number | null;
}

export interface IIngredientData {
  id: string;
  name: string;
  aliases?: string[] | null;
  country?: string[] | null;
  cuisine?: string[] | null;
  region?: string[] | null;
  flavorProfile?: string[] | null;
  dietaryFlags?: string[] | null;
  provenance?: string | null;
  comment?: string | null;
  pronunciation?: string | null;
  lastModified?: Date | null;
  fdcId?: number | null;
  image?: {
    url?: string;
    license?: string;
    author?: string;
    source?: string;
    missing?: boolean;
  } | null;
  partOf?: string[] | null;
  derivatives?: (DerivativeItem | string)[] | null;
  varieties?: string[] | null;
  usedIn?: string[] | null;
  substitutes?: string[] | null;
  pairsWith?: string[] | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  products?: IProductData[];
  nutrition?: any;
}

export type IIngredient = IIngredientData;

export interface DatabaseStats {
  totalIngredients: number;
  totalProducts: number;
  totalMappedProducts: number;
  mappingCoverage: number;

  totalUsdaFoods: number;
  totalMappedNutrition: number;
  nutritionCoverage: number;

  countries: {
    total: number;
    byCountry: Record<string, number>;
  };
  cuisines: {
    total: number;
    byCuisine: Record<string, number>;
  };
  regions: {
    total: number;
    byRegion: Record<string, number>;
  };
  flavorProfiles: {
    total: number;
    byFlavor: Record<string, number>;
  };

  topIngredients: { name: string; count: number }[];

  productsBySource: Record<string, number>;
  growth: {
    ingredients: { date: string; count: number }[];
    products: { date: string; count: number }[];
    mappings: { date: string; count: number }[];
  };

  dataCompleteness: {
    missingCountry: number;
    missingCuisine: number;
    missingRegion: number;
    missingFlavor: number;
  };
}
