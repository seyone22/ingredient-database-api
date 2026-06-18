import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Explicitly load the environment variables
// Change this to ".env.local" if that is where you put your DATABASE_URL
dotenv.config({ path: ".env.local" });

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/utils/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        // Now this will correctly read the loaded variable
        url: process.env.DATABASE_URL!,
    },
    schemaFilter: ["foodrepo"],
    extensionsFilters: ["postgis"],
});