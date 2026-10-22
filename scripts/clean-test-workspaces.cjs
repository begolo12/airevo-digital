// Menghapus workspace uji dari database.
//
// Hanya menyentuh workspace bersama yang dibuat skrip pembuktian (nama
// berawalan "Ruang Uji"), bukan data contoh.

const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const [row] = await sql`select value from app_state where key = 'workspaces'`;
  const workspaces = row?.value ?? [];

  const keep = workspaces.filter(
    (workspace) => !workspace.name.startsWith("Ruang Uji"),
  );
  const removed = workspaces.length - keep.length;

  if (removed > 0) {
    await sql`
      update app_state
      set value = ${sql.json(keep)}, updated_at = now()
      where key = 'workspaces'
    `;
  }

  // Hapus juga keanggotaan workspace yang sudah tidak ada.
  const [membersRow] = await sql`select value from app_state where key = 'workspaceMembers'`;
  const members = membersRow?.value ?? [];
  const ids = new Set(keep.map((workspace) => workspace.id));
  const keptMembers = members.filter((member) => ids.has(member.workspaceId));

  if (keptMembers.length !== members.length) {
    await sql`
      update app_state
      set value = ${sql.json(keptMembers)}, updated_at = now()
      where key = 'workspaceMembers'
    `;
  }

  console.log(`Workspace uji dihapus: ${removed}`);
  console.log(`Workspace tersisa: ${keep.length}`);
  console.log(`Keanggotaan tersisa: ${keptMembers.length}`);

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});
