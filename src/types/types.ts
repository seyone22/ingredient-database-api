// Define the frontend type based on your new PostgreSQL/Drizzle schema
export interface Ingredient {
    id: string;
    name: string;
    aliases: string[];
    country: string[];
    cuisine: string[];
    region: string[];
    flavorProfile: string[];
    dietaryFlags: string[];
    image: {
        url?: string;
        license?: string;
        author?: string;
        source?: string;
        missing?: boolean;
    };
    comment?: string;
    pronunciation?: string;
}
