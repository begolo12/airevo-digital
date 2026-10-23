import "server-only";

/**
 * Penyimpanan hitungan pembatas laju yang bertahan setelah restart.
 *
 * ## Masalah yang diselesaikan
 *
 * `rate-limit.ts` menyimpan hitungan di memori proses. Dua akibatnya:
 *
 * - **Hilang saat restart** — penyerang hanya perlu menunggu instance didaur
 *   ulang, lalu mendapat kuota penuh lagi.
 * - **Tidak dibagi antar instance** — dengan N instance, batas efektif menjadi
 *   N kali lipat.
 *
 * ## Kenapa tidak sekadar mengganti `Map` dengan Postgres
 *
 * Seluruh API pembatas laju bersifat **sinkron** (`checkRateLimit`,
 * `recordFailure`, `resetRateLimit`). Membuatnya async berarti mengubah 11
 * pemanggil di `actions.ts` — perubahan besar yang menyentuh alur login dan
 * PIN, dua jalur yang paling tidak boleh salah.
 *
 * Pendekatan di sini: memori tetap menjadi sumber kebenaran saat permintaan
 * berjalan (cepat, sinkron), lalu keadaannya **disalin ke Postgres** secara
 * berkala. Saat server mulai, keadaan dimuat kembali.
 *
 * ## Batasan yang tetap ada
 *
 * Penulisan berjalan di latar belakang, jadi ada jeda singkat antara
 * `recordFailure()` dan tersimpannya hitungan. Untuk pembatas laju, jeda
 * beberapa ratus milidetik tidak mengubah apa pun: penyerang tetap harus
 * menunggu jendela waktu, bukan milidetik.
 */

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db";
import { appState } from "@/lib/db/records";

/** Kunci baris di `app_state`. */
const STATE_KEY = "rateLimits";

/** Bentuk yang disimpan: kunci → daftar waktu percobaan + waktu blokir. */
type Snapshot = Record<string, { hits: number[]; blockedUntil: number }>;

/**
 * Jeda minimum antar penulisan, agar tidak menulis di setiap percobaan.
 *
 * Dapat diubah dari test; di produksi nilainya tetap.
 */
let writeIntervalMs = 2_000;

/** Untuk test: mempercepat penulisan agar tidak perlu menunggu. */
export function setWriteIntervalForTests(ms: number): void {
  writeIntervalMs = ms;
}

let lastWrite = 0;
let writing: Promise<void> | null = null;
let pending: Snapshot | null = null;

async function flush(): Promise<void> {
  try {
    while (pending) {
      const current = pending;
      pending = null;

      await db!
        .insert(appState)
        .values({ key: STATE_KEY, value: current, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appState.key,
          set: { value: current, updatedAt: new Date() },
        });

      lastWrite = Date.now();
    }
  } catch (error) {
    console.error(
      "[rate-limit] gagal menyimpan hitungan:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    writing = null;
  }
}

/**
 * Menyalin keadaan ke Postgres.
 *
 * Bila dipanggil saat penulisan sebelumnya masih berjalan, keadaan terbaru
 * disimpan di `pending` dan ditulis setelahnya — tidak ada penulisan yang
 * hilang, dan tidak ada penulisan bersamaan ke baris yang sama.
 *
 * ## Kenapa dibungkus `after()`
 *
 * Di Vercel, eksekusi fungsi dihentikan begitu respons terkirim. Penulisan
 * yang dijalankan "di latar belakang" tanpa penjaga akan terputus di tengah
 * query dan gagal terus-menerus. `after()` meminta platform menahan fungsi
 * sampai callback selesai.
 */
export async function persistRateLimits(snapshot: Snapshot): Promise<void> {
  if (!db) return;

  pending = snapshot;

  const now = Date.now();
  if (writing) return;
  if (now - lastWrite < writeIntervalMs) return;

  writing = flush();

  try {
    after(() => writing ?? Promise.resolve());
  } catch {
    // Dipanggil di luar siklus permintaan (mis. test atau skrip): tidak apa-apa,
    // pemanggil tetap menunggu promise yang sama di bawah.
  }

  await writing;
}

/**
 * Memuat keadaan dari Postgres saat server mulai.
 *
 * Mengembalikan `null` bila belum pernah ada — pemanggil memakai keadaan kosong.
 * Hitungan yang jendelanya sudah lewat dibuang, supaya server yang lama mati
 * tidak membawa blokir kedaluwarsa.
 */
export async function loadRateLimits(): Promise<Snapshot | null> {
  if (!db) return null;

  try {
    const rows = await db
      .select()
      .from(appState)
      .where(eq(appState.key, STATE_KEY))
      .limit(1);

    const value = rows[0]?.value;
    if (!value || typeof value !== "object") return null;

    const now = Date.now();
    const result: Snapshot = {};

    for (const [key, bucket] of Object.entries(value as Snapshot)) {
      if (!bucket || !Array.isArray(bucket.hits)) continue;

      // Buang hitungan yang sudah lewat jendela terpanjang (1 jam).
      const fresh = bucket.hits.filter((time) => now - time < 60 * 60 * 1000);
      const stillBlocked = bucket.blockedUntil > now;

      if (fresh.length === 0 && !stillBlocked) continue;

      result[key] = {
        hits: fresh,
        blockedUntil: stillBlocked ? bucket.blockedUntil : 0,
      };
    }

    return result;
  } catch (error) {
    console.error(
      "[rate-limit] gagal memuat hitungan:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
