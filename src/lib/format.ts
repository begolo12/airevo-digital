const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const idrCompact = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFmt = new Intl.NumberFormat("id-ID");

/** Rp1.250.000 */
export function formatIDR(value: number): string {
  // Intl menyisipkan spasi tak-putus setelah "Rp"; format desain memakai "Rp1.250.000".
  return idr.format(Math.round(value)).replace(/\u00a0/g, "");
}

/** Rp1,2 jt */
export function formatIDRCompact(value: number): string {
  return `Rp${idrCompact.format(value)}`;
}

/** 1.250.000 */
export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

/** Nominal tanpa simbol, untuk input. */
export function formatAmountInput(value: number): string {
  return numberFmt.format(Math.round(value));
}

/** Parse "1.250.000" atau "1250000" menjadi number. */
export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  return Number.parseInt(cleaned, 10);
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateShortFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

const monthFmt = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

const weekdayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long" });

/** 21 Okt 2026 */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00`));
}

/** 21 Okt */
export function formatDateShort(iso: string): string {
  return dateShortFmt.format(new Date(`${iso}T00:00:00`));
}

/** Oktober 2026 */
export function formatMonth(month: string): string {
  return monthFmt.format(new Date(`${month}-01T00:00:00`));
}

export function formatWeekday(iso: string): string {
  return weekdayFmt.format(new Date(`${iso}T00:00:00`));
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** Jumlah hari dalam bulan `YYYY-MM`. */
export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Tambah bulan, menjaga tanggal 1. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  // Pakai UTC agar tidak bergeser satu hari di zona waktu positif.
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Selisih hari dari hari ini (negatif = sudah lewat). */
export function daysFromToday(iso: string): number {
  const target = Date.parse(`${iso}T00:00:00Z`);
  const today = Date.parse(`${todayISO()}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

/** Rentang bulan terakhir, urut lama → baru. */
export function lastMonths(count: number, endMonth = currentMonth()): string[] {
  return Array.from({ length: count }, (_, i) =>
    addMonths(endMonth, -(count - 1 - i)),
  );
}

/**
 * Tanggal jatuh tempo aman untuk bulan tertentu (31 → 28/30).
 *
 * Dijepit di **kedua** ujung:
 *
 * - `31` di bulan 30 hari menjadi `30`
 * - `0` atau negatif menjadi `1`
 *
 * Tanpa penjepitan bawah, `safeDueDate("2026-01", 0)` menghasilkan
 * `"2026-01-00"` — string yang terlihat seperti tanggal tetapi tidak bisa
 * diurai `Date.parse()`. Nilai seperti ini lalu tersimpan di data dan
 * membuat perhitungan umur tagihan menghasilkan `NaN`.
 */
export function safeDueDate(month: string, day: number): string {
  const max = daysInMonth(month);
  const clamped = Math.max(1, Math.min(Math.trunc(day), max));
  return `${month}-${String(clamped).padStart(2, "0")}`;
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
