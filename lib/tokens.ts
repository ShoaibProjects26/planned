/**
 * Single-use, expiring tokens for password reset and email verification.
 *
 * Stored in the existing NextAuth `VerificationToken` table. Only a SHA-256
 * hash of the token is stored, so a database leak doesn't expose usable
 * reset links. The identifier is namespaced ("reset:" / "verify:") so the two
 * flows can't be swapped.
 */

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

export type TokenPurpose = "reset" | "verify";

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Create a token (invalidating older ones for the same email + purpose). */
export async function createToken(purpose: TokenPurpose, email: string, ttlMs: number) {
  const identifier = `${purpose}:${email.toLowerCase()}`;
  const raw = randomBytes(32).toString("base64url");
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: { identifier, token: hash(raw), expires: new Date(Date.now() + ttlMs) },
  });
  return raw;
}

/** Consume a token. Returns the email it was issued for, or null if invalid/expired. */
export async function consumeToken(purpose: TokenPurpose, raw: string): Promise<string | null> {
  if (!raw || raw.length > 200) return null;
  const record = await db.verificationToken.findUnique({ where: { token: hash(raw) } });
  if (!record || !record.identifier.startsWith(`${purpose}:`)) return null;

  await db.verificationToken.delete({ where: { token: record.token } }).catch(() => {});
  if (record.expires < new Date()) return null;

  return record.identifier.slice(purpose.length + 1);
}
