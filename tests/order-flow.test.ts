import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/data/store";
import {
  cancelOrderByCode,
  hasLicense,
  newLicenseKey,
  newOrderCode,
  orderByCode,
  randomCode,
  revokeLicenseById,
  settleOrder,
} from "@/lib/data/orders";
import type { Order } from "@/lib/data/types";

beforeEach(() => {
  resetStore();
});

function pendingOrder(overrides: Partial<Order> = {}): Order {
  const order: Order = {
    id: "ord-test-1",
    code: "ARV-TEST1",
    productId: "keluarga",
    productName: "Keluarga",
    buyerName: "Uji Coba",
    email: "uji@contoh.id",
    amount: 49_000,
    status: "pending",
    provider: "manual",
    method: "bank_transfer",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  };
  getStore().orders.push(order);
  return order;
}

describe("kode pesanan dan lisensi", () => {
  it("kode pesanan berformat ARV- diikuti 5 karakter", () => {
    const code = newOrderCode();
    expect(code).toMatch(/^ARV-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
  });

  it("kode tidak memakai karakter yang mudah tertukar", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = randomCode(12);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("kunci lisensi memakai awalan produk", () => {
    expect(newLicenseKey("keluarga")).toMatch(/^KELU-/);
  });

  it("kode acak berbeda antar pemanggilan", () => {
    const codes = new Set(Array.from({ length: 100 }, () => newOrderCode()));
    expect(codes.size).toBe(100);
  });
});

describe("menandai pesanan lunas", () => {
  it("mengubah status dan mengisi tanggal bayar", () => {
    const order = pendingOrder();
    const result = settleOrder(order);

    expect(result.alreadyPaid).toBe(false);
    expect(order.status).toBe("paid");
    expect(order.paidAt).toBeTruthy();
  });

  it("menerbitkan lisensi aktif untuk email pembeli", () => {
    const order = pendingOrder();
    const result = settleOrder(order);

    expect(result.license).toBeDefined();
    expect(result.license?.email).toBe("uji@contoh.id");
    expect(result.license?.status).toBe("active");
    expect(hasLicense("uji@contoh.id", "keluarga")).toBe(true);
  });

  it("tidak menerbitkan lisensi ganda bila dipanggil dua kali", () => {
    const order = pendingOrder();
    settleOrder(order);
    const before = getStore().licenses.length;

    const second = settleOrder(order);
    expect(second.alreadyPaid).toBe(true);
    expect(getStore().licenses.length).toBe(before);
  });

  it("webhook ganda tetap menghasilkan satu lisensi", () => {
    const order = pendingOrder();
    settleOrder(order);
    settleOrder(order);
    settleOrder(order);

    const count = getStore().licenses.filter(
      (license) => license.orderId === order.id,
    ).length;
    expect(count).toBe(1);
  });

  it("lisensi baru bisa dipakai membuka aplikasi", () => {
    const order = pendingOrder({ email: "pembeli@contoh.id" });
    expect(hasLicense("pembeli@contoh.id", "keluarga")).toBe(false);
    settleOrder(order);
    expect(hasLicense("pembeli@contoh.id", "keluarga")).toBe(true);
  });
});

describe("mencabut lisensi", () => {
  it("menghilangkan akses", () => {
    const order = pendingOrder();
    const license = settleOrder(order).license!;
    expect(hasLicense("uji@contoh.id", "keluarga")).toBe(true);

    expect(revokeLicenseById(license.id)).toBe(true);
    expect(hasLicense("uji@contoh.id", "keluarga")).toBe(false);
  });

  it("mengembalikan false bila sudah dicabut", () => {
    const order = pendingOrder();
    const license = settleOrder(order).license!;
    revokeLicenseById(license.id);
    expect(revokeLicenseById(license.id)).toBe(false);
  });

  it("mengembalikan false untuk id yang tidak ada", () => {
    expect(revokeLicenseById("tidak-ada")).toBe(false);
  });
});

describe("membatalkan pesanan", () => {
  it("pesanan pending bisa dibatalkan", () => {
    const order = pendingOrder();
    const cancelled = cancelOrderByCode(order.code);
    expect(cancelled?.status).toBe("cancelled");
  });

  it("pesanan lunas tidak bisa dibatalkan", () => {
    const order = pendingOrder();
    settleOrder(order);
    expect(cancelOrderByCode(order.code)).toBeUndefined();
    expect(order.status).toBe("paid");
  });

  it("kode tidak ditemukan mengembalikan undefined", () => {
    expect(cancelOrderByCode("ARV-NONE1")).toBeUndefined();
  });
});

describe("pesanan tersimpan", () => {
  it("bisa dicari kembali setelah dibuat", () => {
    const order = pendingOrder();
    expect(orderByCode(order.code)?.id).toBe(order.id);
  });
});
