import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // We'll create this next

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
    throw new Error("Please define the DATABASE_URL environment variable");
}

// Cache the connection in development to prevent hot-reload exhaustion
declare global {
    var postgresConnection: postgres.Sql | undefined;
}

const queryClient = global.postgresConnection || postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== 'production') {
    global.postgresConnection = queryClient;
}

export const db = drizzle(queryClient, { schema });