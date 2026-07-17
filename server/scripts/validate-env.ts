import "dotenv/config";
import { validateEnv } from "../../src/lib/env";

const parsed = validateEnv();

if (!parsed.success) {
  console.error("Environment validation failed:");
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

console.log("Environment validation passed.");
