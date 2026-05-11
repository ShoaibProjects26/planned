/**
 * Quran.com API client.
 *
 * The AI suggests a reference (e.g. "Surah Al-Baqarah 2:286") which we
 * trust for *which* verse to cite, but NOT for the actual Arabic text
 * or the translation — Gemini/Claude were occasionally fabricating
 * Arabic and translations that didn't match the cited verse.
 *
 * This module pulls the real Uthmani Arabic and a verified English
 * translation (Sahih International) from Quran.com's free public API.
 *
 * Docs: https://quran.com/api-docs
 */

interface QuranVerseResponse {
  verse?: {
    text_uthmani?: string;
    translations?: Array<{ text: string; resource_name?: string }>;
  };
}

export interface QuranVerse {
  /** Original Arabic in the Uthmani script. */
  arabicText: string;
  /** English translation (Sahih International). HTML stripped. */
  translation: string;
  /** Normalised "chapter:verse" key, e.g. "2:286". */
  verseKey: string;
}

/**
 * Pull "chapter:verse" out of a reference string like
 *   "Surah Al-Baqarah 2:286"  → "2:286"
 *   "Quran 2:286"             → "2:286"
 *   "2:286"                   → "2:286"
 * Returns null when no pattern matches.
 */
function parseVerseKey(reference: string): string | null {
  const match = reference.match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return null;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  // Quran has 114 surahs; ayah numbers vary but are always positive.
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  return `${surah}:${ayah}`;
}

/** Sahih International translation resource id on Quran.com. */
const TRANSLATION_ID = 20;

/**
 * Fetch the verified Arabic + English translation for a Quran reference.
 * Returns null on any failure so callers can fall back gracefully.
 */
export async function fetchQuranVerse(reference: string): Promise<QuranVerse | null> {
  const verseKey = parseVerseKey(reference);
  if (!verseKey) return null;

  const url = new URL(`https://api.quran.com/api/v4/verses/by_key/${verseKey}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("words", "false");
  url.searchParams.set("translations", String(TRANSLATION_ID));
  url.searchParams.set("fields", "text_uthmani");

  try {
    const res = await fetch(url.toString(), {
      // Verse text never changes — cache for a day.
      next: { revalidate: 86_400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[quranApi] ${verseKey} returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as QuranVerseResponse;
    const arabic = data.verse?.text_uthmani?.trim();
    const rawTranslation = data.verse?.translations?.[0]?.text?.trim();
    if (!arabic || !rawTranslation) return null;

    // Sahih International embeds footnote markers like <sup foot_note="...">1</sup>;
    // strip every HTML tag and collapse whitespace so the result reads cleanly.
    const translation = rawTranslation.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    return { arabicText: arabic, translation, verseKey };
  } catch (err) {
    console.warn(`[quranApi] fetch failed for ${verseKey}:`, err);
    return null;
  }
}
