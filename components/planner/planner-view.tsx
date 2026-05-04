"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, Sparkles, BookOpen, Clock } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface PlannerViewProps {
  children: any[];
}

export function PlannerView({ children }: PlannerViewProps) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children[0]?.id ?? null
  );

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const lessons = selectedChild?.lessons ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">Planner</h1>
          <p className="text-muted-foreground text-sm mt-1">Plan and manage lessons for each child.</p>
        </div>
        <Button className="bg-brand-green hover:bg-brand-green-deep gap-2">
          <Plus className="w-4 h-4" />
          New lesson
        </Button>
      </div>

      {children.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-display font-semibold text-brand-green-deep mb-2">No children added yet</p>
            <p className="text-sm text-muted-foreground">Add a child first to start planning lessons.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Child picker */}
          <div className="space-y-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`w-full text-left rounded-xl p-3 border transition-colors ${
                  selectedChildId === child.id
                    ? "bg-brand-mint border-brand-green/30"
                    : "bg-white border-border/50 hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-mint flex items-center justify-center text-brand-green-deep text-xs font-bold">
                    {getInitials(child.name)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-brand-green-deep">{child.name}</p>
                    <p className="text-xs text-muted-foreground">{child.yearGroup ?? `Age ${child.age}`}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{child.lessons.length} lesson{child.lessons.length !== 1 ? "s" : ""}</p>
              </button>
            ))}
          </div>

          {/* Lessons */}
          <div className="md:col-span-2 space-y-3">
            {selectedChild && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-brand-green-deep">
                    {selectedChild.name}&apos;s lessons
                  </h2>
                  <Button size="sm" variant="outline" className="gap-2 border-brand-green/30 text-brand-green hover:bg-brand-mint">
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                  </Button>
                </div>

                {lessons.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="py-10 text-center">
                      <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No lessons yet. Generate one with AI or add manually.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {lessons.map((lesson: any) => (
                      <Card key={lesson.id} className="border-border/50">
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-green mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm text-brand-green-deep truncate">{lesson.title ?? lesson.topic}</p>
                              <Badge
                                variant={lesson.status === "COMPLETED" ? "success" : "secondary"}
                                className="text-xs shrink-0"
                              >
                                {lesson.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{lesson.subject}</p>
                            {lesson.durationMins && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {lesson.durationMins} min
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
