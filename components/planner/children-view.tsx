"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/utils";
import { Plus, Users, Star, BookOpen, Pencil, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

interface ChildrenViewProps {
  children: any[];
}

const INTERESTS = [
  "drawing", "reading", "animals", "building", "sport", "cooking",
  "music", "science", "outdoors", "dancing", "crafts", "films",
];

const LEARNING_STYLES = [
  { id: "visual", label: "Visual" },
  { id: "auditory", label: "Auditory" },
  { id: "kinesthetic", label: "Hands-on" },
  { id: "reading-writing", label: "Reading & Writing" },
];

const YEAR_BY_AGE: Record<number, string> = {
  4: "Reception", 5: "Year 1", 6: "Year 2", 7: "Year 3",
  8: "Year 4", 9: "Year 5", 10: "Year 6", 11: "Year 7",
};

function safeInterests(s: string | null | undefined): string[] {
  try { return JSON.parse(s ?? "[]"); } catch { return []; }
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditChildForm({ child, onDone }: { child: any; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState<string>(child.name);
  const [age, setAge] = useState<number>(child.age ?? 6);
  const [learningStyle, setLearningStyle] = useState<string>(child.learningStyle ?? "");
  const [interests, setInterests] = useState<string[]>(safeInterests(child.interests));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allInterests = Array.from(new Set([...INTERESTS, ...interests]));

  function toggle(i: string) {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/children/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        age,
        yearGroup: YEAR_BY_AGE[age] ?? child.yearGroup ?? "Year 1",
        learningStyle: learningStyle || null,
        interests,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save changes.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-brand-green-deep">Edit {child.name}</h2>
        <button type="button" onClick={onDone} aria-label="Cancel" className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label htmlFor={`name-${child.id}`} className="text-xs">First name</Label>
          <Input id={`name-${child.id}`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`age-${child.id}`} className="text-xs">Age</Label>
          <select
            id={`age-${child.id}`}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            {Object.keys(YEAR_BY_AGE).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Learning style</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {LEARNING_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setLearningStyle(s.id)}
              className={`text-xs rounded-full px-3 py-1.5 border ${learningStyle === s.id ? "border-brand-green bg-brand-mint text-brand-green-deep" : "border-border text-muted-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Interests</Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {allInterests.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`text-xs rounded-full px-2.5 py-1 capitalize border ${interests.includes(i) ? "border-brand-green bg-brand-mint text-brand-green-deep" : "border-border text-muted-foreground"}`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="bg-brand-green hover:bg-brand-green-deep gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteChildConfirm({ child, onCancel }: { child: any; onCancel: () => void }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/children/${child.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't delete. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
        <p className="text-sm text-destructive">
          This permanently deletes {child.name}&apos;s profile, lessons, journal entries, photos, progress and rewards.
          It cannot be undone. Consider downloading your data from Settings first.
        </p>
      </div>
      <div>
        <Label htmlFor={`confirm-${child.id}`} className="text-xs">
          Type <strong>{child.name}</strong> to confirm
        </Label>
        <Input id={`confirm-${child.id}`} value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={confirm}
          disabled={deleting || typed.trim() !== child.name}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-destructive hover:bg-destructive/90 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Delete permanently
        </button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ChildrenView({ children }: ChildrenViewProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">Children</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage profiles and track progress.</p>
        </div>
        <Link href="/onboarding/child">
          <Button className="bg-brand-green hover:bg-brand-green-deep gap-2">
            <Plus className="w-4 h-4" />
            Add child
          </Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-display font-semibold text-brand-green-deep mb-2">No children added yet</p>
            <p className="text-sm text-muted-foreground mb-6">Add your children to start their learning journey.</p>
            <Link href="/onboarding/child">
              <Button className="bg-brand-green hover:bg-brand-green-deep gap-2">
                <Plus className="w-4 h-4" />
                Add your first child
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => {
            const completedLessons = child.lessons?.filter((l: any) => l.status === "COMPLETED").length ?? 0;
            const interests = safeInterests(child.interests);

            return (
              <Card key={child.id} className="border-border/50">
                <CardContent className="p-5">
                  {editing === child.id ? (
                    <EditChildForm child={child} onDone={() => setEditing(null)} />
                  ) : deleting === child.id ? (
                    <DeleteChildConfirm child={child} onCancel={() => setDeleting(null)} />
                  ) : (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-mint flex items-center justify-center text-brand-green-deep font-display font-bold text-lg shrink-0">
                          {getInitials(child.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-display font-semibold text-brand-green-deep">{child.name}</h2>
                            {child.yearGroup && <Badge variant="success" className="text-xs">{child.yearGroup}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Age {child.age}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setDeleting(null); setEditing(child.id); }}
                            aria-label={`Edit ${child.name}`}
                            className="p-2 rounded-lg text-muted-foreground hover:text-brand-green hover:bg-brand-mint/50"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditing(null); setDeleting(child.id); }}
                            aria-label={`Delete ${child.name}`}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-brand-mint/50 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <p className="font-display font-bold text-xl text-brand-green-deep">{child.bloomStars}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Bloom stars</p>
                        </div>
                        <div className="bg-brand-amber/50 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <BookOpen className="w-4 h-4 text-brand-green" />
                            <p className="font-display font-bold text-xl text-brand-green-deep">{completedLessons}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Lessons done</p>
                        </div>
                      </div>

                      {interests.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {interests.slice(0, 5).map((interest: string) => (
                            <span key={interest} className="text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-1 capitalize">
                              {interest}
                            </span>
                          ))}
                          {interests.length > 5 && (
                            <span className="text-xs text-muted-foreground self-center">+{interests.length - 5}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
