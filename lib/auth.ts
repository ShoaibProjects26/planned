import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Google sign-in is only offered when its OAuth client is configured, so the
 * UI never shows a button that lands on a Google error page.
 */
export const googleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  providers: [
    ...(googleAuthEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();

        // Brute-force protection: max 10 attempts per email per 15 minutes.
        const rl = await rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
        if (!rl.ok) {
          throw new Error("Too many sign-in attempts. Please wait 15 minutes or reset your password.");
        }

        const user = await db.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (!user?.passwordHash) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordMatch) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      // Only trust Google accounts whose address Google itself has verified.
      const google = profile as GoogleProfile | undefined;
      if (!google?.email || !google.email_verified) return false;

      // If an email/password account already uses this address, NextAuth
      // refuses the sign-in (OAuthAccountNotLinked). Link Google to it here —
      // but only when the parent has verified the address on that account.
      // Otherwise someone could pre-register a victim's email with a password,
      // wait for the victim to use Google, and keep access via the password.
      const existing = await db.user.findFirst({
        where: { email: { equals: google.email, mode: "insensitive" } },
        select: {
          id: true,
          emailVerified: true,
          accounts: { where: { provider: "google" }, select: { id: true } },
        },
      });
      if (existing?.emailVerified && existing.accounts.length === 0) {
        await db.account.create({
          data: {
            userId: existing.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state,
          },
        });
      }
      return true;
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture as string | null | undefined;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      // Initial sign-in — `user` is provided. Persist its fields onto the token
      // so subsequent requests don't have to hit the database.
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        return token;
      }

      // Refresh from DB only when explicitly requested (e.g. via `update()` in
      // the client after a profile change). Avoids an N+1 on every request.
      if (trigger === "update" && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, name: true, email: true, image: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
        }
      }

      return token;
    },
  },
  events: {
    // NextAuth creates Google users with emailVerified = null, which would show
    // them our "verify your email" banner. Google has already verified the
    // address (checked in callbacks.signIn), so record that — as long as it is
    // the same address as the one on the Planned account.
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.email || !profile?.email) return;
      if (user.email.toLowerCase() !== profile.email.toLowerCase()) return;
      try {
        await db.user.updateMany({
          where: { id: user.id, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      } catch (err) {
        console.error("[auth] marking Google email verified failed:", err instanceof Error ? err.message : err);
      }
    },
  },
};
