"use client";

import { useEffect, useState } from "react";

interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  percent,
  size = 128,
  strokeWidth = 10,
  color = "#1D9E75",
  trackColor = "hsl(160 20% 88%)",
  children,
}: CircularProgressProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedPercent = mounted ? Math.min(Math.max(percent, 0), 100) : 0;
  const offset = circumference - (animatedPercent / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
