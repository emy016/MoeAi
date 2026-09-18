"use client";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The lecture-completion ring, ported from the mobile app.
 *
 * Same geometry: radius is (size − stroke) / 2 so the stroke sits inside the
 * box, the dash array is the full circumference and the offset animates down
 * to zero, rotated −90° so it fills from the top with a round cap.
 *
 * It grows from empty when it first comes into view rather than on mount, so
 * opening the dashboard is the moment the progress draws itself — which is
 * also why it uses an observer instead of an `active` prop: on the web, "is
 * this on screen" is something the browser will tell you.
 */
export function ProgressRing({
  completed, total, size = 168, strokeWidth = 10, label,
}: {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const value = total ? Math.max(0, Math.min(1, completed / total)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [shown, setShown] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const gradient = `ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        // A frame's delay, so the transition has a zero to start from.
        requestAnimationFrame(() => setShown(value));
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className="mx-ring" ref={host} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1={size} x2={size} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--mx-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--mx-accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--mx-border)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={`url(#${gradient})`} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - shown)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.72s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="mx-ring-copy">
        <strong>{Math.round(value * 100)}%</strong>
        <span>{label ?? `${completed} of ${total} lectures`}</span>
      </div>
    </div>
  );
}

/**
 * The course-card bar. Same idea as the ring, one dimension fewer.
 *
 * No visibility observer here, deliberately. A 5px-tall bar inside a scrolling
 * panel is a bad thing to gate rendering on — the first version did, and every
 * partially-complete lecture drew at zero width while the finished ones drew
 * full, which is worse than having no animation at all. The width is set one
 * frame after mount so the CSS transition has a zero to travel from, and the
 * bar is correct from that frame onward whatever the browser thinks is on
 * screen.
 */
export function ProgressBar({ progress }: { progress: number }) {
  const value = Math.max(0, Math.min(1, progress));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className="mx-progress-track" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="mx-progress-fill" style={{ width: `${shown * 100}%` }} />
    </div>
  );
}
