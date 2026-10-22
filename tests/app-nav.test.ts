import { describe, expect, it } from "vitest";
import {
  appNav,
  bottomNavItems,
  flatNav,
  groupIdForPath,
  isNavActive,
  navGroupsFor,
  ownerItems,
} from "@/config/app-nav";

describe("navigasi aplikasi", () => {
  it("semua item punya label, href, dan ikon", () => {
    for (const group of appNav) {
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.label).toBeTruthy();
        expect(item.href.startsWith("/keluarga")).toBe(true);
        expect(item.icon).toBeTruthy();
      }
    }
  });

  it("tidak ada href ganda", () => {
    const hrefs = flatNav("owner").map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("menu penjualan hanya untuk pemilik", () => {
    const owner = flatNav("owner").map((item) => item.href);
    const adult = flatNav("adult").map((item) => item.href);

    expect(owner).toContain("/admin/pesanan");
    expect(adult).not.toContain("/admin/pesanan");
    expect(navGroupsFor("adult")).toHaveLength(appNav.length);
  });

  it("menu pemilik digabung ke grup Lainnya, bukan grup baru", () => {
    const ownerGroups = navGroupsFor("owner");
    expect(ownerGroups).toHaveLength(appNav.length);

    const lainnya = ownerGroups.find((group) => group.id === "lainnya");
    expect(lainnya?.items.map((item) => item.href)).toContain("/admin/pesanan");
    expect(ownerItems).toHaveLength(1);
  });

  it("dashboard cocok persis, bukan prefix", () => {
    const dashboard = flatNav("owner").find((item) => item.href === "/keluarga")!;
    expect(isNavActive("/keluarga", dashboard)).toBe(true);
    expect(isNavActive("/keluarga/keuangan/transaksi", dashboard)).toBe(false);
  });

  it("halaman anak tetap menandai menunya aktif", () => {
    // Dicari lewat href, bukan indeks: urutan menu boleh berubah tanpa
    // membuat test ini gagal palsu.
    const transaksi = flatNav("owner").find(
      (item) => item.href === "/keluarga/keuangan/transaksi",
    )!;
    expect(transaksi).toBeDefined();
    expect(isNavActive("/keluarga/keuangan/transaksi", transaksi)).toBe(true);
    expect(isNavActive("/keluarga/keuangan/transaksi/123", transaksi)).toBe(true);
  });

  it("ringkasan uang tidak ikut aktif saat membuka halaman anaknya", () => {
    // Item ber-`exact` hanya cocok persis, sehingga membuka Transaksi tidak
    // menyalakan dua menu sekaligus.
    const ringkasan = flatNav("owner").find(
      (item) => item.href === "/keluarga/keuangan",
    )!;
    expect(ringkasan.exact).toBe(true);
    expect(isNavActive("/keluarga/keuangan", ringkasan)).toBe(true);
    expect(isNavActive("/keluarga/keuangan/transaksi", ringkasan)).toBe(false);
  });

  it("mengenali grup yang memuat halaman aktif", () => {
    expect(groupIdForPath("/keluarga/keuangan/transaksi", "owner")).toBe("uang");
    expect(groupIdForPath("/keluarga/dokumen", "owner")).toBe("catatan");
    expect(groupIdForPath("/keluarga", "owner")).toBe("ringkasan");
  });

  it("bottom nav punya lima item dengan ikon", () => {
    expect(bottomNavItems).toHaveLength(5);
    expect(bottomNavItems.every((item) => Boolean(item.icon))).toBe(true);
  });

  it("setiap halaman punya kata kunci pencarian", () => {
    const withoutKeywords = flatNav("owner").filter(
      (item) => !item.keywords || item.keywords.length === 0,
    );
    expect(withoutKeywords).toHaveLength(0);
  });

  it("kata kunci sehari-hari menemukan halaman yang tepat", () => {
    const find = (query: string) =>
      flatNav("owner").find((item) =>
        item.keywords?.some((keyword) => keyword.includes(query)),
      );

    expect(find("listrik")?.href).toBe("/keluarga/keuangan/tagihan");
    expect(find("dokter")?.href).toBe("/keluarga/kesehatan");
    expect(find("spp")?.href).toBe("/keluarga/pendidikan");
    expect(find("kpr")?.href).toBe("/keluarga/keuangan/utang");
  });
});
