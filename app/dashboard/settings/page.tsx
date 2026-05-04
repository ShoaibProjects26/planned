"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  User,
  CreditCard,
  BookOpen,
  Bell,
  Trash2,
  ExternalLink,
  Check,
  ChevronRight,
  AlertTriangle,
  Zap,
  Sparkles,
  Leaf,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    location: string | null;
    subscriptionTier: string;
    subscriptionStatus: string;
    stripeCustomerId: string | null;
    hasPassword: boolean;
  };
  familyProfile: {
    curriculum: string;
    faith: string;
    faithIntegration: boolean;
  } | null;
  childCount: number;
  usageWeeks: number; // weeks of lessons generated
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  FREE:    { label: "Free",    icon: <Leaf className="w-4 h-4" />,     color: "text-slate-600",  bg: "bg-slate-100"  },
  BASIC:   { label: "Basic",   icon: <Zap className="w-4 h-4" />,      color: "text-brand-green", bg: "bg-brand-mint" },
  PREMIUM: { label: "Premium", icon: <Sparkles className="w-4 h-4" />, color: "text-purple-600",  bg: "bg-purple-100" },
};

const CURRICULUM_LABELS: Record<string, string> = {
  BNC:         "British National Curriculum",
  MONTESSORI:  "Montessori",
  UNSCHOOLING: "Unschooling / Child-led",
};

