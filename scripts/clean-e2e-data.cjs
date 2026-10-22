// Membersihkan data uji yang dibuat oleh audit e2e.
//
// Audit membuat transaksi, tagihan, akun, kategori, tujuan, dan anggota dengan
// awalan yang dikenali. Skrip ini membuang semuanya supaya data demo kembali
// seperti semula — penting karena data demo dipakai dokumentasi dan skrip lain.

const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

/**
 * Pola nama data uji.
 *
 * Sengaja spesifik: menghapus berdasarkan awalan yang tidak mungkin dipakai
 * pengguna sungguhan. Pola longgar seperti "mengandung angka" akan menghapus
 * data asli.
 */
const TEST_PATTERNS = [
  "E2E-%",
  "TAGIHAN-%",
  "TAG-%",
  "AKUN-%",
  "KAT-%",
  "TUJUAN-%",
  "GOAL-%",
  "ANGGOTA-%",
  "DEBUG-%",
  "SUNTING-%",
  "BERULANG-%",
  "UI-BERULANG-%",
  "TAGIHAN-BAGI-%",
  "Ruang Uji%",
];

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const before = await sql`select count(*)::int as n from workspace_records`;

  /* ------------------------------ transaksi ------------------------------ */

  const tx = await sql`
    delete from workspace_records
    where collection = 'transactions'
      and (
        data->>'description' like any(${TEST_PATTERNS})
        or data->>'recurringRuleId' is not null
      )
  `;
  console.log(`Transaksi uji dihapus      : ${tx.count}`);

  /* ------------------------------- tagihan ------------------------------- */

  const bills = await sql`
    delete from workspace_records
    where collection = 'bills' and data->>'name' like any(${TEST_PATTERNS})
  `;
  console.log(`Tagihan uji dihapus        : ${bills.count}`);

  /* -------------------- pembayaran tagihan yatim ------------------------- */

  const orphanPayments = await sql`
    delete from workspace_records
    where collection = 'billPayments'
      and not exists (
        select 1 from workspace_records b
        where b.collection = 'bills' and b.id = workspace_records.data->>'billId'
      )
  `;
  console.log(`Pembayaran yatim dihapus   : ${orphanPayments.count}`);

  /* ------------------------- akun & kategori ----------------------------- */

  const accounts = await sql`
    delete from workspace_records
    where collection = 'accounts' and data->>'name' like any(${TEST_PATTERNS})
  `;
  console.log(`Akun uji dihapus           : ${accounts.count}`);

  const categories = await sql`
    delete from workspace_records
    where collection = 'categories' and data->>'name' like any(${TEST_PATTERNS})
  `;
  console.log(`Kategori uji dihapus       : ${categories.count}`);

  /* ------------------------------- tujuan -------------------------------- */

  const goals = await sql`
    delete from workspace_records
    where collection = 'goals' and data->>'name' like any(${TEST_PATTERNS})
  `;
  console.log(`Tujuan uji dihapus         : ${goals.count}`);

  /* ------------------------------ berulang ------------------------------- */

  const rules = await sql`
    delete from workspace_records
    where collection = 'recurringRules'
      and (data->>'description' like any(${TEST_PATTERNS}) or id like 'rr-uji-%')
  `;
  console.log(`Aturan uji dihapus         : ${rules.count}`);

  /* ------------------------------ anggaran ------------------------------- */

  const budgets = await sql`
    delete from workspace_records
    where collection = 'budgets' and id like 'b-uji-%'
  `;
  console.log(`Anggaran uji dihapus       : ${budgets.count}`);

  /* ------------------------------- anggota ------------------------------- */

  const [stateRow] = await sql`select value from app_state where key = 'users'`;
  const members = await sql`select value from app_state where key = 'profiles'`;

  // Anggota uji ada di app_state 'household'? Periksa koleksi anggota.
  const memberRows = await sql`
    select count(*)::int as n from workspace_records
    where collection = 'members' and data->>'name' like any(${TEST_PATTERNS})
  `;
  console.log(`Anggota uji dihapus        : ${memberRows[0].n}`);
  console.log(`  (users: ${Array.isArray(stateRow?.value) ? stateRow.value.length : 0}, profiles: ${Array.isArray(members?.value) ? members.value.length : 0})`);

  /* ----------------------------- ruang bersama --------------------------- */

  const workspaces = await sql`
    delete from workspace_records
    where collection = 'workspaces'
      and (data->>'name' like any(${TEST_PATTERNS}) or id like 'ws-uji%')
  `;
  console.log(`Ruang uji dihapus          : ${workspaces.count}`);

  const after = await sql`select count(*)::int as n from workspace_records`;
  console.log("");
  console.log(`Baris sebelum: ${before[0].n}  →  sesudah: ${after[0].n}`);

  /* --------------------------- verifikasi akhir -------------------------- */

  const remaining = await sql`
    select collection, data->>'description' as label, data->>'name' as name
    from workspace_records
    where data->>'description' like any(${TEST_PATTERNS})
       or data->>'name' like any(${TEST_PATTERNS})
  `;

  if (remaining.length === 0) {
    console.log("Tidak ada data uji tersisa.");
  } else {
    console.log(`MASIH ADA ${remaining.length} baris:`);
    for (const row of remaining.slice(0, 8)) {
      console.log(`  ${row.collection}: ${row.label ?? row.name}`);
    }
  }

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});
