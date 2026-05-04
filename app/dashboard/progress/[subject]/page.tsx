"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useActiveChild } from "@/contexts/active-child";
import { CircularProgress } from "@/components/progress/circular-progress";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  BookCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonItem {
  id: string;
  topic: string;
  completedAt?: string | null;
  durationMins?: number;
  objectivesDone?: number;
  objectivesTotal?: number;
}

interface ObjectiveItem {
  id: string;
  lessonId: string;
  lessonTopic: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
}

interface ExternalActivity {
  id: string;
  description: string;
  durationMins: number;
  activityDate: string;
}

interface SubjectData {
  subject: string;
  child: { id: string; name: string; yearGroup: string | null };
  progress: {
    topicsCompleted: number;
    topicsTotal: number;
    topicsInProgress: number;
    objectivesMet: number;
    totalMinutes: number;
  };
  abilityLevel: string;
  lessons: {
    completed: LessonItem[];
    inProgress: LessonItem[];
    upcoming: LessonItem[];
  };
  objectives: ObjectiveItem[];
  externalActivities: ExternalActivity[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "#3b82f6",
  maths: "#3b82f6",
  english: "#8b5cf6",
  science: "#10b981",
  history: "#f59e0b",
  geography: "#14b8a6",
  art: "#ec4899",
  music: "#a855f7",
  "religious studies": "#6366f1",
  pe: "#f97316",
  computing: "#06b6d4",
};

const ABILITY_STYLES: Record<string, string> = {
  EMERGING: "bg-amber-100 text-amber-700",
  DEVELOPING: "bg-blue-100 text-blue-700",
  SECURE: "bg-emerald-100 text-emerald-700",
  EXCEEDING: "bg-purple-100 text-purple-700",
};

function subjectColor(subject: string) {
  return SUBJECT_COLORS[subject.toLowerCase()] ?? "#1D9E75";
}

function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMinutes(mins: number): string {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

// ─── Note section ─────────────────────────────────────────────────────────────

function ParentNote({
  subject,
  childId,
}: {
  subject: string;
  childId: string;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/progress/${encodeURIComponent(subject)}/note`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setNote(data.note ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [subject, childId]);

  if (note) {
    return (
      <div className="bg-brand-mint/30 rounded-2xl border border-brand-green/20 px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-brand-green" />
          <span className="text-sm font-semibold text-brand-green-deep">
            Parent guidance
          </span>
        </div>
        <p className="text-sm text-brand-green-deep/80 leading-relaxed">{note}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-green" />
        <span className="text-sm font-semibold text-brand-green-deep">
          Parent guidance
        </span>
      </div>
      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Couldn't generate guidance.</span>
          <button
            onClick={generate}
            className="underline text-brand-green font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-medium text-white bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 px-4 py-2 rounded-xl transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Get AI guidance
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubjectProgressPage() {
  const params = useParams();
  const subject = decodeURIComponent(params.subject as string);
  const { activeChild } = useActiveChild();
  const [data, setData] = useState<SubjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showAllObjectives, setShowAllObjectives] = useState(false);

  useEffect(() => {
    if (!activeChild?.id) return;
    setLoading(true);
    setAnimate(false);
    fetch(`/api/progress/${encodeURIComponent(subject)}?childId=${activeChild.id}`)
      .then((r) => r.json())
      .then((json: SubjectData) => {
        setData(json);
        requestAnimationFrame(() => setTimeout(() => setAnimate(true), 50));
      })
      .finally(() => setLoading(false));
  }, [activeChild?.id, subject]);

  if (!activeChild || loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const { progress, abilityLevel, lessons, objectives, externalActivities } = data;
  const pct =
    progress.topicsTotal > 0
      ? Math.round((progress.topicsCompleted / progress.topicsTotal) * 100)
      : 0;
  const abilityStyle =
    ABILITY_STYLES[abilityLevel] ?? "bg-muted text-muted-foreground";
  const color = subjectColor(subject);

  const visibleObjectives = showAllObjectives ? objectives : objectives.slice(0, 8);
  const metCount = objectives.filter((o) => o.completed).length;

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/progress"
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <h1 className="font-display text-xl font-bold text-brand-green-deep">
          {subject}
        </h1>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            abilityStyle
          )}
        >
          {abilityLevel.charAt(0) + abilityLevel.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Overview card */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-5">
        <div className="flex items-center gap-5">
          <CircularProgress percent={animate ? pct : 0} size={100} strokeWidth={9} color={color}>
            <span
              className="font-display font-bold text-xl leading-none"
              style={{ color }}
            >
              {pct}%
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">done</span>
          </CircularProgress>

          <div className="flex-1 space-y-3">
            {[
              {
                icon: <BookCheck className="w-3.5 h-3.5" />,
                value: `${progress.topicsCompleted}/${progress.topicsTotal}`,
                label: "topics done",
              },
              {
                icon: <Target className="w-3.5 h-3.5" />,
                value: `${progress.objectivesMet}`,
                label: "objectives met",
              },
              {
                icon: <Clock className="w-3.5 h-3.5" />,
                value: progress.totalMinutes > 0 ? formatMinutes(progress.totalMinutes) : "—",
                label: "learning time",
              },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-brand-green">{s.icon}</span>
                <span className="font-semibold text-sm text-brand-green-deep">
                  {s.value}
                </span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        {progress.topicsInProgress > 0 && (
          <p className="mt-4 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
            {progress.topicsInProgress} topic{progress.topicsInProgress > 1 ? "s" : ""} currently in progress
          </p>
        )}
      </div>

      {/* Topics list */}
      {(lessons.completed.length > 0 ||
        lessons.inProgress.length > 0 ||
        lessons.upcoming.length > 0) && (
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-brand-green-deep">Topics</h2>
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
            {lessons.completed.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/lesson/${l.id}`}
                className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-green-deep truncate">
                    {l.topic}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {l.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(l.completedAt)}
                      </span>
                    )}
                    {(l.objectivesTotal ?? 0) > 0 && (
                      <span className="text-xs text-brand-green font-medium">
                        ✓ {l.objectivesDone}/{l.objectivesTotal}
                      </span>
                    )}
                    {(l.durationMins ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {l.durationMins}m
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green transition-colors shrink-0" />
              </Link>
            ))}

            {lessons.inProgress.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/lesson/${l.id}`}
                className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <span className="w-4 h-4 rounded-full bg-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-green-deep truncate">
                    {l.topic}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">In progress</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green transition-colors shrink-0" />
              </Link>
            ))}

            {lessons.upcoming.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/lesson/${l.id}`}
                className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors opacity-60 hover:opacity-100 transition-opacity"
              >
                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="flex-1 text-sm text-muted-foreground truncate">
                  {l.topic}
                </p>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Objectives */}
      {objectives.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-brand-green-deep">
              Learning objectives
            </h2>
            <span className="text-xs text-muted-foreground">
              {metCount}/{objectives.length} met
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
            {visibleObjectives.map((obj) => (
              <div key={obj.id} className="flex items-start gap-3 px-4 py-3">
                {obj.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm",
                      obj.completed
                        ? "text-brand-green-deep"
                        : "text-muted-foreground"
                    )}
                  >
                    {obj.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {obj.lessonTopic}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {objectives.length > 8 && (
            <button
              onClick={() => setShowAllObjectives((v) => !v)}
              className="text-sm text-brand-green font-medium hover:underline"
            >
              {showAllObjectives
                ? "Show fewer"
                : `Show all ${objectives.length} objectives`}
            </button>
          )}
        </div>
      )}

      {/* External activities */}
      {externalActivities.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-brand-green-deep">
            External activities
          </h2>
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
            {externalActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-green-deep">
                    {a.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(a.activityDate)}
                    </span>
                    {a.durationMins > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {a.durationMins}m
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI parent note */}
      <ParentNote subject={subject} childId={activeChild.id} />

      <div className="h-4" />
    </div>
  );
}
