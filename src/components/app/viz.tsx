"use client";

import { useId } from "react";

/**
 * Garis tren kecil di samping nominal.
 *
 * Menjelaskan *tren*, bukan hanya angka sesaat. Pada daftar kategori, "Rp640.000"
 * tidak memberi tahu apakah pengeluaran naik atau turun — garis 30 hari
 * memberi tahu dalam sekejap.
 *
 * Sengaja tanpa sumbu, label, dan legenda: fungsinya bentuk, bukan pembacaan
 * nilai presisi. Nilai presisi ada di teks di sebelahnya.
 */
export function Sparkline({
  values,
  tone = "neutral",
  width = 64,
  height = 20,
  className,
}: {
  values: number[];
  /** `negative` untuk pengeluaran, `positive` untuk pemasukan. */
  tone?: "neutral" | "positive" | "negative";
  width?: number;
  height?: number;
  className?: string;
}) {
  const gradientId = useId();

  if (values.length < 2) {
    return <span className={`inline-block ${className ?? ""}`} style={{ width, height }} />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const stepX = width / (values.length - 1);
  const points = values.map((value, index) => {
    // Skala 2px di atas dan bawah supaya garis tidak menempel tepi.
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return { x: index * stepX, y };
  });

  const line = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  const color =
    tone === "positive"
      ? "var(--color-positive)"
      : tone === "negative"
        ? "var(--color-tomato)"
        : "var(--color-muted)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Cincin progres yang mengisi saat muncul.
 *
 * Dipakai pada tujuan tabungan. Mengisi dari 0 membuat "seberapa jauh" terasa
 * sebagai gerak, bukan angka statis.
 */
export function ProgressRing({
  percent,
  size = 48,
  stroke = 4,
  tone = "positive",
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  tone?: "positive" | "warning" | "danger";
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    tone === "warning"
      ? "var(--color-warning)"
      : tone === "danger"
        ? "var(--color-tomato)"
        : "var(--color-positive)";

  return (
    <span
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(clamped)} persen`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            // Variabel dipakai oleh keyframe `ring-fill` di globals.css.
            ["--ring-circumference" as string]: `${circumference}`,
          }}
          className="animate-ring"
        />
      </svg>
      {children ? (
        <span className="absolute inset-0 grid place-items-center text-2xs font-bold tnum">
          {children}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Konfeti sekali pakai saat tujuan tercapai.
 *
 * Warna meja dapur (butter, mint, tomat, langit), bukan warna pesta. Hanya
 * dipakai sekali per tujuan — memicu berulang akan menghilangkan maknanya.
 */
export function Confetti({ count = 14 }: { count?: number }) {
  const colors = [
    "var(--color-butter-deep)",
    "var(--color-mint-deep)",
    "var(--color-tomato)",
    "var(--color-sky-deep)",
    "var(--color-plum)",
  ];

  return (
    <span
      className="pointer-events-none absolute inset-x-0 top-0 mx-auto block h-0"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => {
        const spread = (index / (count - 1) - 0.5) * 96;
        return (
          <span
            key={index}
            className="animate-confetti absolute left-1/2 top-0 block h-1.5 w-1.5 rounded-[1px]"
            style={{
              backgroundColor: colors[index % colors.length],
              ["--confetti-x" as string]: `${spread}px`,
              animationDelay: `${index * 28}ms`,
            }}
          />
        );
      })}
    </span>
  );
}
