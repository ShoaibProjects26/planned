"use client";

import { useEffect, useState, useCallback } from "react";
import { useActiveChild } from "@/contexts/active-child";
import { LessonCard } from "@/components/dashboard/lesson-card";
import { LessonListSkeleton } from "@/components/dashboard/lesson-card-skeleton";
import { BloomBar } from "@/components/dashboard/bloom-bar";
import { StatsRow } from "@/components/dashboard/stats-row";
import { GenerateLessons } from "@/components/dashboard/generate-lessons";
import { BookOpen, Loader2, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DashboardData {
  child: {
    id: string;
    name: string;
    age: number | null;
    yearGroup: string | null;
    bloomStars: number;
  };
  familyProfile: {
    curriculum: string;
    faith: string;
    faithIntegration: boolean;
    location: string | null;
  } | null;
  todaysLessons: {
    id: string;
    subject: string;
    topic: string;
    status: string;
    durationMins: number;
    startedAt: string | null;
    completedAt: string | null;
    parsedContent: { title?: string; description?: string; objectives?: string[] };
  }[];
  stats: {
    lessonsDoneToday: number;
    totalLessonsToday: number;
    curriculumPercent: number;
    bloomStars: number;
  };
  nextReward: { id: string; name: string; starsRequired: number } | null;
  hasAnyLessons: boolean;
  subjectProgress: Record<string, { done: number; total: number }>;
}

const CURRICULUM_LABELS: Record<string, string> = {
  BNC: "British National Curriculum",
  MONTESSORI: "Montessori",
  UNSCHOOLING: "Child-led",
};

const FAITH_LABELS: Record<string, string> = {
  ISLAM: "Islam",
  CHRISTIANITY: "Christianity",
  JUDAISM: "Judaism",
  SECULAR: "",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isWeekend() {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}

export default function DashboardPage() {
  const { activeChild, allChildren } = useActiveChild();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (childId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?childId=${childId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeChild?.id) {
      fetchData(activeChild.id);
    }
  }, [activeChild?.id, fetchData]);

  const handleLessonStatusChange = useCallback(
    (id: string, newStatus: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          todaysLessons: prev.todaysLessons.map((l) =>
            l.id === id ? { ...l, status: newStatus } : l
          ),
          stats: {
            ...prev.stats,
            lessonsDoneToday:
              newStatus === "COMPLETED"
                ? prev.stats.lessonsDoneToday + 1
                : prev.stats.lessonsDoneToday,
          },
        };
      });
    },
    []
  );

  // No children at all
  if (allChildren.length === 0) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="w-16 h-16 rounded-2xl planned-gradient flex items-center justify-center mb-6 shadow-md">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-brand-green-deep mb-3">
          Welcome to Planned!
        </h1>
        <p className="text-muted-foreground mb-8">
          Let&apos;s add your first child to start generating personalised
          lessons.
        </p>
        <Link href="/onboarding/child">
          <Button className="bg-brand-green hover:bg-brand-green-deep gap-2">
            <Plus className="w-4 h-4" />
            Add your first child
          </Button>
        </Link>
      </div>
    );
  }

  // Waiting for child to be resolved from localStorage
  if (!activeChild) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-6 h-6 text-brand-green animate-spin" />
      </div>
    );
  }

  // Loading dashboard data — show skeleton
  if (loading || !data) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
        {/* Top bar skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="animate-pulse h-5 w-40 bg-muted rounded-md" />
            <div className="animate-pulse h-3.5 w-56 bg-muted rounded-md" />
          </div>
          <div className="animate-pulse h-7 w-20 bg-muted rounded-xl shrink-0" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-2xl" />
          ))}
        </div>
        {/* Cards skeleton */}
        <LessonListSkeleton count={4} />
      </div>
    );
  }

  // No lessons yet — trigger generation
  if (!data.hasAnyLessons) {
    return (
      <div className="px-6 py-8 max-w-xl mx-auto">
        <GenerateLessons
          childId={activeChild.id}
          childName={activeChild.name}
          faith={data.familyProfile?.faith}
          faithIntegration={data.familyProfile?.faithIntegration}
          location={data.familyProfile?.location ?? undefined}
          onGenerated={() => fetchData(activeChild.id)}
        />
      </div>
    );
  }

  const child = data.child;
  const fp = data.familyProfile;
  const curriculum = CURRICULUM_LABELS[fp?.curriculum ?? "BNC"] ?? fp?.curriculum ?? "BNC";
  const faithLabel =
    fp?.faithIntegration && fp?.faith !== "SECULAR"
      ? (FAITH_LABELS[fp.faith] ?? "")
      : "";

  const metaParts = [
    child.yearGroup,
    curriculum,
    faithLabel,
  ].filter(Boolean);

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-brand-green-deep leading-tight">
            {greeting()}, {child.name}&apos;s day
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.stats.totalLessonsToday} lesson
            {data.stats.totalLessonsToday !== 1 ? "s" : ""} today
            {metaParts.length > 0 && (
              <> · {metaParts.join(" · ")}</>
            )}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[hsl(var(--border))] rounded-xl px-3 py-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-brand-green" />
          <span className="text-xs font-medium text-brand-green-deep">
            {todayLabel()}
          </span>
        </div>
      </div>

      {/* Stats */}
      <StatsRow
        lessonsDoneToday={data.stats.lessonsDoneToday}
        totalLessonsToday={data.stats.totalLessonsToday}
        curriculumPercent={data.stats.curriculumPercent}
        bloomStars={data.stats.bloomStars}
      />

      {/* Today's lessons */}
      <div>
        <h2 className="font-display font-semibold text-brand-green-deep mb-3">
          Today&apos;s lessons
        </h2>

        {isWeekend() && data.todaysLessons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-8 text-center">
            <p className="text-2xl mb-2">🌿</p>
            <p className="font-semibold text-brand-green-deep">
              Enjoy your weekend!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Lessons resume on Monday.
            </p>
          </div>
        ) : data.todaysLessons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-8 text-center">
            <p className="text-2xl mb-2">📚</p>
            <p className="font-semibold text-brand-green-deep">
              No lessons scheduled for today
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Check the planner to see the week ahead.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.todaysLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                subjectProgress={data.subjectProgress[lesson.subject]}
                onStatusChange={handleLessonStatusChange}
                childId={activeChild.id}
                childName={child.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bloom reward bar */}
      <BloomBar
        childName={child.name}
        bloomStars={data.stats.bloomStars}
        nextReward={data.nextReward}
      />
    </div>
  );
}
