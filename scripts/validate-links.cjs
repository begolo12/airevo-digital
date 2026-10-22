// Memvalidasi setiap tautan internal terhadap rute yang benar-benar ada.
//
// Korupsi teks sebelumnya menghasilkan `/keiuarga/...` yang tidak pernah
// terdeteksi karena tidak ada yang mengkliknya di test. Skrip ini memeriksa
// semua `href="/..."` terhadap daftar halaman di `src/app`.

const fs = require("node:fs");
const path = require("node:path");

/* ------------------------------ kumpulkan rute ---------------------------- */

function collectRoutes(dir, prefix = "", out = []) {
  // Halaman di root grup `(marketing)` juga melayani `/`.
  if (fs.existsSync(path.join(dir, "page.tsx"))) {
    out.push(prefix || "/");
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;
    const full = path.join(dir, name);

    // Grup rute `(apps)` tidak masuk URL.
    if (name.startsWith("(") && name.endsWith(")")) {
      collectRoutes(full, prefix, out);
      continue;
    }

    // Segmen dinamis `[slug]` cocok dengan apa pun.
    const segment = name.startsWith("[") ? "*" : name;
    const next = `${prefix}/${segment}`;

    if (fs.existsSync(path.join(full, "page.tsx"))) out.push(next);
    collectRoutes(full, next, out);
  }
  return out;
}

const routes = collectRoutes("src/app").sort();
console.log(`${routes.length} rute ditemukan.\n`);

/** Cocokkan path konkret dengan pola rute. */
function matches(pathname) {
  // Buang query dan hash.
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";

  /*
   * Tautan yang dirakit dari template (`/beli/${slug}`) terpotong di `$`
   * menjadi `/beli/`. Untuk itu cukup pastikan ada rute yang berawalan sama —
   * segmen dinamisnya akan menangani sisanya.
   */
  if (pathname.endsWith("/") && pathname !== "/") {
    const prefix = pathname.replace(/\/$/, "");
    return routes.some((route) => route.startsWith(`${prefix}/`));
  }

  for (const route of routes) {
    if (route === "/") {
      if (clean === "/") return true;
      continue;
    }

    const routeParts = route.split("/").filter(Boolean);
    const pathParts = clean.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) continue;

    const ok = routeParts.every(
      (part, index) => part === "*" || part === pathParts[index],
    );
    if (ok) return true;
  }
  return false;
}

/* ------------------------------ periksa tautan ---------------------------- */

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const broken = [];

for (const file of walk("src")) {
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    // href="/..." dan href={`/...`}
    for (const match of line.matchAll(/href=(?:"|\{`)(\/[^"'`$]*)/g)) {
      const target = match[1];
      if (target.startsWith("//")) continue; // URL eksternal
      if (target.startsWith("/api/")) continue; // route handler
      if (!matches(target)) {
        broken.push({
          file: file.replace(/\\/g, "/"),
          line: index + 1,
          target,
        });
      }
    }

    // router.push("/...")
    for (const match of line.matchAll(/router\.(?:push|replace)\((?:"|`)(\/[^"'`$]*)/g)) {
      const target = match[1];
      if (target.startsWith("/api/")) continue;
      if (!matches(target)) {
        broken.push({ file: file.replace(/\\/g, "/"), line: index + 1, target });
      }
    }
  });
}

if (broken.length === 0) {
  console.log("Semua tautan internal mengarah ke rute yang ada.");
} else {
  console.log(`${broken.length} tautan rusak:\n`);
  for (const item of broken) {
    console.log(`  ${item.target}`);
    console.log(`      ${item.file}:${item.line}`);
  }
}
