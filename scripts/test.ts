import { UberEatsKeellsFetcher } from "@/services/uberFetcher";

async function runTest() {
    const fetcher = new UberEatsKeellsFetcher();

    // These are the exact UUIDs from your cURL command
    const params = {
        storeUuid: "a22357c9-805a-57c8-9236-a0d009b0c18c",
        sectionUuid: "cc77482b-1206-594e-a534-56db4a92173c"
    };

    try {
        console.log("=== Starting Uber Eats Keells POC ===");
        const results = await fetcher.fetchFromSource(params);

        console.log("\n=== First 3 Results ===");
        console.log(JSON.stringify(results.slice(0, 3), null, 2));

    } catch (error) {
        console.error("Test failed:", error);
    }
}

runTest();