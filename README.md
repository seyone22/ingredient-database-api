# FoodRepo

FoodRepo is an open culinary ingredient knowledge platform and supermarket retail price benchmarking application built with Next.js 15, React 19, TypeScript, and Tailwind CSS. It is powered by the FoodRepo NestJS API backend and PostgreSQL.

FoodRepo connects more than 20,000 canonical ingredients with botanical taxonomy relationships, retail products across major Sri Lankan supermarket chains, nutritional data, recipe price calculation, and developer API tooling.

## Key Capabilities

### Canonical Ingredient Knowledge Base
Browse and search over 20,000 culinary ingredients with multilingual aliases, countries of origin, culinary traditions, and organoleptic flavor profiles. Explore botanical relationships including partOf, varieties, derivatives, culinary substitutes, and pairings.

### Supermarket Retail Price Benchmarking
Compare real-time item prices, pack sizes, and normalized unit costs (cost per 100g or 100ml) across supermarket chains including Keells, Cargills Online, Glomark, and SPAR. Inspect historical price fluctuations and stock levels.

### Dynamic Hierarchical Pricing
When an ingredient lacks direct supermarket products, the pricing engine resolves products from immediate parent ingredients or ancestor taxonomy trees. Parents with multiple child cultivars display category filters for granular inspection.

### Dual-Strategy Recipe Supermarket Costing
Analyze recipe costs by importing a public recipe webpage or pasting raw ingredient lists. Calculates two distinct costs:
* Pro-Rata Consumed Cost: The exact monetary value of the gram/milliliter proportion consumed in the recipe.
* Supermarket Basket Cost: The actual checkout amount required to purchase the minimum commercial package sizes.

### Data Quality & Operational Analytics
Includes an administrative console to monitor database health scores, orphan ingredients, duplicate candidates, regional market breakdowns, and ingestion activity.

### Interactive API Explorer
Test API queries, inspect query parameters, and copy code snippets for cURL, TypeScript, Python, and Dart directly in the documentation explorer. Links directly to live OpenAPI Swagger documentation.

## Tech Stack

### Frontend Application
* Framework: Next.js 15 (Turbopack, App Router)
* Language: TypeScript 5
* UI Library: React 19, Lucide React, Shadcn UI / Radix primitives
* Styling: Tailwind CSS v4, CSS Modules
* Visualizations: Recharts, React Calendar Heatmap

### Backend Engine & Persistence
* Backend: FoodRepo API (NestJS 11, Node.js)
* Database: PostgreSQL 16 with pgvector extension
* ORM: Drizzle ORM
* Artificial Intelligence: Google Gemini Flash for semantic parsing and image waterfall enrichment
* Standards: OpenAPI 3.0 / Swagger, Model Context Protocol (MCP)

## Project Structure

```
ingredient-database-api/
├── public/
│   ├── logo.png                # FoodRepo transparent badge logo
│   └── ...
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout and theme providers
│   │   ├── page.tsx            # Home page with search hero
│   │   ├── about/              # About and project info
│   │   ├── contribute/         # Community ingredient contribution
│   │   ├── documentation/      # Interactive API explorer and Swagger link
│   │   ├── ingredient/[id]/    # Comprehensive ingredient profile & market pricing
│   │   ├── recipe-pricing/     # Supermarket recipe costing calculator
│   │   ├── admin/
│   │   │   ├── page.tsx        # Administration dashboard overview
│   │   │   ├── all/            # Paginated master ingredient database
│   │   │   ├── analytics/      # Regional and flavor profile matrices
│   │   │   ├── ingest/         # Ingestion pipeline monitor and source charts
│   │   │   ├── mapper/         # Supermarket product-to-ingredient linker
│   │   │   ├── product/        # Supermarket products catalog
│   │   │   └── quality/        # Data quality and anomaly detection
│   │   └── api/                # Proxies forwarding requests to FoodRepo API
│   ├── components/
│   │   ├── footer/             # Site footer
│   │   ├── navbar/             # Navigation header with constrained content width
│   │   ├── ingredientcard/     # Ingredient search result card
│   │   ├── NutritionFacts.tsx  # USDA nutritional profile breakdown
│   │   ├── RetailProductsPricing.tsx # Store pricing table and product mapper
│   │   └── ui/                 # Reusable UI component library
│   ├── lib/
│   │   └── utils.ts            # Classnames and styling utilities
│   └── types/                  # TypeScript interface and type declarations
└── package.json
```

## Getting Started

### Prerequisites
* Node.js 20 or later
* npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/seyone22/ingredient-database-api.git
cd ingredient-database-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file in the project root:
```env
FOODREPO_API_URL=https://foodapi.seyone.dev/api/v1
```

4. Start the development server:
```bash
npm run dev
```

The application will be accessible at http://localhost:3000.

### Production Build

Create an optimized build using Turbopack:
```bash
npm run build
npm run start
```

## Frontend API Proxy Endpoints

The Next.js frontend provides proxy routes that forward requests to the FoodRepo NestJS backend engine:

### Ingredient Search
`GET /api/ingredients?query=<term>&page=<number>&limit=<number>`
Search ingredients by name or alias, returning taxonomy relationships and metadata.

### Ingredient Details & Pricing
`GET /api/ingredients/:id`
Fetch full ingredient specification, linked USDA nutrition facts, and matched supermarket products.

### Supermarket Products
`GET /api/products?query=<term>`
Query supermarket catalogs across Keells, Cargills, Glomark, and SPAR.

### Recipe Pricing Engine
`POST /api/recipes/parse-and-price`
Submit a recipe URL or raw ingredient lines to calculate pro-rata and supermarket basket costs.

### Administration & Metrics
* `GET /api/admin/analytics`: Macro-region and culinary distribution stats.
* `GET /api/admin/quality`: Anomaly counts and data quality scores.
* `GET /api/admin/stats`: Source ingest breakdown and pipeline statistics.

## Live Services & Documentation

* Production Frontend: https://food.seyone.dev
* Live OpenAPI Swagger Documentation: https://foodapi.seyone.dev/api/docs
* Backend API Service: https://foodapi.seyone.dev

## License

This project is licensed under the MIT License.
