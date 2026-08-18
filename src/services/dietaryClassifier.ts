/**
 * Deterministic Tier-1 High-Speed Dietary Flags Classifier
 * Evaluates ingredient name, cuisine, and flavor profile without any LLM/AI calls.
 */

export interface ClassificationResult {
  dietaryFlags: string[];
  confidence: number; // 1.0 for deterministic rule matches
  detectedCategories: {
    isMeat: boolean;
    isPork: boolean;
    isSeafood: boolean;
    isShellfish: boolean;
    isDairy: boolean;
    isEgg: boolean;
    hasGluten: boolean;
    hasNut: boolean;
    hasAlcohol: boolean;
    isPlantBased: boolean;
  };
}

// ----------------------------------------------------------------------
// REGEX PATTERNS & EXCLUSIONS
// ----------------------------------------------------------------------

// 1. MEAT & POULTRY
const MEAT_REGEX = /\b(chicken|beef|pork|bacon|ham|turkey|duck|lamb|mutton|venison|sausage|prosciutto|salami|meatball|meatballs|gelatin|lard|tallow|steak|steaks|patty|patties|suet|veal|bison|goat|pepperoni|chorizo|pastrami|pancetta|meat|poultry|tripe|chicharron|pork rind|foie gras|anchovies|bone broth|chicken stock|beef stock|pork stock|veal stock)\b/i;
const PORK_REGEX = /\b(pork|bacon|ham|prosciutto|salami|pepperoni|chorizo|pancetta|lard|pork rind|chicharron|carnitas)\b/i;

// 2. SEAFOOD & SHELLFISH
const SEAFOOD_REGEX = /\b(fish|salmon|tuna|shrimp|prawn|prawns|crab|lobster|oyster|oysters|clam|clams|mussel|mussels|anchovy|anchovies|cod|squid|octopus|caviar|calamari|sardine|sardines|tilapia|scallop|scallops|haddock|halibut|trout|mackerel|eel|sea bass|snapper|catfish|swordfish|crabmeat|crawfish|crayfish|roe|unagi|surimi|fish sauce|dashi|krill)\b/i;
const SHELLFISH_REGEX = /\b(shrimp|prawn|prawns|crab|lobster|oyster|oysters|clam|clams|mussel|mussels|squid|octopus|calamari|scallop|scallops|crawfish|crayfish|krill)\b/i;

// 3. PLANT-BASED DAIRY & BUTTER EXCLUSIONS (Must NOT be flagged as dairy)
const PLANT_DAIRY_EXCLUSIONS = /\b(almond milk|coconut milk|soy milk|oat milk|rice milk|cashew milk|hemp milk|pea milk|hazelnut milk|coconut cream|coconut butter|peanut butter|almond butter|cashew butter|cocoa butter|shea butter|apple butter|seed butter|nut butter|vegan butter|vegan cheese|vegan milk|plant milk|butternut|butternut squash|butterhead|butter lettuce|butterbean|butter beans|butter bean)\b/i;

// REAL DAIRY REGEX
const DAIRY_REGEX = /\b(milk|cheese|cheeses|butter|yogurt|yoghurt|cream|ghee|whey|paneer|mozzarella|cheddar|parmesan|curd|casein|lactose|half and half|half & half|sour cream|cream cheese|ricotta|brie|camembert|gouda|feta|swiss cheese|provolone|goat cheese|condensed milk|evaporated milk|buttermilk|custard|gelato|ice cream)\b/i;

// 4. EGG EXCLUSIONS
const EGG_EXCLUSIONS = /\b(eggplant|eggplants|egg noodle|egg noodles|vegan mayo|vegan mayonnaise)\b/i;
const EGG_REGEX = /\b(egg|eggs|egg white|egg whites|egg yolk|egg yolks|mayonnaise|mayo|meringue|albumen|aioli|advocaat)\b/i;

// 5. GLUTEN-FREE FLOUR & NOODLE EXCLUSIONS
const GF_FLOUR_NOODLE_EXCLUSIONS = /\b(almond flour|rice flour|coconut flour|tapioca flour|chickpea flour|cassava flour|corn flour|potato flour|soy flour|hazelnut flour|teff flour|buckwheat flour|sorghum flour|rice noodle|rice noodles|glass noodle|glass noodles|shirataki|kelp noodle|kelp noodles|gluten free|gluten-free)\b/i;

