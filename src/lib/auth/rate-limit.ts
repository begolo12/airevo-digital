import "server-only";
import { loadRateLimits, persistRateLimits } from "./rate-limit-store";

/**
 * Pembatas percobaan berbasis jendela geser.
 *
 * Dipakai untuk melindungi tiga titik masuk:
 *
 * - **Login** — mencegah tebak kata sandi. Dikunci per email, karena penyerang
 *   bisa berpindah IP; mengunci per IP saja mudah dilewati.
 * - **PIN profil** — PIN hanya 4–6 angka (10.000–1.000.000 kemungkinan).
 *   Tanpa pembatasan, PIN bisa ditebak dalam hitungan menit. Dikunci per
 *   profil, karena PIN melindungi privasi antar anggota keluarga.
 * - **Form kontak** — mencegah spam.
 *
 * ## Batasan yang perlu disadari
 *
 * Penyimpanan ada di memori proses. Artinya:
 *
 * - Hitungan **hilang saat server restart** — penyerang hanya perlu menunggu.
 * - Pada beberapa instance, tiap instance menghitung sendiri, sehingga batas
 *   efektif menjadi N kali lipat.
 *
 * Untuk produksi multi-instance, ganti `store` dengan Redis/Upstash. Bentuk
 * API-nya sengaja dibuat kecil agar penggantian itu tidak menyentuh pemanggil.
 *
 * Ini bukan solusi lengkap, tetapi jauh lebih baik daripada tanpa batas sama
 * sekali: penyerang harus benar-benar menunggu jendela waktu habis.
 */

type Bucket = { hits: number[]; blockedUntil: number };

const globalLimiter = globalThis as unknown as {
  __airevoRateLimit?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  if (!globalLimiter.__airevoRateLimit) {
    globalLimiter.__airevoRateLimit = new Map();
  }
  return globalLimiter.__airevoRateLimit;
}

export type RateLimitRule = {
  /** Nama aturan, dipakai sebagai awalan kunci. */
  name: string;
  /** Jumlah percobaan yang diizinkan dalam satu jendela. */
  max: number;
  /** Panjang jendela dalam milidetik. */
  windowMs: number;
  /** Lama kunci setelah batas terlampaui. */
  blockMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Sisa percobaan sebelum terkunci. */
  remaining: number;
  /** Milidetik sampai boleh mencoba lagi (0 bila tidak terkunci). */
  retryAfterMs: number;
};

/** Bersihkan bucket lama agar peta tidak tumbuh tanpa batas. */
function sweep(now: number, longestWindow: number) {
  const map = buckets();
  if (map.size < 500) return;
  for (const [key, bucket] of map) {
    const newest = bucket.hits.at(-1) ?? 0;
    if (bucket.blockedUntil < now && now - newest > longestWindow) {
      map.delete(key);
    }
  }
}

/**
 * Periksa apakah sebuah percobaan boleh dilakukan.
 *
 * Hanya **membaca**; pemanggil memutuskan kapan mencatat kegagalan lewat
 * `recordFailure()`. Pemisahan ini penting: percobaan yang berhasil tidak boleh
 * menghabiskan kuota.
 */
export function checkRateLimit(
  rule: RateLimitRule,
  identifier: string,
): RateLimitResult {
  const now = Date.now();
  sweep(now, rule.windowMs);

  const key = `${rule.name}:${identifier}`;
  const bucket = buckets().get(key);

  if (!bucket) {
    return { allowed: true, remaining: rule.max, retryAfterMs: 0 };
  }

  if (bucket.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: bucket.blockedUntil - now,
    };
  }

  const recent = bucket.hits.filter((time) => now - time < rule.windowMs);
  const remaining = Math.max(rule.max - recent.length, 0);

  return {
    allowed: remaining > 0,
    remaining,
    retryAfterMs: remaining > 0 ? 0 : rule.windowMs,
  };
}

