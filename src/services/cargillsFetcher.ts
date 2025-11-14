import { chromium } from "playwright";
import { FetchProductParams, SupermarketFetcher } from "@/services/supermarketFetcher";
import { ObjectId } from "bson";

export class CargillsFetcher extends SupermarketFetcher {
    sourceName = "Cargills";
    country = "LK";
    sourceId = "69047ce8fb34f71b6105441b";

    private baseUrl = "https://cargillsonline.com";

    /**
     * Do everything within one Playwright context and use context.request to call
     * the backend endpoint so cookies/session are preserved reliably.
     */
    async fetchFromSource(params: FetchProductParams): Promise<any[]> {
        console.log("🟢 Launching headless browser...");
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            // optionally set a real user agent if needed
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
            // use www variant if the site redirects there in a real browser
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
                    // give server a moment to set cookies and session
                    await page.waitForTimeout(1000);
                }
            } else {
                console.log("✅ No pincode modal detected.");
            }

            // Inspect cookies the server actually set (for debugging)
            const cookiesArr = await context.cookies();
            // console.log("🍪 Cookies in context after navigation:");
            // cookiesArr.forEach(c => {
            //     console.log(`  - ${c.name}=${c.value}; domain=${c.domain}; path=${c.path}; httpOnly=${c.httpOnly}`);
            // });

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

            // Use context.request to maintain the exact same cookies and origin
            const response = await context.request.post(apiUrl, {
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                    Accept: "application/json, text/plain, */*",
                    Origin: this.baseUrl,
                    Referer: this.baseUrl,
                    // user-agent comes from context but we keep header explicit if needed
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                },
                data: body,
                timeout: 30000,
            });

            const status = response.status();
            const statusText = response.statusText();
            console.log(`🟢 Fetch status: ${status} ${statusText}`);

            // Read text for debugging first
            const text = await response.text();
            console.log("📄 Response preview (first 1000 chars):", text.slice(0, 1000));

            // Parse JSON robustly
            let data: any;
            try {
                data = JSON.parse(text);
            } catch (err) {
                // sometimes the server returns an array at root; handle both
                try { data = JSON.parse(JSON.stringify(eval(text))); } catch (_) { data = null; }
            }

            if (!data) {
                console.warn("❌ Could not parse response JSON. Returning empty list.");
                return [];
            }

            // Many endpoints return an array instead of object with Items; handle both forms
            if (Array.isArray(data)) {
                // If the API returns an array and first item says "No Products Found", bail
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
            // Always clean up
            await page.close().catch(() => { });
            await context.close().catch(() => { });
            await browser.close().catch(() => { });
        }
    }

    mapToProduct(raw: any, ingredientId: string) {
        return {
            name: raw.ItemName,
            source: new ObjectId(this.sourceId),
            ingredient: new ObjectId(ingredientId),
            unit: raw.UOM || "",
            quantity: raw.UnitSize || 1,
            price: raw.Price,
            currency: "LKR",
            url: raw.ItemImage,
            externalId: raw.SKUCODE,
            itemCode: raw.SKUCODE,
            isAvailable: raw.Inventory > 0,
            departmentCode: raw.CategoryCode,
            raw: JSON.stringify(raw),
        };
    }
}
