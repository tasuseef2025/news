import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  MONGODB_URI: z.string().min(1),
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters").optional(),
  CRON_BASE_URL: z.string().url().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  API_FOOTBALL_KEY: z.string().optional(),
  API_CRICKET_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  FEED_AI_MAX_OUTPUT_TOKENS: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional()
});

export function validateEnv(source: NodeJS.ProcessEnv = process.env) {
  return envSchema.safeParse(source);
}

export function getEnv() {
  const parsed = validateEnv();
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}