/**
 * Catat satu percobaan gagal.
 *
 * Mengembalikan hasil terbaru agar pemanggil bisa langsung memberi tahu
 * berapa sisa percobaan.
 */
export function recordFailure(
  rule: RateLimitRule,
  identifier: string,
): RateLimitResult {
  const now = Date.now();
  const key = `${rule.name}:${identifier}`;
  const map = buckets();
  const bucket = map.get(key) ?? { hits: [], blockedUntil: 0 };

  // Buang catatan di luar jendela.
  bucket.hits = bucket.hits.filter((time) => now - time < rule.windowMs);
  bucket.hits.push(now);

  if (bucket.hits.length >= rule.max) {
    bucket.blockedUntil = now + rule.blockMs;
    // Setelah terkunci, hitungan direset agar jendela berikutnya bersih.
    bucket.hits = [];
    map.set(key, bucket);
    schedulePersist();
    return { allowed: false, remaining: 0, retryAfterMs: rule.blockMs };
  }

  map.set(key, bucket);
  schedulePersist();

  return {
    allowed: true,
    remaining: rule.max - bucket.hits.length,
    retryAfterMs: 0,
  };
}

/** Hapus hitungan setelah percobaan berhasil. */
export function resetRateLimit(rule: RateLimitRule, identifier: string): void {
  buckets().delete(`${rule.name}:${identifier}`);
  schedulePersist();
}

/**
 * Menyalin keadaan ke Postgres di latar belakang.
 *
 * Tidak di-`await`: pemanggil bersifat sinkron dan tidak boleh menunggu
 * jaringan hanya untuk mencatat satu percobaan gagal. Kegagalan penulisan
 * dicatat di log, bukan menggagalkan login.
 */
function schedulePersist(): void {
  const snapshot: Record<string, { hits: number[]; blockedUntil: number }> = {};
  for (const [key, bucket] of buckets()) {
    snapshot[key] = { hits: [...bucket.hits], blockedUntil: bucket.blockedUntil };
  }

  void persistRateLimits(snapshot);
}

/**
 * Memulihkan hitungan dari Postgres.
 *
 * Dipanggil sekali saat server mulai, sebelum melayani permintaan. Tanpa ini,
 * restart server menghapus semua blokir dan penyerang hanya perlu menunggu.
 */
export async function restoreRateLimits(): Promise<number> {
  const saved = await loadRateLimits();
  if (!saved) return 0;

  const map = buckets();
  let restored = 0;

  for (const [key, bucket] of Object.entries(saved)) {
    map.set(key, { hits: [...bucket.hits], blockedUntil: bucket.blockedUntil });
    restored += 1;
  }

  return restored;
}

/** Ubah milidetik menjadi kalimat singkat untuk pesan kesalahan. */
export function humanizeRetry(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes <= 1) return "sekitar 1 menit";
  if (minutes < 60) return `sekitar ${minutes} menit`;
  const hours = Math.ceil(minutes / 60);
  return `sekitar ${hours} jam`;
}

/* ------------------------------- aturan tetap ------------------------------ */

/** Login: 5 percobaan per 15 menit, kunci 15 menit. */
export const LOGIN_RULE: RateLimitRule = {
  name: "login",
  max: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

/**
 * PIN: 5 percobaan per 10 menit, kunci 10 menit.
 *
 * Sengaja lebih ketat dari login: PIN hanya 4–6 angka, dan pemilik sah biasanya
 * memasukkan PIN dengan benar pada percobaan pertama.
 */
export const PIN_RULE: RateLimitRule = {
  name: "pin",
  max: 5,
  windowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
};

/** Form kontak: 5 pesan per jam. */
export const CONTACT_RULE: RateLimitRule = {
  name: "contact",
  max: 5,
  windowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
};

/** Untuk test: kosongkan seluruh hitungan. */
export function resetAllRateLimits(): void {
  buckets().clear();
  schedulePersist();
}
