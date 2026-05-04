"use client";

import Link from "next/link";
import { Lock, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  /** Required tier to unlock this feature */
  requiredTier: "BASIC" | "PREMIUM";
  /** Short description of what is being unlocked */
  feature: string;
  /** Optional additional context */
  description?: string;
  /** Style variant */
  variant?: "card" | "inline" | "banner";
  className?: string;
}

const TIER_META = {
  BASIC: {
    label:  "Basic",
    price:  "£7.99/month",
    icon:   <Zap className="w-4 h-4" />,
    color:  "brand-green",
    bg:     "bg-brand-mint/40",
    border: "border-brand-green/30",
    btn:    "bg-brand-green hover:bg-brand-green-deep",
    badge:  "bg-brand-mint text-brand-green-deep",
  },
  PREMIUM: {
    label:  "Premium",
    price:  "£14.99/month",
    icon:   <Sparkles className="w-4 h-4" />,
    color:  "purple-600",
    bg:     "bg-purple-50",
    border: "border-purple-200",
    btn:    "bg-purple-600 hover:bg-purple-700",
    badge:  "bg-purple-100 text-purple-700",
  },
} as const;

export function UpgradePrompt({
  requiredTier,
  feature,
  description,
  variant = "card",
  className,
}: UpgradePromptProps) {
  const meta = TIER_META[requiredTier];

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3",
          meta.bg,
          meta.border,
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-green-deep truncate">
              {feature}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <Link
          href="/pricing"
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-xl transition-colors",
            meta.btn
          )}
        >
          {meta.icon}
          Upgrade to {meta.label}
        </Link>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm",
          className
        )}
      >
        <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">{feature} — </span>
        <Link
          href="/pricing"
          className="font-semibold text-brand-green hover:underline"
        >
          Upgrade to {meta.label}
        </Link>
      </div>
    );
  }

  // Default: card variant
  return (
    <div
      className={cn(
        "rounded-2xl border px-6 py-8 text-center space-y-4",
        meta.bg,
        meta.border,
        className
      )}
    >
      {/* Lock icon */}
      <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-white border border-[hsl(var(--border))] mx-auto">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Text */}
      <div className="space-y-1">
        <p className="font-display font-bold text-brand-green-deep">
          {feature}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* Tier badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full",
          meta.badge
        )}
      >
        {meta.icon}
        {meta.label} plan · {meta.price}
      </span>

      {/* CTA */}
      <div>
        <Link
          href="/pricing"
          className={cn(
            "inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-colors",
            meta.btn
          )}
        >
          Upgrade to {meta.label}
        </Link>
        <p className="text-xs text-muted-foreground mt-2">
          Cancel any time. No lock-in.
        </p>
      </div>
    </div>
  );
}
