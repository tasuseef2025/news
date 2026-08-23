import { categorySlug } from "@/lib/categories";
import { assessArticleQuality, type QualityAssessment } from "@/lib/article-quality";
import type { ExtractedArticle } from "@/lib/source-extraction";

export type RebuildInput = {
  title: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  sourceExcerpt: string;
  extracted: ExtractedArticle;
};

export type RebuiltArticle = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  imageAlt: string;
  externalLinks: Array<{ anchorText: string; url: string }>;
  factualClaims: string[];
  wordCount: number;
  assessment: QualityAssessment;
};

export type RebuildResult =
  | { ok: true; article: RebuiltArticle }
  | { ok: false; reason: string; assessment?: QualityAssessment };

export function minimumRebuildWords() {
  return Math.max(600, Number(process.env.REBUILD_MIN_WORDS || 600));
}

/**
 * Like cleanText in content-automation, but preserves markdown links so that
 * citation anchors survive normalization.
 */
export function cleanRebuiltText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(^|\s)[*_]{1,3}(?=\s|$)/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\.{3,}/g, ".")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function cleanRebuiltContent(value = "") {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((block) => cleanRebuiltText(block))
    .filter(Boolean)
    .join("\n\n");
}

function countWords(value = "") {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/\s+/).filter(Boolean).length;
}

function normalizedTitle(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function headlineIsCopied(candidate: string, sourceTitle: string) {
  const left = normalizedTitle(candidate);
  const right = normalizedTitle(sourceTitle);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const leftWords = new Set(left.split(" ").filter((word) => word.length > 3));
  const rightWords = new Set(right.split(" ").filter((word) => word.length > 3));
  if (!leftWords.size || !rightWords.size) return false;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / Math.min(leftWords.size, rightWords.size) >= 0.82;
}

/**
 * Removes any markdown link whose target was not supplied to the model, so a
 * hallucinated URL can never reach the database. Unapproved links are unwrapped
 * to plain text rather than deleted, preserving the sentence.
 */
function enforceLinkAllowlist(content: string, allowlist: Set<string>) {
  const kept: Array<{ anchorText: string; url: string }> = [];
  const sanitized = content.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, text: string, url: string) => {
    if (!allowlist.has(url)) return text;
    kept.push({ anchorText: text, url });
    return `[${text}](${url})`;
  });
  return { content: sanitized, links: kept };
}

function buildAllowlist(input: RebuildInput) {
  const entries: Array<{ url: string; label: string }> = [];
  if (input.sourceUrl) entries.push({ url: input.sourceUrl, label: input.sourceName || "original report" });
  for (const link of input.extracted.authoritativeLinks) {
    if (!entries.some((entry) => entry.url === link.url)) entries.push(link);
  }
  return entries.slice(0, 7);
}

function tidyTags(values: unknown, category: string) {
  return [category, ...(Array.isArray(values) ? values : [])]
    .filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()))
    .map((tag) => cleanRebuiltText(tag).slice(0, 40))
    .filter((tag, index, all) => tag && all.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 8);
}

type ModelPackage = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  imageAlt?: string;
  factualClaims?: string[];
  sufficientEvidence?: boolean;
  evidenceNote?: string;
};

function parseJson(value: string): ModelPackage | null {
  try {
    return JSON.parse(value) as ModelPackage;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as ModelPackage;
    } catch {
      return null;
    }
  }
}

