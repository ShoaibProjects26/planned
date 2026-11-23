import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    location,
    // Family profile
    curriculum,
    faith,
    faithIntegration,
    // Password change
    currentPassword,
    newPassword,
  } = body;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Password change ──────────────────────────────────────────────────────────
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Password change is only available for email/password accounts" },
        { status: 400 }
      );
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hash },
    });
    // If only changing password, return early
    if (!name && !location && !curriculum) {
      return NextResponse.json({ ok: true, message: "Password updated" });
    }
  }

  // ── Profile update ───────────────────────────────────────────────────────────
  const userUpdateData: Record<string, unknown> = {};
  if (name !== undefined)     userUpdateData.name     = name;
  if (location !== undefined) userUpdateData.location = location;

  if (Object.keys(userUpdateData).length > 0) {
    await db.user.update({ where: { id: session.user.id }, data: userUpdateData });
  }

  // ── Family profile update ────────────────────────────────────────────────────
  if (curriculum !== undefined || faith !== undefined || faithIntegration !== undefined) {
    await db.familyProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        curriculum: curriculum ?? "BNC",
        faith: faith ?? "SECULAR",
        faithIntegration: faithIntegration ?? false,
      },
      update: {
        ...(curriculum        !== undefined && { curriculum }),
        ...(faith             !== undefined && { faith }),
        ...(faithIntegration  !== undefined && { faithIntegration }),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
