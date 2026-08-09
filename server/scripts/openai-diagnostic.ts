import "dotenv/config";

async function run() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "none" },
      max_output_tokens: 64,
      input: "Reply with exactly: OK"
    })
  });
  const data = await response.json().catch(() => ({}));
  console.log(JSON.stringify({
    ok: response.ok,
    status: response.status,
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    errorCode: data?.error?.code || null,
    errorType: data?.error?.type || null,
    errorMessage: data?.error?.message || null,
    outputReceived: Boolean(data?.output_text || data?.output?.length)
  }, null, 2));
  if (!response.ok) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
