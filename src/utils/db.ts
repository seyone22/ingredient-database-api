import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema"; // We'll create this next

export type DrizzleDb = PostgresJsDatabase<typeof schema>;

const connectionString = process.env.DATABASE_URL;

// Cache the connection in development to prevent hot-reload exhaustion
declare global {
  var postgresConnection: postgres.Sql | undefined;
}

function getDb(): DrizzleDb {
  if (!connectionString) {
    throw new Error("Please define the DATABASE_URL environment variable");
  }

  const queryClient =
    global.postgresConnection ||
    postgres(connectionString, {
      max: 5,
      prepare: false,
      ssl: "require",
      idle_timeout: 5,
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") {
    global.postgresConnection = queryClient;
  }

  return drizzle(queryClient, { schema });
}

export const db: DrizzleDb =
  connectionString ? getDb() : new Proxy({} as DrizzleDb, {
    get(_, prop) {
      return (getDb() as any)[prop];
    },
  });
