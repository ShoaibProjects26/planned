import { describe, expect, it } from "vitest";
import { blobAccessFor, isOwnJournalPhoto, journalPhotoProxyUrl } from "@/lib/blobCleanup";

const USER = "user_123";

describe("isOwnJournalPhoto", () => {
  it("accepts photos in the user's own journal folder", () => {
    expect(
      isOwnJournalPhoto(USER, `https://abc.private.blob.vercel-storage.com/journal/${USER}/1-x.jpg`),
    ).toBe(true);
  });

  it("rejects another user's photo", () => {
    expect(
      isOwnJournalPhoto(USER, "https://abc.private.blob.vercel-storage.com/journal/user_999/1-x.jpg"),
    ).toBe(false);
  });

  it("rejects non-Blob hosts, http, and junk", () => {
    expect(isOwnJournalPhoto(USER, `https://evil.example.com/journal/${USER}/a.jpg`)).toBe(false);
    expect(isOwnJournalPhoto(USER, `http://abc.private.blob.vercel-storage.com/journal/${USER}/a.jpg`)).toBe(false);
    expect(isOwnJournalPhoto(USER, "not a url")).toBe(false);
  });
});

describe("blobAccessFor", () => {
  it("detects legacy public uploads vs private ones", () => {
    expect(blobAccessFor("https://abc.public.blob.vercel-storage.com/journal/x.jpg")).toBe("public");
    expect(blobAccessFor("https://abc.private.blob.vercel-storage.com/journal/x.jpg")).toBe("private");
  });
});

describe("journalPhotoProxyUrl", () => {
  it("never exposes the storage URL to the browser", () => {
    expect(journalPhotoProxyUrl("e1", "https://abc.public.blob.vercel-storage.com/x.jpg")).toBe(
      "/api/journal/e1/photo",
    );
    expect(journalPhotoProxyUrl("e1", null)).toBeNull();
  });
});
