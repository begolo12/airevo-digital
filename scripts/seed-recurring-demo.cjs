// Menambahkan aturan berulang contoh ke database.
//
// Data contoh punya `rr-gaji`, tetapi tidak pernah tersimpan ke Postgres karena
// belum ada aksi tulis sejak koleksi `recurringRules` ditambahkan. Setelah
// restart pertama, aturan itu hilang dari memori (database mengembalikan array
// kosong) sehingga tidak akan pernah ikut tersimpan.
//
// Skrip ini memulihkannya supaya data demo lengkap dan fitur bisa dicoba.

const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

/** Tanggal ISO untuk hari tertentu di bulan relatif terhadap hari ini. */
function monthDate(offset, day) {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, day));
  return target.toISOString().slice(0, 10);
}

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const existing = await sql`
    select id from workspace_records
    where collection = 'recurringRules' and id = 'rr-gaji'
  `;

  if (existing.length > 0) {
    console.log("rr-gaji sudah ada — tidak ada yang perlu dilakukan.");
    await sql.end();
    return;
  }

  // Akun dan kategori yang dipakai aturan gaji.
  const [account] = await sql`
    select id from workspace_records
    where collection = 'accounts' and workspace_id = 'ws-family'
      and data->>'archived' = 'false' limit 1
  `;
  const [category] = await sql`
    select id from workspace_records
    where collection = 'categories' and workspace_id = 'ws-family'
      and data->>'kind' = 'income' limit 1
  `;

  if (!account || !category) {
    console.error("GAGAL: akun atau kategori pemasukan tidak ditemukan");
    await sql.end();
    process.exit(1);
  }

  const data = {
    id: "rr-gaji",
    workspaceId: "ws-family",
    recordedByProfileId: "p-irvan",
    type: "income",
    amount: 14_500_000,
    description: "Gaji bulanan",
    accountId: account.id,
    categoryId: category.id,
    visibility: "household",
    frequency: "monthly",
    startAt: monthDate(-2, 2),
    nextAt: monthDate(1, 2),
    active: true,
    createdAt: new Date().toISOString(),
  };

  await sql`
    insert into workspace_records (collection, id, workspace_id, data)
    values ('recurringRules', 'rr-gaji', 'ws-family', ${sql.json(data)})
  `;

  console.log("rr-gaji ditambahkan:");
  console.log(`  ${data.description}  Rp${data.amount}  berikutnya ${data.nextAt}`);

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});
