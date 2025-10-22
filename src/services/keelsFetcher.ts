import { SupermarketFetcher } from "@/services/supermarketFetcher";
import { ObjectId } from "bson";

export class KeellsFetcher extends SupermarketFetcher {
    sourceName = "Keells";
    country = "LK";

    private BASE_API = "https://zebraliveback.keellssuper.com";
    private LOGIN_URL = `${this.BASE_API}/1.0/Login/GuestLogin`;
    private PRODUCTS_URL = `${this.BASE_API}/2.0/WebV2/GetItemDetails`;

    private userSessionID?: string;
    private sessionCookies?: string;

    // --- helper to login and store session + cookies ---
    private async ensureSession() {
        if (this.userSessionID && this.sessionCookies) return;

        const res = await fetch(this.LOGIN_URL, { method: "POST" });
        if (!res.ok) throw new Error(`Keells login failed: ${res.statusText}`);

        const body = await res.json();
        const sessionID = body?.result?.userSessionID;
        if (!sessionID) throw new Error("Keells login failed: no userSessionID in body");
        this.userSessionID = sessionID;

        // Grab all Set-Cookie headers
        const rawSetCookies = res.headers.get("set-cookie"); // fetch returns them concatenated, sometimes comma separated
        if (!rawSetCookies) throw new Error("Keells login failed: no cookies returned");

        // Split on comma but be careful: cookie values can contain commas
        // A safer approach: split on `;` and take key=value pairs
        const cookiesArray = rawSetCookies
            .split(",") // crude split, usually works
            .map(c => c.split(";")[0].trim()) // get only key=value
            .filter(Boolean);

        // Join into a single Cookie header string
        this.sessionCookies = cookiesArray.join("; ");
    }

    protected async fetchFromSource(params: { ingredientName?: string }): Promise<any[]> {
        await this.ensureSession();

        const itemDescription = params.ingredientName || "";
        const itemsPerPage = 50;
        let pageNo = 1;
        let allItems: any[] = [];
        let totalPages = 1;

        do {
            const url = new URL(this.PRODUCTS_URL);

            // --- mandatory parameters ---
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
                    "Cookie": this.sessionCookies!, // pass all cookies
                },
            });

            console.log(response.statusText, response.status, url.toString());

            if (!response.ok) throw new Error(`Keells fetch failed: ${response.statusText}`);

            const json = await response.json();

            console.log(json);


            const items = json?.result?.itemDetailResult?.itemDetails || [];
            allItems.push(...items);

            totalPages = json?.result?.itemDetailResult?.pageCount || 1;
            pageNo++;
        } while (pageNo <= totalPages);

        return allItems;
    }

    protected mapToProduct(raw: any, ingredientId: string) {
        return {
            name: raw.name,
            ingredient: new ObjectId(ingredientId),
            unit: raw.uom || "unit",
            quantity: parseFloat(raw.minQty) || 1,
            price: parseFloat(raw.amount) || 0,
            currency: "LKR",
            url: raw.imageUrl || "",
            externalId: raw.itemID?.toString(),
            itemCode: raw.itemCode?.toString(),
            isAvailable: raw.isAvailable ?? true,
        };
    }
}