const FAITH_LABELS: Record<string, string> = {
  ISLAM:        "Islam",
  CHRISTIANITY: "Christianity",
  JUDAISM:      "Judaism",
  SECULAR:      "Secular (no faith integration)",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[hsl(var(--border))]">
        <span className="text-brand-green">{icon}</span>
        <h2 className="font-display font-semibold text-brand-green-deep">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [data, setData]           = useState<SettingsData | null>(null);
  const [loading, setLoading]     = useState(true);

  // Profile fields
  const [name, setName]           = useState("");
  const [location, setLocation]   = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg]       = useState("");

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwMsg, setPwMsg]         = useState("");

  // Curriculum / faith
  const [curriculum, setCurriculum]           = useState("BNC");
  const [faith, setFaith]                     = useState("SECULAR");
  const [faithIntegration, setFaithIntegration] = useState(false);
  const [prefSaving, setPrefSaving]           = useState(false);
  const [prefMsg, setPrefMsg]                 = useState("");

  // Stripe portal
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState("");

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Upgraded banner
  const [upgraded, setUpgraded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const json: SettingsData = await res.json();
        setData(json);
        setName(json.user.name ?? "");
        setLocation(json.user.location ?? "");
        setCurriculum(json.familyProfile?.curriculum ?? "BNC");
        setFaith(json.familyProfile?.faith ?? "SECULAR");
        setFaithIntegration(json.familyProfile?.faithIntegration ?? false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Check for upgraded=1 query param
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgraded") === "1") {
        setUpgraded(true);
        // Clean up URL
        window.history.replaceState({}, "", "/dashboard/settings");
      }
    }
  }, [fetchData]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location }),
      });
      if (res.ok) {
        setProfileMsg("Saved!");
        await updateSession({ name });
      } else {
        const d = await res.json();
        setProfileMsg(d.error ?? "Failed to save");
      }
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(""), 3000);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg("");
    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwMsg("Password updated!");
        setCurrentPw("");
        setNewPw("");
      } else {
        setPwMsg(d.error ?? "Failed to update password");
      }
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(""), 4000);
    }
  }

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setPrefSaving(true);
    setPrefMsg("");
    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculum, faith, faithIntegration }),
      });
      if (res.ok) setPrefMsg("Saved!");
      else {
        const d = await res.json();
        setPrefMsg(d.error ?? "Failed to save");
      }
    } finally {
      setPrefSaving(false);
      setTimeout(() => setPrefMsg(""), 3000);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    setPortalError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else setPortalError(d.error ?? "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        await updateSession(null);
        router.push("/?deleted=1");
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Loading settings…</span>
      </div>
    );
  }

  const tier     = data?.user.subscriptionTier ?? "FREE";
  const tierMeta = TIER_META[tier] ?? TIER_META.FREE;
  const isPaid   = tier !== "FREE";

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <h1 className="font-display text-xl font-bold text-brand-green-deep">Settings</h1>

      {/* Upgraded banner */}
      {upgraded && (
        <div className="flex items-center gap-3 bg-brand-mint border border-brand-green/30 rounded-2xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-brand-green shrink-0" />
          <p className="text-sm font-medium text-brand-green-deep">
            You&apos;re now on the {tier} plan — welcome aboard! 🎉
          </p>
        </div>
      )}

      {/* ── Subscription / Plan ─────────────────────────────────────────── */}
      <Section title="Current plan" icon={<CreditCard className="w-4 h-4" />}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tierMeta.bg)}>
              <span className={tierMeta.color}>{tierMeta.icon}</span>
            </div>
            <div>
              <p className="font-semibold text-brand-green-deep">
                {tierMeta.label} plan
              </p>
              {data && (
                <p className="text-xs text-muted-foreground">
                  {data.childCount} of {tier === "FREE" ? "1" : tier === "BASIC" ? "2" : "∞"} children
                  {" · "}
                  {data.user.subscriptionStatus !== "INACTIVE" && (
                    <span className={cn(
                      "capitalize",
                      data.user.subscriptionStatus === "ACTIVE" && "text-brand-green font-medium"
                    )}>
                      {data.user.subscriptionStatus.toLowerCase()}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {isPaid ? (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-[hsl(var(--border))] hover:border-brand-green/30 hover:text-brand-green px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Manage subscription
            </button>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-3.5 py-2 rounded-xl transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade plan
            </Link>
          )}
        </div>

        {portalError && (
          <p className="mt-3 text-xs text-destructive">{portalError}</p>
        )}

        {/* Usage stats */}
        {data && (
          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl px-4 py-3">
              <p className="font-bold text-lg text-brand-green-deep">{data.childCount}</p>
              <p className="text-xs text-muted-foreground">
                of {tier === "FREE" ? "1" : tier === "BASIC" ? "2" : "unlimited"} children
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl px-4 py-3">
              <p className="font-bold text-lg text-brand-green-deep">{data.usageWeeks}</p>
              <p className="text-xs text-muted-foreground">
                of {tier === "FREE" ? "1" : tier === "BASIC" ? "~4" : "unlimited"} weeks planned
              </p>
            </div>
          </div>
        )}
      </Section>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <Section title="Profile" icon={<User className="w-4 h-4" />}>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-brand-green-deep">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-brand-green-deep">Email</Label>
              <Input
                value={data?.user.email ?? session.user?.email ?? ""}
                disabled
                className="rounded-xl bg-muted/50"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-sm font-medium text-brand-green-deep">
              Location <span className="text-muted-foreground font-normal text-xs">(town / city)</span>
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Manchester"
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={profileSaving}
              className="bg-brand-green hover:bg-brand-green-deep gap-2"
            >
              {profileSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save profile
            </Button>
            {profileMsg && (
              <span className={cn(
                "text-sm flex items-center gap-1",
                profileMsg === "Saved!" ? "text-brand-green" : "text-destructive"
              )}>
                {profileMsg === "Saved!" && <Check className="w-3.5 h-3.5" />}
                {profileMsg}
              </span>
            )}
          </div>
        </form>

        {/* Password section — only for credential accounts */}
        {data?.user.hasPassword && (
          <form onSubmit={savePassword} className="mt-5 pt-5 border-t border-[hsl(var(--border))] space-y-4">
            <h3 className="text-sm font-semibold text-brand-green-deep">Change password</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cpw" className="text-sm font-medium text-brand-green-deep">
                  Current password
                </Label>
                <Input
                  id="cpw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="npw" className="text-sm font-medium text-brand-green-deep">
                  New password
                </Label>
                <Input
                  id="npw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="outline"
                disabled={pwSaving || !currentPw || !newPw}
                className="gap-2"
              >
                {pwSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Update password
              </Button>
              {pwMsg && (
                <span className={cn(
                  "text-sm flex items-center gap-1",
                  pwMsg.includes("updated") ? "text-brand-green" : "text-destructive"
                )}>
                  {pwMsg.includes("updated") && <Check className="w-3.5 h-3.5" />}
                  {pwMsg}
                </span>
              )}
            </div>
          </form>
        )}
      </Section>

      {/* ── Curriculum & faith preferences ──────────────────────────────── */}
      <Section title="Curriculum & faith" icon={<BookOpen className="w-4 h-4" />}>
        <form onSubmit={savePreferences} className="space-y-5">
          {/* Curriculum */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-brand-green-deep">Curriculum</Label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(CURRICULUM_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCurriculum(value)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl border text-sm text-left transition-all",
                    curriculum === value
                      ? "bg-brand-mint border-brand-green text-brand-green-deep font-medium"
                      : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/30"
                  )}
                >
                  <span>{label}</span>
                  {curriculum === value && (
                    <Check className="w-4 h-4 text-brand-green shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Faith */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-brand-green-deep">
              Faith integration
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(FAITH_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFaith(value);
                    if (value === "SECULAR") setFaithIntegration(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl border text-sm text-left transition-all",
                    faith === value
                      ? "bg-brand-mint border-brand-green text-brand-green-deep font-medium"
                      : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/30"
                  )}
                >
                  <span>{label}</span>
                  {faith === value && <Check className="w-4 h-4 text-brand-green shrink-0" />}
                </button>
              ))}
            </div>
            {faith !== "SECULAR" && (
              <label className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={faithIntegration}
                  onChange={(e) => setFaithIntegration(e.target.checked)}
                  className="w-4 h-4 accent-brand-green"
                />
                <span className="text-sm text-brand-green-deep">
                  Integrate faith connections into lessons
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={prefSaving}
              className="bg-brand-green hover:bg-brand-green-deep gap-2"
            >
              {prefSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save preferences
            </Button>
            {prefMsg && (
              <span className={cn(
                "text-sm flex items-center gap-1",
                prefMsg === "Saved!" ? "text-brand-green" : "text-destructive"
              )}>
                {prefMsg === "Saved!" && <Check className="w-3.5 h-3.5" />}
                {prefMsg}
              </span>
            )}
          </div>
        </form>
      </Section>

      {/* ── Notifications ───────────────────────────────────────────────── */}
      <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
        <div className="space-y-3">
          {[
            { id: "weekly-summary",  label: "Weekly progress summary",     sub: "Sent every Sunday evening" },
            { id: "new-lessons",     label: "New lesson plan ready",        sub: "When a new week is generated" },
            { id: "bloom-milestone", label: "Bloom milestones",             sub: "When your child unlocks a garden element" },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between gap-4 cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-brand-green-deep">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 accent-brand-green"
              />
            </label>
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            Email notifications — coming soon. Settings are saved for when they launch.
          </p>
        </div>
      </Section>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <Section title="Danger zone" icon={<Trash2 className="w-4 h-4" />}>
        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-green-deep">Delete account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete your account and all data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm font-medium text-destructive border border-destructive/30 hover:bg-destructive/5 px-4 py-2 rounded-xl transition-colors"
            >
              Delete account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                This will permanently delete your account, all children&apos;s data, lessons,
                journal entries, and cancel your subscription. There is no recovery.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-destructive hover:bg-destructive/90 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, delete everything
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-sm text-muted-foreground hover:text-brand-green"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      <div className="h-4" />
    </div>
  );
}