// GLUTEN-CONTAINING REGEX
const GLUTEN_REGEX = /\b(wheat|barley|rye|spelt|semolina|couscous|farro|bulgur|seitan|panko|udon|ramen|pasta|spaghetti|macaroni|penne|fusilli|lasagna|lasagne|malt|orzo|graham|triticale|kamut|matzo|matzah|flour|noodle|noodles|bread|cracker|crackers|biscuit|biscuits|soy sauce)\b/i;

// 6. NUT REGEX (Excluding Nutmeg / Butternut)
const NUT_EXCLUSIONS = /\b(nutmeg|butternut|butternut squash)\b/i;
const NUT_REGEX = /\b(almond|almonds|cashew|cashews|walnut|walnuts|peanut|peanuts|pistachio|pistachios|hazelnut|hazelnuts|pecan|pecans|macadamia|pine nut|pine nuts|chestnut|chestnuts|praline|marzipan)\b/i;

// 7. ALCOHOL REGEX
const ALCOHOL_REGEX = /\b(wine|beer|rum|vodka|whiskey|whisky|bourbon|brandy|cider|sake|mirin|liquor|liqueur|alcohol|champagne|prosecco|tequila|gin|cognac|sherry|vermouth|absinthe|bitters|bourbon|amaretto|kahlua|triple sec)\b/i;

/**
 * Classifies an ingredient's dietary flags based strictly on deterministic rules.
 */
export function classifyDietaryFlags(
  name: string,
  cuisine: string[] = [],
  flavorProfile: string[] = []
): ClassificationResult {
  const cleanName = name.toLowerCase().trim();
  const textContext = `${cleanName} ${cuisine.join(" ")} ${flavorProfile.join(" ")}`.toLowerCase();

  // 1. Detect Categories
  const isMeat = MEAT_REGEX.test(textContext);
  const isPork = PORK_REGEX.test(textContext);
  const isSeafood = SEAFOOD_REGEX.test(textContext);
  const isShellfish = SHELLFISH_REGEX.test(textContext);

  // Check Dairy with exclusions
  let isDairy = false;
  if (DAIRY_REGEX.test(cleanName)) {
    if (!PLANT_DAIRY_EXCLUSIONS.test(cleanName)) {
      isDairy = true;
    }
  }

  // Check Egg with exclusions
  let isEgg = false;
  if (EGG_REGEX.test(cleanName)) {
    if (!EGG_EXCLUSIONS.test(cleanName)) {
      isEgg = true;
    }
  }

  // Check Gluten with exclusions
  let hasGluten = false;
  if (GLUTEN_REGEX.test(cleanName)) {
    if (!GF_FLOUR_NOODLE_EXCLUSIONS.test(cleanName)) {
      hasGluten = true;
    }
  }

  // Check Nut with exclusions
  let hasNut = false;
  if (NUT_REGEX.test(cleanName)) {
    if (!NUT_EXCLUSIONS.test(cleanName)) {
      hasNut = true;
    }
  }

  // Check Alcohol
  const hasAlcohol = ALCOHOL_REGEX.test(cleanName);

  const isPlantBased = !isMeat && !isSeafood && !isDairy && !isEgg;

  // 2. Build Dietary Flags Array
  const flags = new Set<string>();

  // Vegan: Zero animal products
  if (isPlantBased) {
    flags.add("vegan");
  }

  // Vegetarian: No meat or seafood
  if (!isMeat && !isSeafood) {
    flags.add("vegetarian");
  }

  // Pescatarian: No meat (seafood allowed)
  if (!isMeat) {
    flags.add("pescatarian");
  }

  // Gluten-Free
  if (!hasGluten) {
    flags.add("gluten_free");
  }

  // Dairy-Free
  if (!isDairy) {
    flags.add("dairy_free");
  }

  // Egg-Free
  if (!isEgg) {
    flags.add("egg_free");
  }

  // Nut-Free
  if (!hasNut) {
    flags.add("nut_free");
  }

  // Halal: No pork, no alcohol
  if (!isPork && !hasAlcohol) {
    flags.add("halal");
  }

  // Kosher: No pork, no shellfish
  if (!isPork && !isShellfish) {
    flags.add("kosher");
  }

  return {
    dietaryFlags: Array.from(flags),
    confidence: 1.0,
    detectedCategories: {
      isMeat,
      isPork,
      isSeafood,
      isShellfish,
      isDairy,
      isEgg,
      hasGluten,
      hasNut,
      hasAlcohol,
      isPlantBased,
    },
  };
}
