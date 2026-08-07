import { createHmac, randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { SocialPublication } from "@/models/SocialPublication";

export type PublishableArticle = {
  _id: unknown;
  title: string;
  slug: string;
  status: string;
  generationMode?: string;
  featured?: boolean;
  breakingNews?: boolean;
};

const endpoint = "https://api.x.com/2/tweets";

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function credentials() {
  const values = {
    consumerKey: process.env.X_API_KEY,
    consumerSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET
  };
  return Object.values(values).every(Boolean) ? values as Record<keyof typeof values, string> : null;
}

export function isArticleEligibleForX(article: PublishableArticle) {
  if (process.env.X_AUTO_PUBLISH !== "true" || article.status !== "published") return false;
  const mode = process.env.X_AUTO_PUBLISH_MODE || "selected";
  if (mode === "all") return true;
  if (mode === "manual") return article.generationMode === "manual";
  return Boolean(article.featured || article.breakingNews);
}

export function getXPublishingConfiguration() {
  const required = {
    X_API_KEY: process.env.X_API_KEY,
    X_API_KEY_SECRET: process.env.X_API_KEY_SECRET,
    X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET
  };

  return {
    enabled: process.env.X_AUTO_PUBLISH === "true",
    mode: process.env.X_AUTO_PUBLISH_MODE || "selected",
    configured: Object.values(required).every(Boolean),
    missing: Object.entries(required).filter(([, value]) => !value).map(([name]) => name)
  };
}

function authorizationHeader(config: NonNullable<ReturnType<typeof credentials>>) {
  const parameters: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_nonce: randomBytes(18).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.accessToken,
    oauth_version: "1.0"
  };
  const parameterString = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join("&");
  const baseString = `POST&${encode(endpoint)}&${encode(parameterString)}`;
  const signingKey = `${encode(config.consumerSecret)}&${encode(config.accessTokenSecret)}`;
  parameters.oauth_signature = createHmac("sha1", signingKey).update(baseString).digest("base64");
  return "OAuth " + Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(", ");
}

export async function publishArticleToX(article: PublishableArticle) {
  if (!isArticleEligibleForX(article)) return { status: "skipped" as const };
  const config = credentials();
  if (!config) return { status: "not_configured" as const };

  await connectDB();
  const articleId = article._id;
  const existing = await SocialPublication.findOne({ articleId, platform: "x" }).lean<{ status?: string }>();
  if (existing?.status === "published" || existing?.status === "publishing") return { status: "duplicate" as const };

  await SocialPublication.findOneAndUpdate(
    { articleId, platform: "x" },
    { $set: { status: "publishing", error: "" }, $inc: { attempts: 1 } },
    { upsert: true, new: true }
  );

  try {
    const articleUrl = absoluteUrl(`/news/${article.slug}`);
    const title = article.title.length > 240 ? `${article.title.slice(0, 237).trim()}...` : article.title;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(config),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: `${title}\n\n${articleUrl}` })
    });
    const payload = await response.json() as { data?: { id?: string }; detail?: string; title?: string };
    if (!response.ok || !payload.data?.id) throw new Error(payload.detail || payload.title || `X API returned ${response.status}`);

    await SocialPublication.updateOne(
      { articleId, platform: "x" },
      { $set: { status: "published", remoteId: payload.data.id, postedAt: new Date(), error: "" } }
    );
    return { status: "published" as const, postId: payload.data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "X publishing failed";
    await SocialPublication.updateOne({ articleId, platform: "x" }, { $set: { status: "failed", error: message } });
    return { status: "failed" as const, error: message };
  }
}
