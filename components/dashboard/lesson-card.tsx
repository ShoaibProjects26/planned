"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, CheckCircle, Clock, Eye, Loader2, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AddEntryModal } from "@/components/journal/add-entry-modal";

// Subject → colour mapping
const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "bg-blue-500",
  maths: "bg-blue-500",
  english: "bg-violet-500",
  literacy: "bg-violet-500",
  science: "bg-emerald-500",
  history: "bg-amber-500",
  geography: "bg-teal-500",
  art: "bg-pink-500",
  music: "bg-purple-500",
  "religious studies": "bg-indigo-500",
  re: "bg-indigo-500",
  pe: "bg-orange-500",
  "physical education": "bg-orange-500",
  computing: "bg-cyan-500",
};

function subjectColor(subject: string): string {
  return SUBJECT_COLORS[subject.toLowerCase()] ?? "bg-brand-green";
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LessonCardProps {
  lesson: {
    id: string;
    subject: string;
    topic: string;
    status: string;
    durationMins: number;
    startedAt: string | null;
    completedAt: string | null;
    parsedContent: {
      title?: string;
      description?: string;
      objectives?: string[];
    };
  };
  subjectProgress?: { done: number; total: number };
  onStatusChange?: (id: string, status: string) => void;
  /** Child info needed for journal prompt */
  childId?: string;
  childName?: string;
}

export function LessonCard({ lesson, subjectProgress, onStatusChange, childId, childName }: LessonCardProps) {
  const [status, setStatus] = useState(lesson.status);
  const [startedAt, setStartedAt] = useState<Date | null>(
    lesson.startedAt ? new Date(lesson.startedAt) : null
  );
  const [completedAt, setCompletedAt] = useState<Date | null>(
    lesson.completedAt ? new Date(lesson.completedAt) : null
  );
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showJournalPrompt, setShowJournalPrompt] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);

  // Live timer while in progress
  useEffect(() => {
    if (status !== "IN_PROGRESS" || !startedAt) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, startedAt]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/start`, { method: "POST" });
      if (res.ok) {
        const now = new Date();
        setStartedAt(now);
        setStatus("IN_PROGRESS");
        onStatusChange?.(lesson.id, "IN_PROGRESS");
      }
    } finally {
      setLoading(false);
    }
  }, [lesson.id, onStatusChange]);

  const handleComplete = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, { method: "POST" });
      if (res.ok) {
        const now = new Date();
        setCompletedAt(now);
        setStatus("COMPLETED");
        onStatusChange?.(lesson.id, "COMPLETED");
        // Show journal prompt if child info is available
        if (childId) setShowJournalPrompt(true);
      }
    } finally {
      setLoading(false);
    }
  }, [lesson.id, onStatusChange, childId]);

  const title = lesson.parsedContent?.title || lesson.topic;
  const description = lesson.parsedContent?.description;
  const progressPct =
    subjectProgress && subjectProgress.total > 0
      ? Math.round((subjectProgress.done / subjectProgress.total) * 100)
      : 0;

  const durationText =
    status === "COMPLETED" && startedAt && completedAt
      ? `${formatTime(startedAt)} – ${formatTime(completedAt)} · ${Math.round(
          (completedAt.getTime() - startedAt.getTime()) / 60000
        )} min`
      : `${lesson.durationMins} min`;

  return (
    <>
    {showJournalModal && childId && childName && (
      <AddEntryModal
        childId={childId}
        childName={childName}
        prefill={{ lessonId: lesson.id, subject: lesson.subject, topic: lesson.parsedContent?.title || lesson.topic }}
        onClose={() => setShowJournalModal(false)}
        onSaved={() => setShowJournalModal(false)}
      />
    )}
    <div
      className={cn(
        "bg-white rounded-2xl border transition-all duration-200",
        status === "COMPLETED"
          ? "border-brand-green/30 bg-brand-mint/20"
          : status === "IN_PROGRESS"
          ? "border-brand-green shadow-sm shadow-brand-green/10"
          : "border-[hsl(var(--border))] hover:border-brand-green/30 hover:shadow-sm"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              subjectColor(lesson.subject)
            )}
          />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {lesson.subject}
          </span>
        </div>

        {/* Status pill */}
        {status === "PENDING" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            Not started
          </span>
        )}
        {status === "IN_PROGRESS" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green bg-brand-mint px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            {formatElapsed(elapsed)}
          </span>
        )}
        {status === "COMPLETED" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green-deep bg-brand-mint px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Done
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <h3 className="font-display font-semibold text-brand-green-deep leading-snug mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        {/* Completed time info */}
        {status === "COMPLETED" && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {durationText}
          </p>
        )}

        {/* Subject progress bar */}
        {subjectProgress && subjectProgress.total > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{lesson.subject} progress</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Actions */}
      {status === "COMPLETED" && (
        <div className="px-4 pb-4">
          <Button size="sm" variant="outline" className="gap-1.5 border-[hsl(var(--border))] w-full" asChild>
            <Link href={`/dashboard/lesson/${lesson.id}`}>
              <Eye className="w-3.5 h-3.5" />
              View lesson plan
            </Link>
          </Button>
        </div>
      )}
      {status !== "COMPLETED" && (
        <div className="px-4 pb-4 flex items-center gap-2">
          {status === "PENDING" && (
            <Button
              size="sm"
              className="bg-brand-green hover:bg-brand-green-deep gap-1.5 flex-1"
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Start lesson
            </Button>
          )}
          {status === "IN_PROGRESS" && (
            <Button
              size="sm"
              className="bg-brand-green hover:bg-brand-green-deep gap-1.5 flex-1"
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Mark complete
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 border-[hsl(var(--border))]" asChild>
            <Link href={`/dashboard/lesson/${lesson.id}`}>
              <Eye className="w-3.5 h-3.5" />
              View
            </Link>
          </Button>
        </div>
      )}

      {/* Journal prompt — shown after marking complete */}
      {showJournalPrompt && (
        <div className="mx-4 mb-4 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 font-medium truncate">
              Add a note to {childName ?? "the"} journal?
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowJournalModal(true)}
              className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-2.5 py-1 rounded-lg transition-colors"
            >
              Add note
            </button>
            <button
              onClick={() => setShowJournalPrompt(false)}
              className="w-5 h-5 flex items-center justify-center text-amber-500 hover:text-amber-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
