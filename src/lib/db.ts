import "server-only";
import mongoose from "mongoose";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Reuse the connection across hot reloads in dev and across invocations on serverless.
const globalForMongoose = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = (globalForMongoose._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");

  cache.promise ??= mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || "atom-hub",
    bufferCommands: false,
  });

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
