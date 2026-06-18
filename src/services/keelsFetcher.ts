import { SupermarketFetcher } from "@/services/supermarketFetcher";
import { db } from "@/utils/db";
import { priceSources } from "@/utils/schema";
import { eq } from "drizzle-orm";

export class KeellsFetcher extends SupermarketFetcher {
    sourceName = "Keells";
    country = "LK";

    // Resolved lazily from the price_sources table — see ensureSourceId()
    sourceId?: string;

    private BASE_API = "https://zebraliveback.keellssuper.com";
    private LOGIN_URL = `${this.BASE_API}/1.0/Login/GuestLogin`;
    private PRODUCTS_URL = `${this.BASE_API}/2.0/WebV2/GetItemDetails`;

    private userSessionID?: string;
    private sessionCookies?: string;

    // --- helper to resolve (or create) this source's uuid from price_sources ---
    private async ensureSourceId() {
        if (this.sourceId) return;

        const existing = await db
            .select({ id: priceSources.id })
            .from(priceSources)
            .where(eq(priceSources.name, this.sourceName))
            .limit(1);

        if (existing.length > 0) {
            this.sourceId = existing[0].id;
            return;
        }

        // Not seeded yet — create it once. If you'd rather manage sources only
        // via a seed script, replace this block with a thrown error instead.
        try {
            const [created] = await db
                .insert(priceSources)
                .values({ name: this.sourceName, country: this.country, type: "api" })
                .returning({ id: priceSources.id });
            this.sourceId = created.id;
        } catch (err) {
            // Race condition: another process inserted it first — re-fetch.
            const retry = await db
                .select({ id: priceSources.id })
                .from(priceSources)
                .where(eq(priceSources.name, this.sourceName))
                .limit(1);
            if (retry.length === 0) throw err;
            this.sourceId = retry[0].id;
        }
    }

    // --- helper to login and store session + cookies ---
    private async ensureSession() {
        if (this.userSessionID && this.sessionCookies) return;

        const res = await fetch(this.LOGIN_URL, { method: "POST" });
        if (!res.ok) throw new Error(`Keells login failed: ${res.statusText}`);

        const body = await res.json();
        const sessionID = body?.result?.userSessionID;
        if (!sessionID) throw new Error("Keells login failed: no userSessionID in body");
        this.userSessionID = sessionID;

        const rawSetCookies = res.headers.get("set-cookie");
        if (!rawSetCookies) throw new Error("Keells login failed: no cookies returned");

        const cookiesArray = rawSetCookies
            .split(",")
            .map(c => c.split(";")[0].trim())
            .filter(Boolean);

        this.sessionCookies = cookiesArray.join("; ");
    }

    async fetchFromSource(params: { ingredientName?: string, itemsPerPage?: number }): Promise<any[]> {
        await this.ensureSourceId();
        await this.ensureSession();

        const itemDescription = params.ingredientName || "";
        const itemsPerPage = params.itemsPerPage || 18;
        let pageNo = 1;
        let allItems: any[] = [];
        let totalPages = 1;

        do {
            const url = new URL(this.PRODUCTS_URL);

            url.searchParams.set("pageNo", pageNo.toString());
            url.searchParams.set("itemsPerPage", itemsPerPage.toString());
            url.searchParams.set("itemDescription", itemDescription);
            url.searchParams.set("outletCode", "SCDR");
            url.searchParams.set("departmentId", "");
            url.searchParams.set("subDepartmentId", "");
            url.searchParams.set("categoryId", "");
            url.searchParams.set("itemPricefrom", "0");
            url.searchParams.set("itemPriceTo", "5000");
            url.searchParams.set("isFeatured", "0");
            url.searchParams.set("isPromotionOnly", "false");
            url.searchParams.set("promotionCategory", "");
            url.searchParams.set("sortBy", "default");
            url.searchParams.set("BrandId", "");
            url.searchParams.set("storeName", "");
            url.searchParams.set("subDeaprtmentCode", "");
            url.searchParams.set("isShowOutofStockItems", "true");
            url.searchParams.set("brandName", "");

            const response = await fetch(url.toString(), {
                headers: {
                    "usersessionid": this.userSessionID!,
                    "Accept": "application/json",
                    "Cookie": this.sessionCookies!,
                },
            });

            if (!response.ok) throw new Error(`Keells fetch failed: ${response.statusText}`);

            const json = await response.json();

            const items = json?.result?.itemDetailResult?.itemDetails || [];
            allItems.push(...items);

            totalPages = json?.result?.itemDetailResult?.pageCount || 1;
            pageNo++;
        } while (pageNo <= totalPages);

        return allItems;
    }

    mapToProduct(raw: any, ingredientId?: string) {
        if (!this.sourceId) {
            throw new Error("KeellsFetcher: sourceId not resolved — call fetchFromSource() first");
        }

        const item = raw;

        return {
            name: item.name,
            brand: raw.brandDetail?.brandName || "",
            sourceId: this.sourceId,
            unit: item.uom || "unit",

            // Pricing & Promotions
            price: parseFloat(item.amount) || 0,
            currency: "LKR",
            isPromotionApplied: item.isPromotionApplied ?? false,
            promotionDiscountValue: parseFloat(item.promotionDiscountValue) || 0,

            // Stock & Sales Analytics
            quantity: parseFloat(item.minQty) || 1,
            stockInHand: parseFloat(item.stockInHand) || 0,
            averageSale: parseFloat(item.averageSale) || 0,

            // Identifiers & Categorization
            url: item.imageUrl || "",
            externalId: item.itemID?.toString(),
            sku: item.itemCode?.toString(),
            departmentCode: item.departmentCode,
            subDepartmentCode: raw.categoryDetail?.subDepartmentCode,
            categoryPath: [
                raw.categoryDetail?.departmentName,
                raw.categoryDetail?.subDepartmentName,
                raw.categoryDetail?.categoryName
            ].filter(Boolean),

            raw: JSON.stringify(raw),
            lastFetched: new Date(),
        };
    }
}