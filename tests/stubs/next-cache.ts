/**
 * Stub `next/cache` untuk unit test.
 *
 * `revalidatePath`/`revalidateTag` hanya berfungsi di dalam siklus request
 * Next.js. Saat server action dipanggil langsung dari Vitest, fungsinya
 * melempar `Invariant: static generation store missing`. Di test, invalidasi
 * cache tidak relevan — yang diuji adalah perubahan datanya.
 */

export function revalidatePath(): void {}
export function revalidateTag(): void {}
export function unstable_cache<T>(fn: T): T {
  return fn;
}
export function unstable_noStore(): void {}
export function cacheTag(): void {}
export function cacheLife(): void {}
