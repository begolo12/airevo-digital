import { beforeEach, describe, expect, it } from "vitest";
import { visibleApps, sellableApps, getApp, getVisibleApp, getSellableApp } from "@/config/apps";
import { getStore, resetStore } from "@/lib/data/store";
import {
  buyerCount,
  hasLicense,
  licenseFor,
  licensesFor,
  orderByCode,
  salesSummary,
} from "@/lib/data/orders";
import { getPaymentProvider, listPaymentProviders } from "@/lib/payments";

beforeEach(() => {
  resetStore();
});

describe("katalog produk", () => {
  it("hanya menampilkan produk yang berstatus visible", () => {
    expect(visibleApps.length).toBeGreaterThan(0);
    expect(visibleApps.every((app) => app.visible)).toBe(true);
  });

  it("menyembunyikan Ops dan Keuangan dari katalog", () => {
    const ids = visibleApps.map((app) => app.id);
    expect(ids).toContain("keluarga");
    expect(ids).not.toContain("ops");
    expect(ids).not.toContain("keuangan");
  });

  it("produk tersembunyi tetap ada di data", () => {
    expect(getApp("ops")).toBeDefined();
    expect(getVisibleApp("ops")).toBeUndefined();
  });

  it("semua produk yang dijual punya harga dan lisensi", () => {
    expect(sellableApps.length).toBeGreaterThan(0);
    for (const app of sellableApps) {
      expect(app.pricing?.price).toBeGreaterThan(0);
      expect(app.pricing?.currency).toBe("IDR");
      expect(app.pricing?.license.model).toBe("one-time");
      expect(app.pricing?.license.includes.length).toBeGreaterThan(0);
    }
  });

  it("harga Keluarga Rp49.000 dan bukan langganan", () => {
    const keluarga = getSellableApp("keluarga");
    expect(keluarga?.pricing?.price).toBe(49_000);
    expect(keluarga?.pricing?.license.summary).toContain("Sekali bayar");
  });

  it("produk tanpa harga tidak bisa dibeli", () => {
    expect(getSellableApp("ops")).toBeUndefined();
  });
});

describe("provider pembayaran", () => {
  it("jatuh ke transfer manual bila gateway belum dikonfigurasi", () => {
    const provider = getPaymentProvider();
    expect(provider.id).toBe("manual");
    expect(provider.isConfigured()).toBe(true);
  });

  it("melaporkan status semua provider", () => {
    const providers = listPaymentProviders();
    const ids = providers.map((p) => p.id);
    expect(ids).toEqual(["manual", "xendit", "midtrans"]);
    expect(providers.find((p) => p.id === "manual")?.configured).toBe(true);
  });

  it("membuat instruksi transfer yang memuat kode pesanan", async () => {
    const result = await getPaymentProvider().createPayment({
      orderCode: "ARV-TEST1",
      productName: "Keluarga",
      amount: 49_000,
      customer: { name: "Uji", email: "uji@contoh.id" },
    });

    expect(result.method).toBe("bank_transfer");
    expect(result.bankAccount?.number).toBeTruthy();
    expect(result.instructions.join(" ")).toContain("ARV-TEST1");
    expect(result.instructions.join(" ")).toContain("49.000");
  });
});

describe("lisensi", () => {
  it("pemilik punya lisensi aktif untuk Keluarga", () => {
    expect(hasLicense("irvan@airevo-digital.my.id", "keluarga")).toBe(true);
  });

  it("pasangan juga punya lisensi sendiri", () => {
    expect(hasLicense("sari@airevo-digital.my.id", "keluarga")).toBe(true);
  });

  it("email tanpa lisensi tidak punya akses", () => {
    expect(hasLicense("orang@contoh.id", "keluarga")).toBe(false);
  });

  it("pencocokan email tidak peka huruf besar", () => {
    expect(hasLicense("IRVAN@airevo-digital.my.id", "keluarga")).toBe(true);
  });

  it("lisensi hanya berlaku untuk produknya sendiri", () => {
    expect(hasLicense("irvan@airevo-digital.my.id", "ops")).toBe(false);
  });

  it("lisensi yang dicabut tidak memberi akses", () => {
    const license = licenseFor("irvan@airevo-digital.my.id", "keluarga")!;
    license.status = "revoked";
    expect(hasLicense("irvan@airevo-digital.my.id", "keluarga")).toBe(false);
  });

  it("lisensi seumur hidup tidak punya tanggal kedaluwarsa", () => {
    const licenses = licensesFor("irvan@airevo-digital.my.id");
    expect(licenses.length).toBeGreaterThan(0);
    for (const license of licenses) {
      expect(license).not.toHaveProperty("expiresAt");
    }
  });
});

describe("pesanan", () => {
  it("pesanan demo tercatat lunas dan punya kode", () => {
    const order = orderByCode("ARV-DEMO1");
    expect(order).toBeDefined();
    expect(order?.status).toBe("paid");
    expect(order?.amount).toBe(49_000);
  });

  it("pencarian kode pesanan tidak peka huruf besar", () => {
    expect(orderByCode("arv-demo1")).toBeDefined();
  });

  it("menghitung pendapatan hanya dari pesanan lunas", () => {
    const summary = salesSummary();
    const paid = getStore().orders.filter((order) => order.status === "paid");
    expect(summary.revenue).toBe(
      paid.reduce((sum, order) => sum + order.amount, 0),
    );
  });

  it("menghitung pembeli unik per email", () => {
    const before = buyerCount();
    getStore().orders.push({
      id: "ord-test",
      code: "ARV-TESTX",
      productId: "keluarga",
      productName: "Keluarga",
      buyerName: "Baru",
      email: "baru@contoh.id",
      amount: 49_000,
      status: "paid",
      provider: "manual",
      method: "bank_transfer",
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    });
    expect(buyerCount()).toBe(before + 1);
  });

  it("pesanan pending tidak dihitung sebagai pendapatan", () => {
    const before = salesSummary().revenue;
    getStore().orders.push({
      id: "ord-pending",
      code: "ARV-PEND1",
      productId: "keluarga",
      productName: "Keluarga",
      buyerName: "Calon",
      email: "calon@contoh.id",
      amount: 49_000,
      status: "pending",
      provider: "manual",
      method: "bank_transfer",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(salesSummary().revenue).toBe(before);
    expect(salesSummary().pending).toBeGreaterThan(0);
  });
});
