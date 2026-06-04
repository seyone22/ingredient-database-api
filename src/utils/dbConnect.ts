import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI!;

if (!MONGO_URI) {
    throw new Error("Please define the MONGO_URI environment variable inside .env.local");
}

// 1. Better TypeScript: Extend the global object properly instead of using `any`
declare global {
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    };
}

// Use a uniquely named global variable to prevent collisions
let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

export default async function dbConnect() {
    // If we have a connection, return it immediately
    if (cached.conn) {
        return cached.conn;
    }

    // If a connection is not already in progress, start one
    if (!cached.promise) {
        const opts = {
            dbName: "foodrepo",      // 2. Explicitly targets your database
            bufferCommands: false,   // 3. Fails fast instead of hanging for 10s if the DB is unreachable
        };

        cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
            return mongoose;
        }).catch((error) => {
            // 4. Critical Error Handling: Clear the promise cache on failure
            cached.promise = null;
            throw error;
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}