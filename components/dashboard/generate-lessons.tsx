"use client";

import { useEffect, useState, useRef } from "react";
import { Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateLessonsProps {
  childId: string;
  childName: string;
  /** Optional extras used to personalise the rotating messages */
  faith?: string;
  faithIntegration?: boolean;
  location?: string;
  onGenerated: () => void;
}

function buildMessages(childName: string, faith?: string, faithIntegration?: boolean, location?: string) {
  const msgs = [
    `Building ${childName}'s personalised lessons…`,
    "Weaving in the curriculum framework…",
    "Choosing age-appropriate topics…",
    "Crafting engaging activities…",
  ];

  if (faith && faith !== "SECULAR" && faithIntegration) {
    msgs.push(`Adding ${faith.charAt(0) + faith.slice(1).toLowerCase()} connections…`);
  }

  if (location) {
    msgs.push(`Finding day-out ideas near ${location}…`);
  }

  msgs.push("Almost there — just finishing up…");
  return msgs;
}

export function GenerateLessons({
  childId,
  childName,
  faith,
  faithIntegration,
  location,
  onGenerated,
}: GenerateLessonsProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messages = buildMessages(childName, faith, faithIntegration, location);

  // Auto-trigger on mount
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // Rotate messages while loading
  useEffect(() => {
    if (state === "loading") {
      setMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setMsgIndex((i) => Math.min(i + 1, messages.length - 1));
      }, 2500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function generate() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lessons/generate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Generation failed");
      }
      setState("done");
      // Small delay so user sees the success state
      setTimeout(onGenerated, 1200);
    } catch (err: unknown) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl planned-gradient flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
          {/* Animated ring */}
          <div className="absolute inset-0 rounded-2xl border-2 border-brand-green/40 animate-ping" />
        </div>

        {/* Rotating message */}
        <h2
          key={msgIndex}
          className="font-display text-xl font-bold text-brand-green-deep mb-2 transition-all duration-500"
        >
          {messages[msgIndex]}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Planned is crafting {childName}&apos;s personalised week. This takes
          about 15 seconds.
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-6">
          {messages.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === msgIndex
                  ? "w-4 h-2 bg-brand-green"
                  : i < msgIndex
                  ? "w-2 h-2 bg-brand-green/40"
                  : "w-2 h-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-mint flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-brand-green" />
        </div>
        <h2 className="font-display text-xl font-bold text-brand-green-deep mb-2">
          {childName}&apos;s week is ready!
        </h2>
        <p className="text-sm text-muted-foreground">Loading your lessons…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="font-display text-xl font-bold text-brand-green-deep mb-2">
          Couldn&apos;t generate lessons
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{errorMsg}</p>
        <Button
          onClick={generate}
          className="bg-brand-green hover:bg-brand-green-deep gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Try again
        </Button>
      </div>
    );
  }

  // idle fallback — shouldn't render as useEffect auto-triggers
  return null;
}
