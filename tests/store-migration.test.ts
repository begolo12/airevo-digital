import { beforeEach, describe, expect, it } from "vitest";
import { resetStore, getStore } from "@/lib/data/store";
import { hasLicense, orderByCode, salesSummary } from "@/lib/data/orders";

beforeEach(() => {
  resetStore();
});

/**
 * Berkas `.data/store.json` dari versi aplikasi sebelumnya belum punya
 * koleksi `orders` dan `licenses`. `getStore()` harus menambalnya, bukan gagal.
 */
describe("migrasi data lama", () => {
  it("koleksi baru selalu tersedia setelah store dimuat", () => {
    const store = getStore();
    expect(Array.isArray(store.orders)).toBe(true);
    expect(Array.isArray(store.licenses)).toBe(true);
    expect(Array.isArray(store.messages)).toBe(true);
    expect(Array.isArray(store.debts)).toBe(true);
  });

  it("query pesanan dan lisensi tidak gagal pada data contoh", () => {
    expect(() => orderByCode("ARV-DEMO1")).not.toThrow();
    expect(() => hasLicense("irvan@airevo-digital.my.id", "keluarga")).not.toThrow();
    expect(() => salesSummary()).not.toThrow();
  });

  it("data contoh menyertakan lisensi demo agar aplikasi bisa dibuka", () => {
    expect(hasLicense("irvan@airevo-digital.my.id", "keluarga")).toBe(true);
    expect(hasLicense("sari@airevo-digital.my.id", "keluarga")).toBe(true);
  });
});
