import "dotenv/config";
import mongoose from "mongoose";
import { extractSourceArticle } from "../../src/lib/source-extraction";

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const slugs = process.argv.slice(2);
  const docs = await mongoose.connection.db.collection("articles").find({ slug: { $in: slugs } })
    .project({ slug: 1, title: 1, content: 1, sourceUrl: 1, originalSourceUrl: 1 }).toArray();
  const output = [];
  for (const doc of docs) {
    try {
      const source = await extractSourceArticle(String(doc.originalSourceUrl || doc.sourceUrl));
      output.push({ slug: doc.slug, oldContent: String(doc.content || "").slice(0, 4500), sourceTitle: source.title, text: source.text.slice(0, 4500) });
    } catch (error) {
      output.push({ slug: doc.slug, error: error instanceof Error ? error.message : String(error) });
    }
  }
  console.log(JSON.stringify(output, null, 2));
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
