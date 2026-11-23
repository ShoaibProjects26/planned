import { del, list } from "@vercel/blob";

/**
 * Helpers for children's journal photos stored in Vercel Blob.
 *
 * Deleting a DB row does not delete the underlying file, so without these
 * helpers photos would survive after the parent deletes the entry, the
 * child, or their whole account.
 *
 * Deletion helpers are best-effort: a storage failure is logged but never
 * blocks the user's deletion request.
 */

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Older uploads were public; new ones are private. Detect from the URL. */
export function blobAccessFor(url: string): "public" | "private" {
  try {
    return new URL(url).hostname.includes(".public.blob.") ? "public" : "private";
  } catch {
    return "private";
  }
}

/** True if `url` is a Blob URL inside this user's journal folder. */
export function isOwnJournalPhoto(userId: string, url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".blob.vercel-storage.com") &&
      u.pathname.startsWith(`/journal/${userId}/`)
    );
  } catch {
    return false;
  }
}

/** URL the browser uses to view a journal photo (authenticated proxy). */
export function journalPhotoProxyUrl(entryId: string, photoUrl: string | null | undefined) {
  return photoUrl ? `/api/journal/${entryId}/photo` : null;
}

/** Delete a single journal photo, only if it lives under this user's prefix. */
export async function deleteJournalPhoto(userId: string, photoUrl: string | null | undefined) {
  if (!photoUrl || !blobConfigured()) return;
  try {
    if (!isOwnJournalPhoto(userId, photoUrl)) return;
    await del(photoUrl);
  } catch (err) {
    console.error("[blobCleanup] failed to delete photo:", err instanceof Error ? err.message : err);
  }
}

/** Delete several journal photos belonging to this user. */
export async function deleteJournalPhotos(userId: string, photoUrls: (string | null | undefined)[]) {
  if (!blobConfigured()) return;
  const own = photoUrls.filter((u): u is string => !!u && isOwnJournalPhoto(userId, u));
  if (!own.length) return;
  try {
    await del(own);
  } catch (err) {
    console.error("[blobCleanup] failed to delete photos:", err instanceof Error ? err.message : err);
  }
}

/** Delete every journal photo uploaded by this user. */
export async function deleteAllUserPhotos(userId: string) {
  if (!blobConfigured()) return;
  try {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: `journal/${userId}/`, cursor, limit: 1000 });
      if (page.blobs.length) await del(page.blobs.map((b) => b.url));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (err) {
    console.error("[blobCleanup] failed to delete user photos:", err instanceof Error ? err.message : err);
  }
}
