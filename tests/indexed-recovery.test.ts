import assert from "node:assert/strict";
import test from "node:test";
import { indexedArticleSlugs, recoveryCandidate, recoveryPublicationDate, recoveryWriteFilter } from "../src/lib/indexed-recovery";
import { createRecoveryModelClient, recoveryModelConfig } from "../src/lib/recovery-model";

const request = { system: "Write from the supplied facts only", prompt: "A verified report", schema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] }, maxOutputTokens: 4000 };
const env = { Gamni_api_key: "gemini-test-secret", Mistral_api_key: "mistral-test-secret", Mistral_Name: "Novexa" };
const geminiSuccess = () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"title":"Verified story"}' }] } }] });
const mistralSuccess = () => Response.json({ choices: [{ finish_reason: "stop", message: { content: '{"title":"Verified story"}' } }] });

test("indexed export is origin-restricted, deduplicated and excludes noncanonical URLs", () => {
  assert.deepEqual(indexedArticleSlugs([
    "https://www.novexa.news/", "https://www.novexa.news/news/example-story",
    "https://novexa.news/news/example-story/", "https://www.novexa.news/news/tracked?utm_source=test",
    "https://www.novexa.news/category/world"
  ], "https://www.novexa.news"), ["example-story"]);
  assert.throws(() => indexedArticleSlugs(["https://unrelated.test/news/example"], "https://www.novexa.news"));
  assert.throws(() => indexedArticleSlugs([], "https://www.novexa.news"));
  assert.throws(() => indexedArticleSlugs(["https://www.novexa.news/"], "https://www.novexa.news"));
});

test("working, unindexed, archived and redirected articles cannot be recovery candidates", () => {
  const indexed = new Set(["indexed", "redirected"]);
  const redirected = new Set(["/news/redirected"]);
  assert(recoveryCandidate({ slug: "indexed", status: "draft" }, indexed, redirected));
  for (const doc of [{ slug: "indexed", status: "published" }, { slug: "indexed", status: "archived" }, { slug: "unindexed", status: "draft" }, { slug: "redirected", status: "draft" }]) {
    assert.equal(recoveryCandidate(doc, indexed, redirected), false);
  }
});

test("original publication date wins over import and source dates and is never fabricated", () => {
  assert.equal(recoveryPublicationDate({ publishedAt: "2026-07-01", sourcePublishedAt: "2026-07-02", createdAt: "2026-08-01" }).toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(recoveryPublicationDate({ publishedAt: "bad", sourcePublishedAt: "2026-07-02" }).toISOString(), "2026-07-02T00:00:00.000Z");
  assert.throws(() => recoveryPublicationDate({}));
});

test("writes require the exact draft snapshot and reject published records", () => {
  const doc = { _id: "id", slug: "indexed", status: "draft", title: "Original", content: "Original body", author: "Abdul Basit", publishedAt: new Date("2026-07-01") };
  const filter = recoveryWriteFilter(doc);
  assert.equal(filter.status, "draft");
  assert.equal(filter.content, doc.content);
  assert.equal(filter.publishedAt, doc.publishedAt);
  assert.deepEqual(filter.updatedAt, { $exists: false });
  assert.throws(() => recoveryWriteFilter({ ...doc, status: "published" }));
});

test("supports supplied key aliases without treating Mistral_Name as a model", () => {
  const config = recoveryModelConfig(env);
  assert.equal(config.geminiKey, env.Gamni_api_key);
  assert.equal(config.mistralKey, env.Mistral_api_key);
  assert.equal(config.mistralModel, "mistral-small-latest");
  assert.equal(recoveryModelConfig({ ...env, GEMINI_MODEL: "chosen-model" }).geminiModel, "chosen-model");
});

test("Gemini is first and successful output does not call Mistral or OpenAI", async () => {
  const calls: string[] = [];
  const client = createRecoveryModelClient({ env, fetch: async (url, init) => {
    calls.push(String(url));
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), env.Gamni_api_key);
    assert(!String(url).includes(env.Gamni_api_key));
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.generationConfig.responseJsonSchema, request.schema);
    return geminiSuccess();
  } });
  const result = await client(request);
  assert(result.ok && result.provider === "gemini");
  assert.equal(calls.length, 1);
});

test("Gemini quota exhaustion falls back to Mistral and does not retry exhausted Gemini", async () => {
  const calls: string[] = [];
  const client = createRecoveryModelClient({ env, fetch: async (url, init) => {
    calls.push(String(url));
    if (String(url).includes("googleapis")) return Response.json({ error: { message: env.Gamni_api_key } }, { status: 429 });
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${env.Mistral_api_key}`);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "mistral-small-latest");
    assert.equal(body.response_format.type, "json_schema");
    return mistralSuccess();
  } });
  const first = await client(request);
  const second = await client(request);
  assert(first.ok && first.provider === "mistral");
  assert(second.ok && second.provider === "mistral");
  assert.equal(calls.filter((url) => url.includes("googleapis")).length, 1);
  assert.equal(calls.filter((url) => url.includes("mistral")).length, 2);
});

test("successful Gemini calls are paced across article workers", async () => {
  let time = 1000;
  const delays: number[] = [];
  const client = createRecoveryModelClient({ env, now: () => time, sleep: async (ms) => { delays.push(ms); time += ms; }, fetch: async () => geminiSuccess() });
  assert((await client(request)).ok);
  assert((await client(request)).ok);
  assert.deepEqual(delays, [8000]);
});

test("transient Gemini failure falls back and Mistral retries are bounded", async () => {
  let calls = 0;
  const delays: number[] = [];
  const client = createRecoveryModelClient({ env, sleep: async (ms) => { delays.push(ms); }, fetch: async (url) => {
    calls += 1;
    if (String(url).includes("googleapis")) throw new Error(env.Gamni_api_key);
    return Response.json({ message: env.Mistral_api_key }, { status: 429 });
  } });
  const result = await client(request);
  assert(!result.ok);
  assert(!result.reason.includes(env.Gamni_api_key));
  assert(!result.reason.includes(env.Mistral_api_key));
  assert.equal(calls, 4);
  assert.equal(delays.length, 2);
});

test("missing Gemini key still permits Mistral, missing both never calls the network", async () => {
  let calls = 0;
  const fetchMock: typeof fetch = async () => { calls += 1; return mistralSuccess(); };
  const first = await createRecoveryModelClient({ env: { Mistral_api_key: "test" }, fetch: fetchMock })(request);
  assert(first.ok && first.provider === "mistral");
  const missing = await createRecoveryModelClient({ env: {}, fetch: fetchMock })(request);
  assert(!missing.ok);
  assert.equal(calls, 1);
});

test("safety refusals are held without trying another provider", async () => {
  let calls = 0;
  const client = createRecoveryModelClient({ env, fetch: async () => {
    calls += 1;
    return Response.json({ candidates: [{ finishReason: "SAFETY" }] });
  } });
  assert.equal((await client(request)).ok, false);
  assert.equal(calls, 1);
});

test("truncated Mistral JSON is never accepted as a successful generation", async () => {
  const client = createRecoveryModelClient({ env: { Mistral_api_key: "test" }, fetch: async () => Response.json({ choices: [{ finish_reason: "length", message: { content: '{"title":"Truncated' } }] }) });
  assert.equal((await client(request)).ok, false);
});
