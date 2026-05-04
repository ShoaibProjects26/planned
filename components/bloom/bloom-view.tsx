"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { Flower2, Star, Trophy, Gift, Plus } from "lucide-react";

interface BloomViewProps {
  children: any[];
}

export function BloomView({ children }: BloomViewProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-green-deep flex items-center gap-2">
          <Flower2 className="w-6 h-6 text-brand-green" />
          Bloom
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Celebrate every step of your children&apos;s learning journey.
        </p>
      </div>

      {children.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Flower2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-display font-semibold text-brand-green-deep mb-2">No children yet</p>
            <p className="text-sm text-muted-foreground">Add children to start tracking Bloom rewards.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {children.map((child) => (
            <Card key={child.id} className="border-border/50 overflow-hidden">
              {/* Header */}
              <div className="planned-gradient-soft p-5 border-b border-border/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-brand-green-deep font-display font-bold text-xl shadow-sm">
                    {getInitials(child.name)}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display font-bold text-lg text-brand-green-deep">{child.name}</h2>
                    <p className="text-sm text-brand-green-deep/70">{child.yearGroup ?? `Age ${child.age}`}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      <p className="font-display font-bold text-3xl text-brand-green-deep">{child.bloomStars}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Bloom stars</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Badges */}
                {child.badges?.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-sm text-brand-green-deep mb-3 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" />
                      Badges earned
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {child.badges.map((badge: any) => (
                        <Badge key={badge.id} variant="success">
                          {badge.badgeType}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Rewards */}
                {child.rewards?.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-sm text-brand-green-deep mb-3 flex items-center gap-1.5">
                      <Gift className="w-4 h-4" />
                      Rewards
                    </h3>
                    <div className="space-y-2">
                      {child.rewards.map((reward: any) => (
                        <div key={reward.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                          <div>
                            <p className="text-sm font-medium text-brand-green-deep">{reward.name}</p>
                            <p className="text-xs text-muted-foreground">{reward.starsRequired} stars required</p>
                          </div>
                          <Badge variant={reward.redeemed ? "secondary" : "success"}>
                            {reward.redeemed ? "Redeemed" : `${child.bloomStars >= reward.starsRequired ? "Unlocked" : "Locked"}`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!child.badges?.length && !child.rewards?.length && (
                  <div className="text-center py-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      No rewards set up yet — complete a lesson to earn the first star! ⭐
                    </p>
                    <Button size="sm" variant="outline" className="gap-2 border-brand-green/30 text-brand-green hover:bg-brand-mint">
                      <Plus className="w-3.5 h-3.5" />
                      Add a reward
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
