import "dotenv/config";
import { connectDB } from "../src/lib/db";
import { Article } from "../src/models/Article";

async function run() {
  await connectDB();

  console.log("=== Checking Missing Slug 1 ===");
  const missing1 = "war-dries-up-unofficial-dollar-inflows";
  const doc1 = await Article.find({
    $or: [
      { slug: { $regex: "dollar-inflows", $options: "i" } },
      { title: { $regex: "dollar inflows", $options: "i" } }
    ]
  }).select("slug title status reviewStatus").lean();
  console.log("Matches for missing 1:", doc1);

  console.log("\n=== Checking Missing Slug 2 ===");
  const missing2 = "nearly-400-sq-km-of-punjab-under-water-ravi-chenab-flood-levels-likely-to-reach-medium";
  const doc2 = await Article.find({
    $or: [
      { slug: { $regex: "punjab-under-water", $options: "i" } },
      { slug: { $regex: "ravi-chenab-flood", $options: "i" } },
      { title: { $regex: "punjab under water", $options: "i" } }
    ]
  }).select("slug title status reviewStatus").lean();
  console.log("Matches for missing 2:", doc2);
}

run().catch(console.error).finally(() => process.exit(0));
