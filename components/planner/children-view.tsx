"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { Plus, Users, Star, BookOpen } from "lucide-react";
import Link from "next/link";

interface ChildrenViewProps {
  children: any[];
}

export function ChildrenView({ children }: ChildrenViewProps) {
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
            const interests: string[] = JSON.parse(child.interests ?? "[]");

            return (
              <Card key={child.id} className="border-border/50">
                <CardContent className="p-5">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
