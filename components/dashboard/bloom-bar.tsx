"use client";

import { Star, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BloomBarProps {
  childName: string;
  bloomStars: number;
  nextReward: { id: string; name: string; starsRequired: number } | null;
}

export function BloomBar({ childName, bloomStars, nextReward }: BloomBarProps) {
  if (!nextReward) {
    return (
      <div className="bg-gradient-to-r from-brand-mint to-brand-amber rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green-deep">
            {bloomStars} Bloom stars earned
          </p>
          <p className="text-xs text-brand-green-deep/60">
            No rewards set yet — add one in the Bloom tab!
          </p>
        </div>
      </div>
    );
  }

  const starsNeeded = Math.max(nextReward.starsRequired - bloomStars, 0);
  const pct = Math.min(
    Math.round((bloomStars / nextReward.starsRequired) * 100),
    100
  );

  return (
    <div className="bg-gradient-to-r from-brand-mint to-brand-amber rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-brand-green" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-green-deep">
            {starsNeeded === 0
              ? `🎉 ${childName} can unlock: ${nextReward.name}!`
              : `${childName} needs ${starsNeeded} more star${starsNeeded === 1 ? "" : "s"} to unlock:`}
          </p>
          {starsNeeded > 0 && (
            <p className="text-xs font-medium text-brand-green-deep/70 truncate">
              {nextReward.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-sm font-bold text-brand-green-deep">
            {bloomStars}
          </span>
          <span className="text-xs text-brand-green-deep/50">
            / {nextReward.starsRequired}
          </span>
        </div>
      </div>
      <Progress
        value={pct}
        className="h-2 bg-white/50"
      />
    </div>
  );
}
