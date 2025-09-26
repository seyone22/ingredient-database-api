import Navbar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";

export default function Documentation() {
    return (
        <div>
            <Navbar />
            <main style={{ padding: "3rem 2rem", maxWidth: "900px", margin: "0 auto" }}>
                <h1>FoodRepo API Documentation</h1>
                <p>
                    FoodRepo provides a RESTful API to access detailed ingredient data.
                    You can query ingredients, get metadata, filter results, and integrate this data into your projects.
                </p>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Base URL</h2>
                    <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}>
            https://your-site.vercel.app/api/ingredients
          </pre>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Endpoints</h2>
                    <ul>
                        <li><code>GET /api/ingredients</code> – Search and filter ingredients.</li>
                        <li><code>POST /api/ingredients</code> – Add a new ingredient to the database.</li>
                    </ul>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Query Parameters (GET)</h2>
                    <ul>
                        <li><strong>query</strong> (string, required) – The search term for ingredient name or aliases.</li>
                        <li><strong>page</strong> (number, optional) – Page number for paginated results. Default: 1.</li>
                        <li><strong>limit</strong> (number, optional) – Number of results per page. Default: 20.</li>
                        <li><strong>autosuggest</strong> (boolean, optional) – Set to <code>true</code> for prefix-based suggestions. Default: false.</li>
                        <li><strong>country</strong> (string, optional) – Filter ingredients by country.</li>
                        <li><strong>cuisine</strong> (string, optional) – Filter ingredients by cuisine.</li>
                        <li><strong>region</strong> (string, optional) – Filter ingredients by region.</li>
                        <li><strong>flavor</strong> (string, optional) – Filter ingredients by flavor profile.</li>
                    </ul>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Response Shape</h2>
                    <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}>
{`{
  "results": [
    {
      "name": "Carabao Mango",
      "aliases": ["Philippine Mango", "Manila Mango"],
      "country": ["Philippines"],
      "cuisine": ["Filipino"],
      "region": ["Guimaras", "Luzon"],
      "flavor_profile": ["Sweet", "Tender", "Juicy", "Fragrant"],
      "provenance": "Philippines",
      "comment": "Carabao mango is a Philippine mango variety...",
      "pronunciation": "Ka-ra-bao",
      "photo": "carabao_mango.jpg",
      "last_modified": "2025-09-26T20:00:00.000Z"
    }
  ],
  "page": 1,
  "totalPages": 1,
  "total": 1
}`}
          </pre>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Error Responses</h2>
                    <ul>
                        <li><code>400</code> – Missing required query parameter.</li>
                        <li><code>404</code> – No ingredients found for the given query or filters.</li>
                        <li><code>500</code> – Server error.</li>
                    </ul>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Example Usage</h2>
                    <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}>
{`// Basic search
fetch('/api/ingredients?query=banana&page=1&limit=10')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Autosuggest with prefix search
fetch('/api/ingredients?query=ube&autosuggest=true&limit=5')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Filter by country and cuisine
fetch('/api/ingredients?query=pepper&country=India&cuisine=Indian&page=1&limit=10')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`}
          </pre>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Notes</h2>
                    <ul>
                        <li>Search is case-insensitive.</li>
                        <li>Autosuggest prioritizes prefix matches over substring matches for faster, relevant results.</li>
                        <li>Filters allow narrowing by country, cuisine, region, or flavor profile.</li>
                        <li>For large datasets, always paginate to improve performance.</li>
                        <li>All data is free to use for personal and commercial purposes.</li>
                    </ul>
                </section>
            </main>
            <Footer />
        </div>
    );
}
