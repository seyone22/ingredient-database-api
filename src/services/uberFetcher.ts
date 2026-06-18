import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import { FetchProductParams, SupermarketFetcher } from "@/services/supermarketFetcher";
import { db } from "@/utils/db";
import { priceSources, products } from "@/utils/schema";
import { eq } from "drizzle-orm";

// Tell playwright to use the stealth plugin to bypass Cloudflare
chromium.use(stealthPlugin());

// Extend the base params to safely include UberEats specific UUIDs
export interface UberEatsFetchParams extends FetchProductParams {
    storeUuid?: string;
    sectionUuid?: string;
}

export class UberEatsKeellsFetcher extends SupermarketFetcher {
    sourceName = "UberEats_Keells";
    country = "LK";

    // Resolved lazily from the price_sources table
    sourceId?: string;

    private CATALOG_API = "https://www.ubereats.com/_p/api/getCatalogPresentationV2";
    private STORE_URL = "https://www.ubereats.com/store/keells-groceries-union-place/82Lx1HEQXIef2bjoQqrPrg?diningMode=DELIVERY&pl=JTdCJTIyYWRkcmVzcyUyMiUzQSUyMk1hbGF5JTIwU3RyZWV0JTIyJTJDJTIycmVmZXJlbmNlJTIyJTNBJTIyRWh4TllXeGhlU0JUZEN3Z1EyOXNiMjFpYnl3Z1UzSnBJRXhoYm10aElpNHFMQW9VQ2hJSmFaNUN4RDFaNGpvUjFaa09NYjhfTlZFU0ZBb1NDUU53ZWdfUlUtSTZFWTJEMHpKTkxnc3klMjIlMkMlMjJyZWZlcmVuY2VUeXBlJTIyJTNBJTIyZ29vZ2xlX3BsYWNlcyUyMiUyQyUyMmxhdGl0dWRlJTIyJTNBNi45MjU5MjM0JTJDJTIybG9uZ2l0dWRlJTIyJTNBNzkuODUwMzIzNCU3RA%3D%3D";

    private extractedHeaders?: Record<string, string>;

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

        try {
            const [created] = await db
                .insert(priceSources)
                .values({ name: this.sourceName, country: this.country, type: "scraper" })
                .returning({ id: priceSources.id });
            this.sourceId = created.id;
        } catch (err) {
            const retry = await db
                .select({ id: priceSources.id })
                .from(priceSources)
                .where(eq(priceSources.name, this.sourceName))
                .limit(1);
            if (retry.length === 0) throw err;
            this.sourceId = retry[0].id;
        }
    }

    private async ensureSession() {
        if (this.extractedHeaders) return;

        console.log("-> Launching browser to negotiate with Cloudflare...");

        // TEMPORARY FIX: Set headless to FALSE so you can see if Cloudflare blocks you
        const browser = await chromium.launch({ headless: false });

        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                console.log(`[Browser ${msg.type()}] ${msg.text()}`);
            }
        });

        page.on('request', request => {
            const url = request.url();
            if (url.includes('_p/api') || url.includes('cloudflare')) {
                console.log(`[Network] -> ${request.method()} ${url.split('?')[0]}`);
            }
        });

        const headersPromise = new Promise<Record<string, string>>((resolve) => {
            page.on('request', (request) => {
                if (request.url().includes('getCatalogPresentationV2') && request.method() === 'POST') {
                    console.log("-> 🎯 BINGO! Intercepted target API request.");
                    resolve(request.headers());
                }
            });
        });

        console.log("-> Navigating to Keells page...");

        try {
            await page.goto(this.STORE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

            console.log("-> Base HTML loaded. Waiting for the internal API calls to fire...");

            const rawHeaders = await Promise.race([
                headersPromise,
                new Promise<Record<string, string>>((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout waiting for getCatalogPresentationV2 to fire in the browser")), 15000)
                )
            ]);

            this.extractedHeaders = {
                "x-csrf-token": rawHeaders["x-csrf-token"],
                "x-uber-client-gitref": rawHeaders["x-uber-client-gitref"],
                "cookie": rawHeaders["cookie"],
                "content-type": "application/json",
                "accept": "application/json"
            };

            console.log("-> Headers successfully acquired!");

        } catch (error) {
            console.error("-> ❌ Browser session failed:", error);
            throw error;
        } finally {
            console.log("-> Closing browser instance...");
            await browser.close();
        }
    }

    async fetchFromSource(params: UberEatsFetchParams): Promise<any[]> {
        await this.ensureSourceId();
        await this.ensureSession();

        if (!this.extractedHeaders) throw new Error("Failed to acquire session headers");

        // UberEats requires specific UUIDs to target categories. Throw if they aren't provided.
        if (!params.storeUuid || !params.sectionUuid) {
            throw new Error("UberEats scraper requires 'storeUuid' and 'sectionUuid' in parameters.");
        }

        let offset = 0;
        let allItems: any[] = [];
        let hasMore = true;

        console.log(`-> Starting data extraction for section: ${params.sectionUuid}`);

        do {
            console.log(`-> Fetching page... (Offset: ${offset})`);

            const payload = {
                "storeFilters": {
                    "storeUuid": params.storeUuid,
                    "sectionUuids": [params.sectionUuid],
                    "subsectionUuids": null,
                    "shouldReturnSegmentedControlData": false
                },
                "pagingInfo": {
                    "enabled": true,
                    "offset": offset
                },
                "source": "NV_L1_CAROUSEL"
            };

            const response = await fetch(this.CATALOG_API, {
                method: "POST",
                headers: this.extractedHeaders,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`UberEats fetch failed: ${response.status} ${response.statusText}`);
            }

            const json = await response.json();
            const catalogs = json?.data?.catalog || [];

            let itemsFoundInPage = 0;

            for (const section of catalogs) {
                const items = section?.payload?.standardItemsPayload?.catalogItems || [];
                for (const item of items) {
                    // Pass the raw item payload to be mapped
                    allItems.push(item);
                    itemsFoundInPage++;
                }
            }

            hasMore = json?.data?.meta?.hasMore || false;
            offset += itemsFoundInPage;

            if (itemsFoundInPage === 0 && hasMore) {
                console.warn("-> Warning: Uber claimed 'hasMore' but returned 0 items. Breaking loop to prevent infinite hang.");
                break;
            }

        } while (hasMore);

        console.log(`-> Extraction complete. Total items: ${allItems.length}`);
        return allItems;
    }

    mapToProduct(raw: any, ingredientId?: string): typeof products.$inferInsert {
        if (!this.sourceId) {
            throw new Error("UberEatsKeellsFetcher: sourceId not resolved — call fetchFromSource() first");
        }

        // Uber Eats prices are in cents, so we divide by 100
        const priceLKR = raw.price ? parseFloat(raw.price) / 100 : 0;

        return {
            name: raw.title,
            sourceId: this.sourceId,
            price: priceLKR,
            currency: "LKR",

            // Map `isSoldOut` to stock logic if needed. 0 means out of stock.
            stockInHand: raw.isSoldOut ? 0 : null,

            url: raw.imageUrl || null,
            externalId: raw.uuid ? String(raw.uuid) : null,

            // Default/Fallback data
            quantity: 1,
            unit: "unit",
            departmentCode: "UberEats_Delivery",

            raw: JSON.stringify(raw),
            lastFetched: new Date()
        };
    }
}