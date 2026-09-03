import "dotenv/config";
import mongoose from "mongoose";
import { articleIndexabilityIssues } from "../../src/lib/public-articles";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName: "news_website", bufferCommands: false });
  const col = mongoose.connection.db.collection("articles");

  // Articles blocked only by missing provenance metadata.
  const legacy = await col.find({
    status: "published",
    $or: [{ generationMode: { $in: [null, undefined] } }, { reviewStatus: { $in: [null, undefined] } }]
  }).project({ slug:1, title:1, content:1, duplicateRisk:1, reviewStatus:1, generationMode:1, status:1, publishedAt:1, author:1 }).toArray();

  console.log(`published articles missing generationMode and/or reviewStatus: ${legacy.length}\n`);

  let clean = 0; const reasons = new Map<string, number>(); const wc:number[] = [];
  const cleanSamples: any[] = [];
  for (const d of legacy) {
    // Ask: if we backfilled the metadata, would it be indexable?
    const issues = articleIndexabilityIssues({ ...d, generationMode: "ai", reviewStatus: "approved" });
    wc.push(String(d.content||"").split(/\s+/).filter(Boolean).length);
    if (issues.length === 0) { clean++; if (cleanSamples.length < 8) cleanSamples.push(d); }
    for (const r of issues) { const k = r.replace(/\(\d+ words\)/,"(N words)"); reasons.set(k,(reasons.get(k)||0)+1); }
  }
  wc.sort((a,b)=>a-b);
  console.log(`WOULD BE INDEXABLE after metadata backfill: ${clean} of ${legacy.length}`);
  console.log(`word count  min ${wc[0]}  p25 ${wc[Math.floor(wc.length*.25)]}  median ${wc[Math.floor(wc.length/2)]}  p75 ${wc[Math.floor(wc.length*.75)]}  max ${wc[wc.length-1]}`);
  console.log("\nblocking reasons if backfilled:");
  for (const [k,v] of [...reasons.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12)) console.log(`  ${String(v).padStart(5)}  ${k}`);

  console.log("\ndate range of these legacy articles:");
  const dates = legacy.map(d=>d.publishedAt).filter(Boolean).sort();
  console.log(`  oldest ${dates[0]}  newest ${dates[dates.length-1]}`);

  console.log("\nsample of clean ones:");
  for (const s of cleanSamples) console.log(`  ${String(s.content||"").split(/\s+/).length}w  /news/${s.slug}`);

  await mongoose.disconnect();
}
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => mongoose.disconnect());
