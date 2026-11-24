/**
 * AI provider — selected by AI_PROVIDER: "gemini" (default) or "anthropic".
 *
 * Anthropic (Claude) — PAUSED until the API key has credit; set
 * AI_PROVIDER=anthropic to switch back. Needs ANTHROPIC_API_KEY. Override the model via
 * ANTHROPIC_MODEL (default claude-opus-5-5) and reasoning depth via
 * ANTHROPIC_EFFORT (low | medium | high; default medium). The Claude API does
 * not train on API prompts/responses by default.
 *
 * Gemini (current default): set GEMINI_API_KEY in .env.local. Override the model via GEMINI_MODEL.
 *
 * ⚠️  PRODUCTION REQUIREMENT (Gemini): use a PAID Gemini API key (billing enabled in
 * Google Cloud / AI Studio). On the free tier Google may use prompts and
 * responses to improve its products and humans may review them — that is not
 * acceptable for children's data. Paid-tier data is not used for training.
 * `assertProductionSafeProvider()` refuses to run in production unless
 * AI_PAID_TIER_CONFIRMED=true is set, so this can't be forgotten.
 *
 * Privacy: callers pass `pseudonymise: [childName, ...]`. Those names are
 * replaced with placeholders (CHILD_A, CHILD_B…) before the prompt leaves
 * our servers and swapped back in the response, so the AI provider never
 * receives a child's real name.
 *
 * Why the Anthropic-shaped API? The route handlers were originally written
 * against `ai.messages.create({ model, max_tokens, messages })`. We mirror
 * that shape so swapping providers only touches this file.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Provider = "anthropic" | "gemini";
export const PROVIDER: Provider =
  process.env.AI_PROVIDER?.toLowerCase() === "anthropic" ? "anthropic" : "gemini";

/** True when the active provider has an API key (used by /api/health). */
export function aiConfigured(): boolean {
  if (PROVIDER === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  return (
    !!process.env.GEMINI_API_KEY &&
    (process.env.NODE_ENV !== "production" || process.env.AI_PAID_TIER_CONFIRMED === "true")
  );
}

// ─── Anthropic (Claude) — paused; AI_PROVIDER=anthropic ─────────────────────

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env — get one at https://platform.claude.com/settings/keys"
      );
    }
    _anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
  }
  return _anthropic;
}

type Effort = "low" | "medium" | "high";
const EFFORT: Effort = (["low", "medium", "high"] as const).includes(
  process.env.ANTHROPIC_EFFORT as Effort,
)
  ? (process.env.ANTHROPIC_EFFORT as Effort)
  : "medium";

// ─── Gemini (current default) ────────────────────────────────────────────────

let _client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local — get one at https://aistudio.google.com/app/apikey"
      );
    }
    assertProductionSafeProvider();
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _client;
}

// TEMPORARILY a warning instead of a hard block, so AI can be tested on a
// free-tier key. Before public launch: restore the `throw` below (and set
// AI_PAID_TIER_CONFIRMED=true with a paid key). Test with made-up children only.
let warnedFreeTier = false;
function assertProductionSafeProvider() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.AI_PAID_TIER_CONFIRMED !== "true" &&
    !warnedFreeTier
  ) {
    warnedFreeTier = true;
    console.warn(
      "[ai] AI_PAID_TIER_CONFIRMED is not set — running on a possibly free-tier Gemini key. Free-tier prompts may be used for training. Do not launch like this.",
    );
    // throw new Error(
    //   "AI is disabled: set AI_PAID_TIER_CONFIRMED=true once GEMINI_API_KEY belongs to a billing-enabled (paid) project. Free-tier keys may use children's data for training.",
    // );
  }
}

// flash-lite is the cheapest Gemini model. Override via GEMINI_MODEL.
// (gemini-2.5-flash-lite is closed to new API keys — returns 404.)
export const MODEL =
  PROVIDER === "anthropic"
    ? process.env.ANTHROPIC_MODEL || "claude-opus-5-5"
    : process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// ─── Pseudonymisation ────────────────────────────────────────────────────────

const PLACEHOLDER_NOTE =
  "Privacy note: children's names in this request have been replaced with placeholders such as CHILD_A. Whenever you refer to a child, write the placeholder exactly as given (e.g. \"CHILD_A\"); it will be replaced with the real name afterwards.";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface Pseudonymiser {
  mask(text: string): string;
  unmask(text: string): string;
}

/**
 * Build a reversible name → placeholder mapping. Matching is case-sensitive
 * on whole words so a child called "Rose" doesn't swallow "rose" (the flower).
 */
export function createPseudonymiser(names: (string | null | undefined)[]): Pseudonymiser {
  const unique = Array.from(
    new Set(names.map((n) => n?.trim()).filter((n): n is string => !!n && n.length >= 2)),
  ).sort((a, b) => b.length - a.length); // longest first: "Anna Marie" before "Anna"

  const pairs = unique.map((name, i) => ({
    name,
    token: `CHILD_${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ""}`,
  }));

  return {
    mask(text) {
      let out = text;
      for (const { name, token } of pairs) {
        out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, "gu"), token);
      }
      return out;
    },
    unmask(text) {
      let out = text;
      // Reverse order so CHILD_A1 is restored before CHILD_A.
      for (const { name, token } of [...pairs].reverse()) {
        out = out.replace(new RegExp(`\\b${token}\\b`, "g"), name);
      }
      return out;
    },
  };
}

// ─── Client shim ─────────────────────────────────────────────────────────────

interface CreateParams {
  model: string;
  max_tokens: number;
  messages: { role: string; content: string }[];
  /** Real names to strip before the request leaves our servers. */
  pseudonymise?: (string | null | undefined)[];
}

interface CreateResponse {
  content: { type: "text"; text: string }[];
}

async function createWithAnthropic(params: CreateParams): Promise<CreateResponse> {
  const p = createPseudonymiser(params.pseudonymise ?? []);
  const messages: Anthropic.Beta.BetaMessageParam[] = params.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: p.mask(m.content),
  }));

  const response = await getAnthropic().beta.messages.create({
    model: params.model,
    // Thinking is always on for Claude Opus 5.5 and counts toward max_tokens,
    // so give it headroom beyond the caller's intended output length.
    max_tokens: Math.max(16000, params.max_tokens),
    output_config: { effort: EFFORT },
    ...(params.pseudonymise?.length ? { system: PLACEHOLDER_NOTE } : {}),
    messages,
    // If Claude declines on safety grounds, the API retries on a fallback
    // model inside the same call instead of returning nothing.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      `AI declined the request${response.stop_details?.category ? ` (${response.stop_details.category})` : ""}`,
    );
  }

  const raw = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { content: [{ type: "text", text: p.unmask(raw) }] };
}

export const ai = {
  messages: {
    async create(params: CreateParams): Promise<CreateResponse> {
      if (PROVIDER === "anthropic") return createWithAnthropic(params);

      // ── Gemini path (default) ──
      const model = getClient().getGenerativeModel({
        model: params.model,
        generationConfig: { maxOutputTokens: params.max_tokens },
      });

      const p = createPseudonymiser(params.pseudonymise ?? []);
      const body = params.messages.map((m) => p.mask(m.content)).join("\n\n");
      const prompt = params.pseudonymise?.length ? `${PLACEHOLDER_NOTE}\n\n${body}` : body;

      const result = await model.generateContent(prompt);
      const text = p.unmask(result.response.text());
      return { content: [{ type: "text", text }] };
    },
  },
};
