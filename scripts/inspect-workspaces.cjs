// Memeriksa keadaan workspace di database.
const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const [row] = await sql`select value from app_state where key = 'workspaces'`;
  const workspaces = row?.value ?? [];

  console.log("Workspace di database:");
  for (const workspace of workspaces) {
    console.log(
      `  ${workspace.id.padEnd(14)} ${workspace.type.padEnd(9)} ${workspace.name} (owner ${workspace.ownerProfileId})`,
    );
  }

  const [membersRow] = await sql`select value from app_state where key = 'workspaceMembers'`;
  const members = membersRow?.value ?? [];
  console.log("\nKeanggotaan:");
  for (const member of members) {
    console.log(`  ${member.workspaceId.padEnd(14)} ${member.profileId.padEnd(10)} ${member.role}`);
  }

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});
