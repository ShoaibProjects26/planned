import { BookCheck, BarChart3, Star } from "lucide-react";

interface StatsRowProps {
  lessonsDoneToday: number;
  totalLessonsToday: number;
  curriculumPercent: number;
  bloomStars: number;
}

export function StatsRow({
  lessonsDoneToday,
  totalLessonsToday,
  curriculumPercent,
  bloomStars,
}: StatsRowProps) {
  const stats = [
    {
      icon: <BookCheck className="w-4 h-4" />,
      value: `${lessonsDoneToday}/${totalLessonsToday}`,
      label: "Lessons done",
      bg: "bg-brand-mint",
      text: "text-brand-green-deep",
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      value: `${curriculumPercent}%`,
      label: "Curriculum covered",
      bg: "bg-brand-amber",
      text: "text-brand-green-deep",
    },
    {
      icon: <Star className="w-4 h-4 fill-amber-400 text-amber-400" />,
      value: bloomStars,
      label: "Bloom stars",
      bg: "bg-yellow-50",
      text: "text-brand-green-deep",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-2xl border border-[hsl(var(--border))] px-4 py-3.5"
        >
          <div
            className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center ${s.text} mb-2.5`}
          >
            {s.icon}
          </div>
          <p className="font-display font-bold text-xl text-brand-green-deep leading-none">
            {s.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
