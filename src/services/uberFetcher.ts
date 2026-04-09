import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import { ObjectId } from "bson"; // Assuming you have this from your codebase

// Tell playwright to use the stealth plugin to bypass Cloudflare
chromium.use(stealthPlugin());

export class UberEatsKeellsFetcher {
    sourceName = "UberEats_Keells";
    country = "LK";
    sourceId = "654f8b1a2b3d4e5f67890111"; // Keeping your original ID

    private CATALOG_API = "https://www.ubereats.com/_p/api/getCatalogPresentationV2";

    // The exact URL you provided, which forces the location to Malay St, Colombo
    private STORE_URL = "https://www.ubereats.com/store/keells-groceries-union-place/82Lx1HEQXIef2bjoQqrPrg?diningMode=DELIVERY&pl=JTdCJTIyYWRkcmVzcyUyMiUzQSUyMk1hbGF5JTIwU3RyZWV0JTIyJTJDJTIycmVmZXJlbmNlJTIyJTNBJTIyRWh4TllXeGhlU0JUZEN3Z1EyOXNiMjFpYnl3Z1UzSnBJRXhoYm10aElpNHFMQW9VQ2hJSmFaNUN4RDFaNGpvUjFaa09NYjhfTlZFU0ZBb1NDUU53ZWdfUlUtSTZFWTJEMHpKTkxnc3klMjIlMkMlMjJyZWZlcmVuY2VUeXBlJTIyJTNBJTIyZ29vZ2xlX3BsYWNlcyUyMiUyQyUyMmxhdGl0dWRlJTIyJTNBNi45MjU5MjM0JTJDJTIybG9uZ2l0dWRlJTIyJTNBNzkuODUwMzIzNCU3RA%3D%3D";

    private extractedHeaders?: Record<string, string>;

    private async ensureSession() {
        if (this.extractedHeaders) return;

        console.log("-> Launching browser to negotiate with Cloudflare...");

        // TEMPORARY FIX: Set headless to FALSE so you can see if Cloudflare blocks you
        const browser = await chromium.launch({ headless: false });

        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            // Set a viewport so it looks like a real desktop screen
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        // --- NEW: Detailed Network Logging ---
        page.on('console', msg => {
            // Only log errors or warnings from the page to keep it clean
            if (msg.type() === 'error' || msg.type() === 'warning') {
                console.log(`[Browser ${msg.type()}] ${msg.text()}`);
            }
        });

        page.on('request', request => {
            const url = request.url();
            // Log the interesting requests so you can see the traffic flow
            if (url.includes('_p/api') || url.includes('cloudflare')) {
                console.log(`[Network] -> ${request.method()} ${url.split('?')[0]}`);
            }
        });
        // -------------------------------------

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
            // FIX: Changed 'networkidle' to 'domcontentloaded'.
            // We just need the DOM to exist so the React app boots up and fires the API.
            await page.goto(this.STORE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

            console.log("-> Base HTML loaded. Waiting for the internal API calls to fire...");

            // Wait up to 15 seconds for the specific API call after the page loads
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

    async fetchFromSource(params: { storeUuid: string, sectionUuid: string }): Promise<any[]> {
        await this.ensureSession();

        if (!this.extractedHeaders) throw new Error("Failed to acquire session headers");

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
                    allItems.push(this.mapToProduct(item));
                    itemsFoundInPage++;
                }
            }

            hasMore = json?.data?.meta?.hasMore || false;

            // Advance the offset by the number of items we just pulled
            offset += itemsFoundInPage;

            // Failsafe to prevent infinite loops if Uber returns an empty array but hasMore is true
            if (itemsFoundInPage === 0 && hasMore) {
                console.warn("-> Warning: Uber claimed 'hasMore' but returned 0 items. Breaking loop to prevent infinite hang.");
                break;
            }

        } while (hasMore);

        console.log(`-> Extraction complete. Total items: ${allItems.length}`);
        return allItems;
    }

    mapToProduct(raw: any) {
        // Uber Eats prices are in cents, so we divide by 100
        const priceLKR = raw.price ? raw.price / 100 : 0;

        return {
            name: raw.title,
            description: raw.itemDescription || "",
            source: new ObjectId(this.sourceId),
            price: priceLKR,
            currency: "LKR",
            isAvailable: !raw.isSoldOut,
            url: raw.imageUrl || "",
            externalId: raw.uuid,
            // You can stringify the raw payload just like your old scraper for debugging
            raw: JSON.stringify(raw),
            lastUpdated: new Date()
        };
    }
}