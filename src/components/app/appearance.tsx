"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { cx } from "@/components/ui";

/**
 * Preferensi tampilan: tema dan kepadatan.
 *
 * ## Kenapa disimpan di `localStorage` dan dibaca lewat `useSyncExternalStore`
 *
 * Nilai ini hidup di luar React (DOM + localStorage). `useSyncExternalStore`
 * adalah cara resmi membaca sumber eksternal tanpa memicu peringatan
 * `setState` di dalam efek, dan tanpa kedipan saat hidrasi karena ada
 * `getServerSnapshot`.
 *
 * ## Kenapa tema diterapkan sebelum React jalan
 *
 * Skrip kecil di `ThemeScript` menempelkan kelas `dark` ke `<html>` sebelum
 * paint pertama. Tanpa itu, pengguna mode gelap melihat kilatan putih setiap
 * memuat halaman.
 */

export type ThemeMode = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";

const THEME_KEY = "airevo:theme";
const DENSITY_KEY = "airevo:density";

/* ---------------------------------- store --------------------------------- */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Perubahan dari tab lain ikut tersinkron.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === DENSITY_KEY) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function readDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  return window.localStorage.getItem(DENSITY_KEY) === "compact"
    ? "compact"
    : "comfortable";
}

function serverTheme(): ThemeMode {
  return "system";
}

function serverDensity(): Density {
  return "comfortable";
}

/** Apakah sistem sedang memakai mode gelap. */
function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

function applyDensity(density: Density) {
  document.documentElement.setAttribute("data-density", density);
}

/* ------------------------------- komponen -------------------------------- */

/**
 * Skrip yang berjalan sebelum paint.
 *
 * Diletakkan di `<head>` supaya tema sudah benar saat halaman pertama kali
 * dilukis. Isinya sengaja sekecil mungkin dan tidak bergantung pada React.
 */
export function ThemeScript() {
  const script = `
(function(){
  try {
    var t = localStorage.getItem("${THEME_KEY}") || "system";
    var d = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (d) document.documentElement.classList.add("dark");
    var n = localStorage.getItem("${DENSITY_KEY}") || "comfortable";
    document.documentElement.setAttribute("data-density", n === "compact" ? "compact" : "comfortable");
  } catch (e) {}
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  const density = useSyncExternalStore(subscribe, readDensity, serverDensity);

  const setTheme = useCallback((next: ThemeMode) => {
    window.localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    emit();
  }, []);

  const setDensity = useCallback((next: Density) => {
    window.localStorage.setItem(DENSITY_KEY, next);
    applyDensity(next);
    emit();
  }, []);

  // Ikuti perubahan preferensi sistem selama mode "system".
  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  return { theme, density, setTheme, setDensity };
}

/* --------------------------------- kontrol -------------------------------- */

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; hint: string }> = [
  { value: "light", label: "Terang", hint: "Meja dapur pagi" },
  { value: "dark", label: "Gelap", hint: "Malam di dapur" },
  { value: "system", label: "Ikut sistem", hint: "Menyesuaikan perangkat" },
];

const DENSITY_OPTIONS: Array<{ value: Density; label: string; hint: string }> = [
  { value: "comfortable", label: "Nyaman", hint: "Baris lega" },
  { value: "compact", label: "Padat", hint: "Lebih banyak baris" },
];

/**
 * Pemilih tampilan untuk halaman Pengaturan.
 *
 * Perubahan langsung terlihat — tidak perlu simpan — karena tema adalah
 * preferensi tampilan, bukan data yang perlu dikonfirmasi.
 */
export function AppearanceSettings() {
  const { theme, density, setTheme, setDensity } = useTheme();

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-base font-semibold text-ink-soft">Tema</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={active}
                className={cx(
                  "flex flex-col items-start gap-0.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-ink bg-card shadow-[0_1px_2px_rgba(35,32,29,0.08)]"
                    : "border-line-strong bg-paper-deep/40 hover:bg-paper-deep",
                )}
              >
                <span className="text-base font-bold">{option.label}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-base font-semibold text-ink-soft">Kepadatan</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DENSITY_OPTIONS.map((option) => {
            const active = density === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setDensity(option.value)}
                aria-pressed={active}
                className={cx(
                  "flex flex-col items-start gap-0.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-ink bg-card shadow-[0_1px_2px_rgba(35,32,29,0.08)]"
                    : "border-line-strong bg-paper-deep/40 hover:bg-paper-deep",
                )}
              >
                <span className="text-base font-bold">{option.label}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