async function requestRebuild(input: RebuildInput, allowlist: Array<{ url: string; label: string }>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { pkg: null, reason: "OPENAI_API_KEY is not configured" };

  const minimumWords = minimumRebuildWords();
  const linkMenu = allowlist
    .map((entry, index) => `${index + 1}. ${entry.url}  (describes: ${entry.label})`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      max_output_tokens: Math.max(3000, Number(process.env.REBUILD_MAX_OUTPUT_TOKENS || 4000)),
      reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "none" },
      text: {
        format: {
          type: "json_schema",
          name: "novexa_rebuilt_article",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "sufficientEvidence", "evidenceNote", "title", "slug", "excerpt",
              "metaTitle", "metaDescription", "tags", "imageAlt", "factualClaims", "content"
            ],
            properties: {
              sufficientEvidence: { type: "boolean" },
              evidenceNote: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              excerpt: { type: "string" },
              metaTitle: { type: "string" },
              metaDescription: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              imageAlt: { type: "string" },
              factualClaims: { type: "array", items: { type: "string" } },
              content: { type: "string" }
            }
          }
        }
      },
      input: [
        {
          role: "system",
          content:
            "You are a senior staff writer at Novexa News with fifteen years on the desk. You are given the full text of a report from another outlet as your factual brief. Write your own article from those facts: your structure, your sentences, your judgement about what leads. Never copy sentences or distinctive phrasing. Never invent facts, quotes, numbers, dates, causes, or reactions that are not in the brief. Write the way a person writes on deadline, not the way a summariser summarises. If the brief cannot support the required length with real reporting, set sufficientEvidence to false rather than padding. Return only valid JSON."
        },
        {
          role: "user",
          content: `Rewrite this into an original Novexa News article of at least ${minimumWords} words.

Existing draft headline: ${input.title}
Category: ${input.category}
Source outlet: ${input.sourceName}

FULL SOURCE TEXT (the only permitted factual basis):
"""
${input.extracted.text.slice(0, 14000)}
"""

APPROVED LINK TARGETS — you may cite only these exact URLs:
${linkMenu || "(none available)"}

Requirements:
- ${minimumWords}-950 words of substantive reporting. Depth must come from the facts, context and explanation present in the source text, never from repetition or filler.
- Original headline with a different angle and wording from the draft headline above. Do not reuse the source headline.
- Structure with "H2: " heading lines (3 to 5 of them) covering what happened, key details, why it matters, and what comes next where the source supports it.
- You MUST place at least one contextual link to the original source report (${input.sourceUrl}) inside the body, using markdown syntax [anchor text](url), where you attribute the reporting. Add up to 3 more links from the approved list where they genuinely support a specific claim.
- Use ONLY URLs from the approved list above, each at most once. Anchor text must be natural descriptive phrasing that describes the destination, never "click here", "source", or a bare URL. Any link to a URL outside the approved list will be discarded.
- Attribute reporting to the outlet by name, the way a newsroom does: "the BBC reported", "according to figures released by the ministry", "Reuters put the figure at". NEVER refer to your brief as "the source", "the source report", "the source text", "the provided material", "the report says", or "according to the source". A reader must never be able to tell you were working from a supplied document. This is the single most important rule about voice.

VOICE - this is what separates the article from filler:
- Open on the sharpest concrete fact, not a throat-clearing summary. No "In a significant development", no "has been making headlines", no restating the headline as the first sentence.
- Vary sentence length deliberately. Short sentences land. Then a longer one that carries the detail, the number, the qualification that a reader actually needs. Never let three consecutive sentences share the same shape.
- Prefer plain strong verbs. Cut "is set to", "looks to", "aims to", "seeks to" when a direct verb works.
- Banned as lazy AI register: "it is worth noting", "it is important to note", "plays a crucial/vital/key role", "underscores", "highlights the importance", "delve", "navigate the landscape", "in today's fast-paced", "sheds light on", "a stark reminder", "remains to be seen", "only time will tell", "in conclusion", "moreover", "furthermore".
- Use specifics over abstractions every time: the number, the date, the place, the job title, the exact wording of what someone said.
- Paragraphs of one to four sentences. Break them where a reader would take a breath.
- No summarising paragraph at the end. Finish on a fact, a consequence, or the next thing that happens.
- metaDescription must be 150-160 characters. metaTitle must be 50-60 characters.
- excerpt must be a factual standfirst of 25-40 words.
- factualClaims must list the atomic claims you carried over, each traceable to the source text.
- No markdown other than the links and the "H2: " prefixes. No bullet characters, asterisks, underscores, ellipses, or HTML entities.
- Do not state that the article was AI generated, and do not claim independent or on-the-ground reporting by Novexa News.`
        }
      ]
    })
  });

  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    return {
      pkg: null,
      reason: `OpenAI request failed (${response.status}: ${failure?.error?.code || failure?.error?.type || "unknown"})`
    };
  }

  const data = await response.json();
  const text = typeof data.output_text === "string"
    ? data.output_text
    : data.output
        ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
        .map((item: { text?: string }) => item.text)
        .filter(Boolean)
        .join("\n");

  const pkg = parseJson(text || "");
  if (!pkg) return { pkg: null, reason: "OpenAI response was not valid JSON" };
  return { pkg, reason: "" };
}

