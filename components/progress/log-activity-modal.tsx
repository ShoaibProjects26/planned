"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "History",
  "Geography",
  "Art",
  "Music",
  "Religious Studies",
  "PE",
  "Computing",
];

const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: "🔢",
  English: "📖",
  Science: "🔬",
  History: "🏺",
  Geography: "🗺️",
  Art: "🎨",
  Music: "🎵",
  "Religious Studies": "🌙",
  PE: "⚽",
  Computing: "💻",
};

interface Objective {
  id: string;
  text: string;
}

interface LogActivityModalProps {
  childId: string;
  objectives?: Objective[];
  onClose: () => void;
  onSaved: () => void;
}

export function LogActivityModal({
  childId,
  objectives = [],
  onClose,
  onSaved,
}: LogActivityModalProps) {
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [notes, setNotes] = useState("");
  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const relevantObjectives = subject
    ? objectives
    : objectives.slice(0, 12);

  function toggleObjective(text: string) {
    setSelectedObjectives((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !subject) {
      setError("Description and subject are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          description: description.trim(),
          subject,
          durationMins: durationMins ? parseInt(durationMins) : undefined,
          notes: notes.trim() || undefined,
          activityDate,
          objectivesLinked: selectedObjectives,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="font-display font-bold text-brand-green-deep">
            Log activity
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-sm font-medium text-brand-green-deep">
              What did you do? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="desc"
              placeholder="e.g. Read about Ancient Egypt at the library"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Subject grid */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-brand-green-deep">
              Subject <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all",
                    subject === s
                      ? "bg-brand-mint border-brand-green text-brand-green-deep font-medium"
                      : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/30 hover:bg-brand-mint/20"
                  )}
                >
                  <span className="text-base">{SUBJECT_ICONS[s] ?? "📚"}</span>
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-sm font-medium text-brand-green-deep">
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={480}
                placeholder="e.g. 30"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm font-medium text-brand-green-deep">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Link to objectives */}
          {relevantObjectives.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-brand-green-deep">
                Link to objectives{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {relevantObjectives.map((obj) => {
                  const sel = selectedObjectives.includes(obj.text);
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => toggleObjective(obj.text)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all",
                        sel
                          ? "bg-brand-green text-white border-brand-green"
                          : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/40"
                      )}
                    >
                      {sel && <CheckCircle className="w-3 h-3" />}
                      <span className="line-clamp-1 max-w-[180px]">{obj.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-brand-green-deep">
              Notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any observations or reflections..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-brand-green hover:bg-brand-green-deep gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Saving…" : "Save activity"}
          </Button>
        </form>
      </div>
    </div>
  );
}
