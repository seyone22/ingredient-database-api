# FoodRepo

FoodRepo is a culinary ingredient knowledge base built with **Next.js** and **MongoDB**.  
It provides search, contribution, and metadata features for exploring ingredients in a structured way.

## Features

- Ingredient search by name and aliases, with pagination
- Contribute page for adding new ingredients
- Metadata endpoint with statistics (entries, countries, cuisines, regions, flavors)
- Support for culinary relationships: `partOf`, `varieties`, `derivatives`, `usedIn`, `substitutes`, `pairsWith`
- MongoDB schema designed to be portable into graph databases like Neo4j

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript  
- Backend: Next.js API routes  
- Database: MongoDB Atlas with Mongoose  
- Styling: CSS Modules and MUI  

## Project Structure

```

src/
app/
api/            # API endpoints
contribute/     # Contribute page
search/         # Search page
components/       # Navbar, Footer, SearchBar, etc.
models/           # Mongoose schemas
services/         # Database services
utils/            # Helpers (dbConnect, etc.)

````

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/foodrepo.git
cd foodrepo
````

2. Install dependencies:

```bash
npm install
```

3. Configure environment:
   Copy `.env.sample` to `.env.local` and set your MongoDB connection string:

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/foodrepo
```

4. Run the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## API Documentation

### Search Ingredients

`GET /api/ingredients?query=<string>&page=<number>&limit=<number>`

Parameters:

* `query` (required): search term
* `page` (optional, default 1): page number
* `limit` (optional, default 20): items per page

Response:

```json
{
  "results": [ { "name": "Banana", "country": ["Sri Lanka"], ... } ],
  "page": 1,
  "totalPages": 3,
  "total": 45
}
```

### Contribute Ingredient

`POST /api/ingredients`

Body:

```json
{
  "name": "Mango",
  "aliases": ["Amba"],
  "country": ["Sri Lanka"],
  "cuisine": ["Sri Lankan"],
  "provenance": "Cultivated in South Asia",
  "flavor_profile": ["sweet", "fragrant"]
}
```

### Database Metadata

`GET /api/meta`

Response:

```json
{
  "entryCount": 123,
  "countries": { "count": 15, "byCountry": { "Sri Lanka": 20, "India": 35 } },
  "cuisines": { "count": 10, "byCuisine": { "Sri Lankan": 18, "Thai": 12 } },
  "regions": { "count": 8, "byRegion": { "South Asia": 25, "Southeast Asia": 20 } },
  "flavorProfiles": { "count": 12, "byFlavor": { "sweet": 40, "sour": 10 } }
}
```

## Contributing

Contributions are welcome. You can:

* Add missing ingredients using the Contribute page
* Open issues for bugs or improvements
* Submit pull requests for new features

## License

MIT License.
