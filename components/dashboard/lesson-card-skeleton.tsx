import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

export function LessonCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Shimmer className="w-2.5 h-2.5 rounded-full" />
          <Shimmer className="h-3 w-20" />
        </div>
        <Shimmer className="h-5 w-20 rounded-full" />
      </div>

      {/* Title + description */}
      <div className="px-4 pb-3 space-y-2">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-5/6" />
      </div>

      {/* Action button */}
      <div className="px-4 pb-4">
        <Shimmer className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Renders N skeletons in the same grid layout as the lesson list */
export function LessonListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LessonCardSkeleton key={i} />
      ))}
    </div>
  );
}
