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
                    You can query ingredients, get metadata, and integrate this data into your projects.
                </p>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Base URL</h2>
                    <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}>
            https://your-site.vercel.app/api/ingredients
          </pre>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Endpoint</h2>
                    <p><code>GET /api/ingredients</code></p>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Query Parameters</h2>
                    <ul>
                        <li><strong>query</strong> (string, required) – The search term for ingredient name or aliases.</li>
                        <li><strong>page</strong> (number, optional) – Page number for paginated results. Default: 1.</li>
                        <li><strong>limit</strong> (number, optional) – Number of results per page. Default: 20.</li>
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
                        <li><code>400</code> – Missing query parameter.</li>
                        <li><code>404</code> – No ingredients found for the given query.</li>
                        <li><code>500</code> – Server error.</li>
                    </ul>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Example Usage</h2>
                    <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}>
{`// JavaScript example using fetch
fetch('/api/ingredients?query=banana&page=1&limit=10')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`}
          </pre>
                </section>

                <section style={{ marginTop: "2rem" }}>
                    <h2>Notes</h2>
                    <ul>
                        <li>Search is case-insensitive and matches partial names or aliases.</li>
                        <li>All data is free to use for personal and commercial purposes.</li>
                        <li>For large datasets, consider paginating to improve performance.</li>
                    </ul>
                </section>
            </main>
            <Footer />
        </div>
    );
}
