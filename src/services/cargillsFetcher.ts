import { chromium } from "playwright";
import { FetchProductParams, SupermarketFetcher } from "@/services/supermarketFetcher";
import { db } from "@/utils/db";
import { priceSources } from "@/utils/schema";
import { eq } from "drizzle-orm";

export class CargillsFetcher extends SupermarketFetcher {
    sourceName = "Cargills";
    country = "LK";

    // Resolved lazily from the price_sources table
    sourceId?: string;

    private baseUrl = "https://cargillsonline.com";

    // --- Helper to resolve (or create) this source's uuid from price_sources ---
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

        // Seed if missing
        try {
            const [created] = await db
                .insert(priceSources)
                .values({ name: this.sourceName, country: this.country, type: "scraper" })
                .returning({ id: priceSources.id });
            this.sourceId = created.id;
        } catch (err) {
            // Race condition fallback
            const retry = await db
                .select({ id: priceSources.id })
                .from(priceSources)
                .where(eq(priceSources.name, this.sourceName))
                .limit(1);
            if (retry.length === 0) throw err;
            this.sourceId = retry[0].id;
        }
    }

    /**
     * Do everything within one Playwright context and use context.request to call
     * the backend endpoint so cookies/session are preserved reliably.
     */
    async fetchFromSource(params: FetchProductParams): Promise<any[]> {
        await this.ensureSourceId();

        console.log("🟢 Launching headless browser...");
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        });

        // Pre-inject a clean WSTAPWS=1 — avoids ambiguity if server expects it on first load.
        await context.addCookies([{
            name: "WSTAPWS",
            value: "1",
            domain: "cargillsonline.com",
            path: "/",
        }]);

        const page = await context.newPage();

        try {
            console.log("🌐 Navigating to homepage...");
            await page.goto(this.baseUrl, { waitUntil: "networkidle", timeout: 30000 });

            // Interact with any client-side modals the site shows
            const ageBtn = page.locator('text="I am 21+"');
            if (await ageBtn.count()) {
                console.log("🔞 Age modal detected. Clicking...");
                await ageBtn.click();
                await page.waitForTimeout(500);
            } else {
                console.log("✅ No age modal detected.");
            }

            const pincodeInput = page.locator('input[name="pincode"]');
            if (await pincodeInput.count()) {
                console.log("📍 Pincode input detected. Filling 'Colombo'...");
                await pincodeInput.fill("Colombo");
                const submitBtn = page.locator('button:has-text("Submit")');
                if (await submitBtn.count()) {
                    console.log("📨 Submitting pincode...");
                    await submitBtn.click();
                    await page.waitForTimeout(1000);
                }
            } else {
                console.log("✅ No pincode modal detected.");
            }

            // Build request body
            const body = {
                CategoryId: "",
                Search: params.ingredientName || "",
                Filter: "Wwzpa2LygAJqAK1uM94i8A==",
                PageIndex: 1,
                PageSize: params.itemsPerPage || 10000,
                BannerId: "",
                SectionId: "",
                CollectionId: "",
                SectionType: "",
                DataType: "",
                SubCatId: "-1",
                PromoId: ""
            };

            console.log("📡 Performing backend POST via Playwright context.request...");
            const apiUrl = `${this.baseUrl}/Web/GetMenuCategoryItemsPagingV3/`;

            const response = await context.request.post(apiUrl, {
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                    Accept: "application/json, text/plain, */*",
                    Origin: this.baseUrl,
                    Referer: this.baseUrl,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                },
                data: body,
                timeout: 30000,
            });

            const status = response.status();
            const statusText = response.statusText();
            console.log(`🟢 Fetch status: ${status} ${statusText}`);

            const text = await response.text();
            console.log("📄 Response preview (first 1000 chars):", text.slice(0, 1000));

            let data: any;
            try {
                data = JSON.parse(text);
            } catch (err) {
                try { data = JSON.parse(JSON.stringify(eval(text))); } catch (_) { data = null; }
            }

            if (!data) {
                console.warn("❌ Could not parse response JSON. Returning empty list.");
                return [];
            }

            if (Array.isArray(data)) {
                if (data.length === 1 && data[0]?.ItemName === "No Products Found") {
                    console.warn("⚠️ Backend returned 'No Products Found'. Check Search term and session cookies.");
                    return [];
                }
                return data;
            }

            if (!data.Items) {
                console.warn("⚠️ No 'Items' key found in JSON. Full keys:", Object.keys(data));
                return [];
            }

            console.log(`✅ Found ${data.Items.length} products in response.`);
            return data.Items;
        } finally {
            await page.close().catch(() => { });
            await context.close().catch(() => { });
            await browser.close().catch(() => { });
        }
    }

    mapToProduct(raw: any, ingredientId?: string) {
        if (!this.sourceId) {
            throw new Error("CargillsFetcher: sourceId not resolved — call fetchFromSource() first");
        }

        return {
            name: raw.ItemName,
            brand: raw.BrandName || null,
            sourceId: this.sourceId,
            unit: raw.UOM || "unit",
            quantity: raw.UnitSize ? parseFloat(raw.UnitSize) : 1,

            averageSale: parseFloat(raw.averageSale) || 0,

            // Pricing Alignment
            price: raw.Price != null ? parseFloat(raw.Price) : 0,
            currency: "LKR",
            isPromotionApplied: raw.IsPromo || false,
            promotionDiscountValue: raw.DiscountAmt ? parseFloat(raw.DiscountAmt) : 0,

            // Location & Stock Analytics
            url: raw.ItemImage || null,
            externalId: raw.SKUCODE ? String(raw.SKUCODE) : null,
            sku: raw.SKUCODE ? String(raw.SKUCODE) : null,
            stockInHand: raw.Inventory ? parseFloat(raw.Inventory) : null,

            // Advanced Categorization
            departmentCode: raw.CategoryCode ? String(raw.CategoryCode) : "Misc",
            categoryPath: [raw.CategoryName, raw.SubCategoryName].filter(Boolean),

            raw: JSON.stringify(raw),
            lastFetched: new Date(),
        };
    }
}