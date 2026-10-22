import { requireViewer } from "@/lib/session";
import { listTransactions } from "@/lib/data/queries";
import { formatDate } from "@/lib/format";
import { csvDocument } from "@/lib/csv";

/**
 * Ekspor transaksi ke CSV.
 *
 * ## Kenapa lewat route handler, bukan server action
 *
 * Ekspor menghasilkan berkas yang harus diunduh browser. Server action
 * mengembalikan JSON, bukan unduhan. Route handler bisa mengirim
 * `Content-Disposition: attachment` sehingga browser menyimpan berkasnya
 * langsung, tanpa JavaScript tambahan.
 *
 * ## Keamanan
 *
 * - Sesi wajib aktif; tanpa itu siapa pun bisa mengunduh seluruh data keuangan.
 * - Data disaring per ruang **dan** per visibilitas lewat `listTransactions`,
 *   jadi transaksi bertanda "Pribadi" milik profil lain tidak ikut terekspor.
 * - Setiap sel lewat `escapeCsvCell()` yang menetralkan rumus — lihat
 *   `src/lib/csv.ts` untuk alasannya.
 */
export async function GET(request: Request) {
  const viewer = await requireViewer();
  const params = new URL(request.url).searchParams;

  const month = params.get("bulan") ?? undefined;
  const type = params.get("tipe") ?? undefined;
  const q = params.get("q") ?? undefined;

  const rows = listTransactions(
    { month, type: type || undefined, q: q || undefined },
    viewer,
  );

  const typeLabel: Record<string, string> = {
    income: "Pemasukan",
    expense: "Pengeluaran",
    transfer: "Transfer",
  };

  const data: Array<Array<string | number>> = [
    [
      "Tanggal",
      "Jenis",
      "Deskripsi",
      "Kategori",
      "Akun",
      "Akun tujuan",
      "Anggota",
      "Dicatat oleh",
      "Jumlah",
      "Mata uang",
    ],
  ];

  for (const row of rows) {
    data.push([
      formatDate(row.occurredAt),
      typeLabel[row.type] ?? row.type,
      row.description,
      row.categoryName ?? "",
      row.accountName ?? "",
      row.toAccountName ?? "",
      row.memberName ?? "",
      row.recordedByName ?? "",
      row.amount,
      "IDR",
    ]);
  }

  const csv = csvDocument(data);
  const suffix = month ? `-${month}` : "";

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="transaksi-airevo${suffix}.csv"`,
      "cache-control": "no-store",
    },
  });
}
