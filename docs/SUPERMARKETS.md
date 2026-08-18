# 🇱🇰 Sri Lankan Supermarket Scraper & Data Coverage Audit

Tracking document for all Sri Lankan supermarket chains, grocery delivery platforms, scrapers, data completeness, and integration feasibility.

---

## 📊 Summary Matrix

| Supermarket / Source | Status | Active SKUs | Price Complete | Image URL | Stock Tracked | Category Path | Integration Method | Feasibility / Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Keells** | 🟢 **ACTIVE** | **7,513** | **100.0%** | **100.0%** | **93.2%** | **100.0%** | Playwright + Direct API | `zebraliveback.keellssuper.com` |
| **Arpico Supercentre** | 🟢 **ACTIVE** | **4,820** | **100.0%** | **100.0%** | N/A | **100.0%** | Playwright HTML Scraper | `myarpico.com` OpenCart crawler |
| **SPAR Sri Lanka** | 🟢 **ACTIVE** | **2,962** | **100.0%** | **60.6%** | **99.5%** | **99.3%** | Direct REST API | `spar2u.lk` (Consolidated source) |
| **Softlogic GLOMARK** | 🟢 **ACTIVE** | **1,420** | **100.0%** | **100.0%** | N/A | **100.0%** | Playwright Web Scraper | `glomark.lk` (207 categories paginated) |
| **Cargills Food City** | 🟢 **ACTIVE** | **1,192** | **100.0%** | **98.0%** | **70.6%** | **99.8%** | Playwright + Auth API | `cargillsonline.com` |
| **LAUGFS Super** | 🔴 **NOT FEASIBLE** | **0** | N/A | N/A | N/A | N/A | Direct Web Unresolved | No active standalone webstore (`laugfssuper.lk` DNS offline). Delivery via branch call-in / UberEats partner store UUIDs only. |
| **Lanka Sathosa** | 🔴 **NOT FEASIBLE** | **0** | N/A | N/A | N/A | N/A | Direct Web Static Splash | `lankasathosa.org` is a static splash page with 0 e-commerce cart/catalog APIs. Government price revisions published via Facebook/News gazettes. |
| **UberEats Groceries** | 🟡 **PROTOTYPE** | **0** | N/A | N/A | N/A | N/A | Playwright-Extra Stealth | Cloudflare bypass implemented for Keells / partner store UUIDs. |
| **Luxe Supermarket** | 🟡 **PROTOTYPE** | **0** | N/A | N/A | N/A | N/A | Web Scraper | Prototype implemented, unseeded. |
| **PickMe Market** | ⚪ **PLANNED** | **0** | N/A | N/A | N/A | N/A | App API Sniffer | On-demand quick commerce delivery platform. |
| **Daraz Mart** | ⚪ **PLANNED** | **0** | N/A | N/A | N/A | N/A | Web Scraper | `daraz.lk/groceries` FMCG catalog. |

---

## 🔍 Detailed Retailer Audit & Technical Notes

### 🏬 Keells
* **Source ID**: `263fd3f3-685d-eff9-bb48-93b488ab2f3d`
* **Scraper**: `src/services/keelsFetcher.ts`
* **Capabilities**: Direct API fetch from `zebraliveback.keellssuper.com`. Maps department codes (`G`, `H`, `D`, `B`, `V`, `C`) into human-readable category paths. Tracks stock levels.

### 🏬 Arpico Supercentre
* **Source ID**: `a592b3e4-1b39-4b0f-a00a-d3745af35947`
* **Scraper**: `src/services/arpicoFetcher.ts`
* **Capabilities**: Crawls `myarpico.com` OpenCart category paths (`route=product/category&path=...`). Extracts category breadcrumbs from DOM.

### 🏬 SPAR Sri Lanka
* **Source ID**: `81619cbf-5c5c-44de-7bf0-abfdb323589c`
* **Scraper**: `src/services/sparFetcher.ts`
* **Capabilities**: Direct REST API consumption from `spar2u.lk`. Merged legacy duplicate source `Spar` (`a43aacfe-6698-2da1-8ece-f40ba8631cf8`).

### 🏬 Cargills Food City
* **Source ID**: `38f50672-c5a7-9a62-35e2-ddf5f35e15ed`
* **Scraper**: `src/services/cargillsFetcher.ts`
* **Capabilities**: Playwright authenticated POST requests to `cargillsonline.com/Web/GetMenuCategoryItemsPagingV3/`. Maps category codes (`FT`, `VG`, `DY`, `HB`, `FC`, etc.) into category paths. Includes vegetarian dietary flags (`dietaryType`).

### 🏬 Softlogic GLOMARK
* **Source ID**: `70376e1b-f1a2-40da-b94b-769cc70cb42a`
* **Scraper**: `src/services/glomarkFetcher.ts`
* **Capabilities**: Playwright web scraper targeting `glomark.lk`. Expanded to 1,420 items.

---

### ❌ Not Feasible / Discontinued Direct Channels

#### 🏬 LAUGFS Super
* **Status**: **NOT FEASIBLE (Direct Web)**
* **Details**: Domain `laugfssuper.lk` / `laugfssuper.com` returns `net::ERR_NAME_NOT_RESOLVED`. E-commerce portal *GroceryPal.lk* is discontinued. Ordering is branch-based via telephone/WhatsApp or third-party partner app listings (UberEats/PickMe).

#### 🏬 Lanka Sathosa
* **Status**: **NOT FEASIBLE (Direct Web)**
* **Details**: `lankasathosa.org` is a static 1-page splash landing screen with 0 interactive e-commerce cart, catalog APIs, or price tables (all standard subpaths like `/products`, `/items`, `/price-list` return HTTP 404). Essential commodity price revisions are issued directly via government gazettes / official social media posts.
