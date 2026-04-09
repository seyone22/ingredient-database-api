// --- UTILS: Size parsing and Unit Pricing ---
const parseProductSize = (name: string, qty?: string | number, unit?: string) => {
    let q = typeof qty === 'string' ? parseFloat(qty) : qty;
    let u = (unit || '').toLowerCase().trim();

    // Fallback to extracting from name if db fields are missing
    if (!q || isNaN(q) || !u) {
        const match = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|l|ml)\b/i);
        if (match) {
            q = parseFloat(match[1]);
            u = match[2].toLowerCase();
        } else {
            return null;
        }
    }

    let baseQty = q;
    let baseUnit = u;

    // Normalize to base units for apples-to-apples comparison
    if (['kg', 'kilogram', 'kilograms'].includes(u)) {
        baseQty = q * 1000;
        baseUnit = 'g';
    } else if (['l', 'liter', 'liters', 'litre', 'litres'].includes(u)) {
        baseQty = q * 1000;
        baseUnit = 'ml';
    }

    return {baseQty, baseUnit, originalQty: q, originalUnit: u};
};

const calculateUnitPrice = (price: number, parsedSize: any, currency: string) => {
    if (!parsedSize || !parsedSize.baseQty) return "—";
    const {baseQty, baseUnit} = parsedSize;

    // Standardize metric to per 100g or 100ml
    if (baseUnit === 'g' || baseUnit === 'ml') {
        const pricePer100 = price / (baseQty / 100);
        return `${currency} ${pricePer100.toFixed(2)} / 100${baseUnit}`;
    }

    // Fallback for piece/bunch/etc
    const pricePerUnit = price / baseQty;
    return `${currency} ${pricePerUnit.toFixed(2)} / ${baseUnit}`;
};