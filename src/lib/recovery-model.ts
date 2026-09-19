type RecoveryRequest = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
};

type RecoveryResult =
  | { ok: true; text: string; provider: "gemini" | "mistral"; model: string }
  | { ok: false; reason: string; provider?: "gemini" | "mistral"; model?: string };

async function askGemini(input: RecoveryRequest, apiKey: string): Promise<RecoveryResult> {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: input.maxOutputTokens }
      }),
      signal: AbortSignal.timeout(90000)
    });
    if (!response.ok) return { ok: false, reason: `Gemini request failed (HTTP ${response.status})`, provider: "gemini", model };
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    return text ? { ok: true, text, provider: "gemini", model } : { ok: false, reason: "Gemini returned no article JSON", provider: "gemini", model };
  } catch (error) {
    return { ok: false, reason: `Gemini request failed (${error instanceof Error ? error.name : "network error"})`, provider: "gemini", model };
  }
}

async function askMistral(input: RecoveryRequest, apiKey: string): Promise<RecoveryResult> {
  const model = process.env.MISTRAL_NAME?.trim() || "mistral-small-latest";
  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: input.maxOutputTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt }
        ]
      }),
      signal: AbortSignal.timeout(90000)
    });
    if (!response.ok) return { ok: false, reason: `Mistral request failed (HTTP ${response.status})`, provider: "mistral", model };
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const text = typeof content === "string"
      ? content.trim()
      : Array.isArray(content) ? content.map((part: { text?: string }) => part.text || "").join("").trim() : "";
    return text ? { ok: true, text, provider: "mistral", model } : { ok: false, reason: "Mistral returned no article JSON", provider: "mistral", model };
  } catch (error) {
    return { ok: false, reason: `Mistral request failed (${error instanceof Error ? error.name : "network error"})`, provider: "mistral", model };
  }
}

export async function requestRecoveryModel(input: RecoveryRequest): Promise<RecoveryResult> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
    || process.env.Gamni_api_key?.trim()
    || process.env.Gemini_api_key?.trim()
    || process.env.Gamni_key?.trim();
  const mistralKey = process.env.MISTRAL_API_KEY?.trim() || process.env.Mistral_api_key?.trim();
  if (!geminiKey && !mistralKey) return { ok: false, reason: "Gemini and Mistral API keys are not configured" };

  if (geminiKey) {
    const result = await askGemini(input, geminiKey);
    if (result.ok || !mistralKey) return result;
  }
  return askMistral(input, mistralKey!);
}
