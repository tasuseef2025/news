import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/news_website";

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: CachedConnection;
};

const cached = globalForMongoose.mongooseCache ?? { conn: null, promise: null };
globalForMongoose.mongooseCache = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  cached.promise ??= mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    dbName: "news_website"
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
