// utils/normalizeQuantityUnit.ts

export interface NormalizedQtyUnit {
  quantity: number;
  unit: string;
}

/**
 * Extracts meaningful quantity and unit from raw supermarket product data.
 * Handles broken feeds like Keells: "NO" units, missing units, 0.4 KG, quantities in name, and multi-packs.
 * Normalizes all weights to grams, volumes to milliliters, and units to "unit" for pieces.
 */
export function normalizeQuantityUnit(raw: any): NormalizedQtyUnit {
  let quantity = 1;
  let unit = (typeof raw === "object" && raw?.unit) ? raw.unit.toLowerCase() : "";

  const nameStr = typeof raw === "string" ? raw : (raw?.name || raw?.title || raw?.ItemName);

  if (!nameStr) {
    throw new Error(
      `❌ Missing name or title in raw object! Received:\n${JSON.stringify(raw, null, 2)}`,
    );
  }

  const name = nameStr.toLowerCase();

  // 🥚 Dedicated normalization for whole poultry eggs (loose & multi-packs)
  // Prevents weight regex from matching single egg grams like "(55-55g PER EGG), 10'S"
  // or defaulting 10-packs / 6-packs / bulk eggs to 1 kg.
  // Must NOT trigger for egg noodles, egg pasta, salted egg crisps, egg shampoo, etc.
  const isNonWholeEggProduct = /\b(noodles?|pasta|spaghetti|powder|seasoning|crisps?|chips?|shampoo|biscuit|cookie|cracker|mayo|mayonnaise|sauce|colour|coloring)\b/i.test(name);
  const isEggProduct = /\beggs?\b/i.test(name) && !isNonWholeEggProduct;
  if (isEggProduct) {
    // 1. Check for explicit multi-pack counts in title first (e.g. 10S, 6S, 30S, 10 Pack, 10Pkt)
    const eggCountMatch =
      name.match(/\b(30|15|12|10|6)\s*(?:'s|s|pack|pkt|pcs)\b/i) ||
      name.match(/\b(?:pack|pkt)\s*of\s*(30|15|12|10|6)\b/i) ||
      name.match(/\b(30|15|12|10|6)\b/);

    if (eggCountMatch) {
      return { quantity: parseInt(eggCountMatch[1], 10), unit: "unit" };
    }

    // 2. Loose / bulk eggs sold individually
    if (/\bbulk\b/i.test(name) || raw?.uom === "NO" || raw?.uom === "EA") {
      return { quantity: 1, unit: "unit" };
    }

    // Check store-specific raw fields (e.g., Cargills UnitSize: 10, UOM: 'pcs' / 'S')
    const rawUnitSize = raw?.UnitSize ? parseInt(raw.UnitSize, 10) : null;
    if (rawUnitSize && rawUnitSize > 1) {
      return { quantity: rawUnitSize, unit: "unit" };
    }

    // Default egg pack standard in SL supermarkets if unspecified
    return { quantity: 10, unit: "unit" };
  }

  // 🥥 Dedicated normalization for whole coconuts (pol gediya, fresh coconut, king coconut, thambili)
  // Must NOT trigger for coconut milk, coconut oil, coconut flour, coconut water, coconut treacle, desiccated coconut, etc.
  const isNonWholeCoconutProduct =
    /\b(oil|milk|powder|cream|flour|sugar|treacle|vinegar|water|nectar|aminos|honey|syrup|butter|spread|jaggery|paste|scraped|grated|shredded|desiccated|sambol|chutney|chips?|biscuit|cookie|chocolate|toffee|soap|shampoo|lotion|scrub|conditioner|scraper|shell|charcoal)\b/i.test(
      name,
    );
  const isWholeCoconut =
    /\b(coconuts?|pol|thambili)\b/i.test(name) && !isNonWholeCoconutProduct;
  if (isWholeCoconut) {
    // 1. Check for explicit multi-pack counts in title (e.g. 3S, 2 Pack, Pack of 3)
    const packMatch =
      name.match(/\b(?:pack|pkt)\s*of\s*(\d+)\b/i) ||
      name.match(/\b(\d+)\s*(?:'s|s|pack|pkt|pcs)\b/i);
    if (packMatch) {
      return { quantity: parseInt(packMatch[1], 10), unit: "unit" };
    }

    // 2. Check store-specific raw fields (e.g. Cargills UnitSize: 3, UOM: 'pcs' for "Coconut 3S")
    const rawUnitSize = raw?.UnitSize ? parseInt(raw.UnitSize, 10) : null;
    if (rawUnitSize && rawUnitSize > 1) {
      return { quantity: rawUnitSize, unit: "unit" };
    }

    return { quantity: 1, unit: "unit" };
  }

  // 1️⃣ Handle multi-packs, e.g., "2x400g", "6 pack of 330ml"
  const multiPackMatch = name.match(
    /(\d+)\s*[xX*]\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l)/i,
  );
  if (multiPackMatch) {
    const packCount = parseFloat(multiPackMatch[1]);
    const packQty = parseFloat(multiPackMatch[2]);
    const packUnit = multiPackMatch[3].toLowerCase();

    switch (packUnit) {
      case "g":
        quantity = packCount * packQty;
        unit = "g";
        break;
      case "kg":
        quantity = packCount * packQty * 1000;
        unit = "g";
        break;
      case "ml":
        quantity = packCount * packQty;
        unit = "ml";
        break;
      case "l":
        quantity = packCount * packQty * 1000;
        unit = "ml";
        break;
      default:
        quantity = packCount * packQty;
        unit = packUnit;
    }
    return { quantity, unit };
  }

  // 2️⃣ Match simple quantity in name, e.g., "400g", "1kg", "500ml"
  const qtyMatch = name.match(
    /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|ltrs?|pack|pcs|piece|bottle|bag)/i,
  );
  if (qtyMatch) {
    const parsedQty = parseFloat(qtyMatch[1]);
    const parsedUnit = qtyMatch[2].toLowerCase();

    switch (parsedUnit) {
      case "g":
        quantity = parsedQty;
        unit = "g";
        break;
      case "kg":
        quantity = parsedQty * 1000;
        unit = "g";
        break;
      case "ml":
        quantity = parsedQty;
        unit = "ml";
        break;
      case "l":
      case "ltr":
      case "ltrs":
        quantity = parsedQty * 1000;
        unit = "ml";
        break;
      case "pack":
      case "pcs":
      case "piece":
      case "bottle":
      case "bag":
        quantity = parsedQty;
        unit = "unit";
        break;
      default:
        quantity = parsedQty;
        unit = parsedUnit;
    }
    return { quantity, unit };
  }

  // 3️⃣ Heuristics for broken fields
  if ((unit === "kg" || unit === "") && raw.quantity) {
    // Assume kg → grams
    quantity = raw.quantity * 1000;
    unit = "g";
  } else if (unit === "no" || unit === "ea") {
    quantity = 1;
    unit = "unit";
  }

  // 4️⃣ Fallback for completely missing or empty unit
  if (!unit || unit === "") {
    unit = "kg";
    quantity = quantity * 1; // normalize to grams
  }

  return { quantity, unit };
}

/**
 * Normalizes various price formats to a clean number (double).
 *
 * Handles:
 *  - "Rs.1,400"  → 1400
 *  - "Rs. 1,400.50" → 1400.5
 *  - "1,400.00" → 1400
 *  - 3800 → 3800
 *  - 3800.75 → 3800.75
 *  - null, undefined, NaN → 0
 */
export function normalizePrice(raw: any): number {
  if (raw == null) return 0;

  // If already a number (int or float)
  if (typeof raw === "number" && !isNaN(raw)) {
    return raw;
  }

  // Convert to string and clean up
  const str = String(raw)
    .replace(/[^\d.,]/g, "") // Remove all non-numeric, non-dot, non-comma chars
    .replace(/,/g, ""); // Remove thousand separators

  // Parse as float
  const parsed = parseFloat(str);

  if (isNaN(parsed)) {
    console.warn(`⚠️ normalizePrice: failed to parse price from "${raw}"`);
    return 0;
  }

  return parsed;
}
