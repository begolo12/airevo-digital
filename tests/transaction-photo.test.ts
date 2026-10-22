import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Lampiran foto struk pada transaksi.
 *
 * Berkasnya diunggah langsung ke Object Storage; aksi hanya mencatat kuncinya.
 * Yang dijaga di sini adalah **keamanan kunci**: kunci wajib milik ruang yang
 * mengaksesnya, agar dokumen transaksi tidak bisa ditautkan ke berkas ruang
 * lain lalu diunduh lewat endpoint.
 */

vi.mock("@/lib/session", async () => {
  const { sessionMock } = await import("./helpers/session");
  return sessionMock();
});

vi.mock("next/cache", async () => {
  const actual = await vi.importActual<typeof import("next/cache")>("next/cache");
  return { ...actual, revalidatePath: () => {} };
});

const { getStore, resetStore, WS } = await import("@/lib/data/store");
const { setViewer } = await import("./helpers/session");
const { attachTransactionPhoto, detachTransactionPhoto, voidTransaction } =
  await import("@/lib/data/actions");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function familyTransaction() {
  const transaction = getStore().transactions.find(
    (item) => item.workspaceId === WS.family && !item.voidedAt,
  );
  if (!transaction) throw new Error("Data contoh tidak punya transaksi aktif");
  return transaction;
}

beforeEach(() => {
  resetStore();
  setViewer({ workspaceId: WS.family, role: "owner" });
});

describe("attachTransactionPhoto", () => {
  it("menautkan foto dengan kunci milik ruang ini", async () => {
    const transaction = familyTransaction();

    const result = await attachTransactionPhoto(
      form({
        id: transaction.id,
        key: `${WS.family}/${transaction.id}.jpg`,
        fileName: "struk-belanjah.jpg",
      }),
    );

    expect(result.ok).toBe(true);
    expect(transaction.attachmentKey).toBe(`${WS.family}/${transaction.id}.jpg`);
    expect(transaction.attachmentName).toBe("struk-belanjah.jpg");
  });

  it("menolak kunci milik ruang lain", async () => {
    const transaction = familyTransaction();

    /*
     * Tanpa pemeriksaan ini, permintaan yang dibuat tangan bisa menautkan
     * transaksi ke berkas ruang lain — lalu mengunduhnya lewat endpoint.
     */
    const result = await attachTransactionPhoto(
      form({
        id: transaction.id,
        key: `${WS.sari}/rahasia.jpg`,
        fileName: "rahasia.jpg",
      }),
    );

    expect(result.ok).toBe(false);
    expect(transaction.attachmentKey).toBeUndefined();
  });

  it("menolak kunci yang mencoba keluar dari ruang", async () => {
    const transaction = familyTransaction();

    const result = await attachTransactionPhoto(
      form({
        id: transaction.id,
        key: `${WS.family}/../${WS.sari}/rahasia.jpg`,
        fileName: "rahasia.jpg",
      }),
    );

    expect(result.ok).toBe(false);
    expect(transaction.attachmentKey).toBeUndefined();
  });

  it("menolak transaksi milik ruang lain", async () => {
    const other = getStore().transactions.find(
      (item) => item.workspaceId !== WS.family && !item.voidedAt,
    );
    if (!other) return;

    const result = await attachTransactionPhoto(
      form({
        id: other.id,
        key: `${WS.family}/${other.id}.jpg`,
        fileName: "x.jpg",
      }),
    );

    expect(result.ok).toBe(false);
    expect(other.attachmentKey).toBeUndefined();
  });

  it("menolak id yang tidak ada", async () => {
    const result = await attachTransactionPhoto(
      form({
        id: "t-tidak-ada",
        key: `${WS.family}/x.jpg`,
        fileName: "x.jpg",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("mengganti lampiran lama", async () => {
    const transaction = familyTransaction();

    await attachTransactionPhoto(
      form({
        id: transaction.id,
        key: `${WS.family}/${transaction.id}.jpg`,
        fileName: "lama.jpg",
      }),
    );

    const result = await attachTransactionPhoto(
      form({
        id: transaction.id,
        key: `${WS.family}/${transaction.id}.png`,
        fileName: "baru.png",
      }),
    );

    expect(result.ok).toBe(true);
    expect(transaction.attachmentKey).toBe(`${WS.family}/${transaction.id}.png`);
    expect(transaction.attachmentName).toBe("baru.png");
  });
});

describe("detachTransactionPhoto", () => {
  it("melepas lampiran", async () => {
    const transaction = familyTransaction();

    await attachTransactionPhoto(
      form({
        id: transaction.id,
        key: `${WS.family}/${transaction.id}.jpg`,
        fileName: "struk.jpg",
      }),
    );

    const result = await detachTransactionPhoto(form({ id: transaction.id }));

    expect(result.ok).toBe(true);
    expect(transaction.attachmentKey).toBeUndefined();
    expect(transaction.attachmentName).toBeUndefined();
  });

  it("menolak melepas transaksi tanpa lampiran", async () => {
    const transaction = familyTransaction();
    transaction.attachmentKey = undefined;

    const result = await detachTransactionPhoto(form({ id: transaction.id }));
    expect(result.ok).toBe(false);
  });
});

describe("lampiran pada transaksi yang dibatalkan", () => {
  it("transaksi yang dibatalkan tetap menyimpan lampirannya", async () => {
    /*
     * Jejak audit: lampiran adalah bukti. Membatalkan transaksi tidak boleh
     * menghapus buktinya, karena pembatalan bisa dipersoalkan kemudian.
     */
    const transaction = familyTransaction();

    await attachTransactionPhoto(
      form({
        id: transaction.id,
        key: `${WS.family}/${transaction.id}.jpg`,
        fileName: "bukti.jpg",
      }),
    );

    await voidTransaction(form({ id: transaction.id }));

    expect(transaction.voidedAt).toBeTruthy();
    expect(transaction.attachmentKey).toBe(`${WS.family}/${transaction.id}.jpg`);
  });
});
