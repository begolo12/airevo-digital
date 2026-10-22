"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Apakah pengguna meminta animasi dikurangi.
 *
 * Dibaca lewat `useSyncExternalStore` supaya tidak perlu `setState` di dalam
 * efek (yang dilarang aturan lint proyek ini) dan tidak ada kedipan saat
 * hidrasi.
 */
function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";

  const subscribe = (listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  };

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Angka yang bergulir saat nilainya berubah.
 *
 * Menjelaskan "nilai ini baru berubah, dan seberapa" — tanpa perlu toast.
 * Bukan hiasan: pada aplikasi keuangan, perubahan angka adalah kejadian yang
 * perlu disadari.
 *
 * Menghormati `prefers-reduced-motion`: bila pengguna memintanya, angka
 * langsung tampil tanpa animasi (tidak lewat state sama sekali).
 */
export function AnimatedNumber({
  value,
  format,
  duration = 420,
  className,
}: {
  /** Nilai akhir yang ditampilkan. */
  value: number;
  /** Pemformat angka → teks, mis. `formatIDR`. */
  format: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    // Saat animasi dikurangi, nilai akhir dipakai langsung di render.
    if (reduce) return;

    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Kurva keluar: cepat di awal, melambat di akhir.
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  // Nilai yang ditampilkan: animasi, atau langsung saat mode diam.
  const shown = reduce ? value : display;

  return (
    <span className={className} aria-label={format(value)}>
      {format(shown)}
    </span>
  );
}
