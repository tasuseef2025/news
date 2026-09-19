import "dotenv/config";
import { connectDB } from "../src/lib/db";
import { Article } from "../src/models/Article";

async function run() {
  await connectDB();

  const countTotal = await Article.countDocuments({});
  const countPublished = await Article.countDocuments({ status: "published" });
  console.log(`Total Articles in DB: ${countTotal}, Published Articles: ${countPublished}`);

  const sample = await Article.findOne({ status: "published" }).select("slug title status reviewStatus generationMode").lean();
  console.log("Sample Published Article:", sample);

  const testSlug = "the-two-days-which-could-make-or-break-fury-aj";
  const doc = await Article.findOne({ slug: testSlug }).lean() as any;
  console.log(`Searching for "${testSlug}":`, doc ? { id: doc?._id, slug: doc?.slug, status: doc?.status, reviewStatus: doc?.reviewStatus } : "NOT FOUND");
}

run().catch(console.error).finally(() => process.exit(0));