export async function rebuildArticle(input: RebuildInput): Promise<RebuildResult> {
  if (!input.extracted.ok) {
    return { ok: false, reason: `Source text unavailable (${input.extracted.reason || "unknown"})` };
  }

  const allowlist = buildAllowlist(input);
  const { pkg, reason } = await requestRebuild(input, allowlist);
  if (!pkg) return { ok: false, reason };
  if (pkg.sufficientEvidence === false) {
    return { ok: false, reason: `Insufficient source evidence: ${cleanRebuiltText(pkg.evidenceNote || "model declined")}`.slice(0, 300) };
  }
  if (!pkg.title || !pkg.content) return { ok: false, reason: "Model returned an incomplete package" };

  const allowedUrls = new Set(allowlist.map((entry) => entry.url));
  const { content, links } = enforceLinkAllowlist(cleanRebuiltContent(pkg.content), allowedUrls);
  const wordCount = countWords(content);
  const minimumWords = minimumRebuildWords();

  if (wordCount < minimumWords) {
    return { ok: false, reason: `Rebuilt article has ${wordCount} words; minimum is ${minimumWords}` };
  }

  const requiredLinks = Math.max(0, Number(process.env.REBUILD_REQUIRE_LINKS ?? 1));
  if (links.length < requiredLinks) {
    return { ok: false, reason: `Rebuilt article kept ${links.length} approved external links; minimum is ${requiredLinks}` };
  }

  const proposedTitle = cleanRebuiltText(pkg.title).slice(0, 95).replace(/[\s.,;:!?-]+$/, "");
  if (headlineIsCopied(proposedTitle, input.title)) {
    return { ok: false, reason: "Rebuilt headline is too close to the existing draft headline" };
  }

  const excerpt = cleanRebuiltText(pkg.excerpt || "").slice(0, 240).replace(/[\s.,;:!?-]+$/, "");
  const metaTitle = cleanRebuiltText(pkg.metaTitle || proposedTitle).slice(0, 68).replace(/[\s.,;:!?-]+$/, "");
  const metaDescription = cleanRebuiltText(pkg.metaDescription || excerpt).slice(0, 165).replace(/[\s.,;:!?-]+$/, "");

  const assessment = assessArticleQuality({
    title: proposedTitle,
    content,
    metaDescription,
    sourceTitle: input.title,
    sourceSummary: input.extracted.text,
    sourceUrl: input.sourceUrl,
    updatingExisting: true
  });

  if (!assessment.approved) {
    return { ok: false, reason: assessment.reason, assessment };
  }

  return {
    ok: true,
    article: {
      title: proposedTitle,
      slug: pkg.slug ? categorySlug(cleanRebuiltText(pkg.slug)) : "",
      excerpt,
      content,
      metaTitle,
      metaDescription,
      tags: tidyTags(pkg.tags, input.category),
      imageAlt: cleanRebuiltText(pkg.imageAlt || `${proposedTitle} news image`).slice(0, 125),
      externalLinks: links,
      factualClaims: (Array.isArray(pkg.factualClaims) ? pkg.factualClaims : [])
        .map((claim) => cleanRebuiltText(String(claim)))
        .filter(Boolean)
        .slice(0, 12),
      wordCount,
      assessment
    }
  };
}
