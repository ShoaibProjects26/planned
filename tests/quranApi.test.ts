import { describe, expect, it } from "vitest";
import { parseVerseKey } from "@/lib/quranApi";

describe("parseVerseKey", () => {
  it("parses Quran references", () => {
    expect(parseVerseKey("Surah Al-Baqarah 2:286")).toBe("2:286");
    expect(parseVerseKey("Quran 94:5")).toBe("94:5");
    expect(parseVerseKey("2 : 255")).toBe("2:255");
  });

  it("rejects Hadith references so they are never paired with a Quran verse", () => {
    expect(parseVerseKey("Sahih al-Bukhari 1:2")).toBeNull();
    expect(parseVerseKey("Sahih Muslim 45:12")).toBeNull();
    expect(parseVerseKey("Hadith 3:4")).toBeNull();
    expect(parseVerseKey("Riyad as-Salihin 1:1")).toBeNull();
    expect(parseVerseKey("Jami` at-Tirmidhi 2:3")).toBeNull();
  });

  it("rejects impossible surah numbers and vague references", () => {
    expect(parseVerseKey("Surah 115:1")).toBeNull();
    expect(parseVerseKey("Surah 0:1")).toBeNull();
    expect(parseVerseKey("Quran")).toBeNull();
    expect(parseVerseKey("Quran 2")).toBeNull();
  });
});
