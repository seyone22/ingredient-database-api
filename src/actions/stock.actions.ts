"use server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

/**
 * Fetches the last 30 days of sales history for a specific product from foodrepo-api.
 */
export async function getProductSalesHistory(
  productId: string,
): Promise<number[]> {
  try {
    const res = await fetch(`${NESTJS_API_BASE}/products/${productId}/stock-history`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error(
      `[Cook Project] Error fetching stock history for ${productId}:`,
      error,
    );
    return [];
  }
}
