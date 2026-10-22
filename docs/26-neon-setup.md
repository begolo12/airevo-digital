# 26 — Neon: Postgres, Auth, Object Storage

> Diperbarui: 2026-10-22
> Perintah: `neon init` → `neon deploy` → sambungkan ke kode → buktikan bekerja.

Dokumen ini mencatat apa yang berubah, bukti bahwa ketiga layanan bekerja, dan
apa yang **tidak** dikerjakan beserta alasannya.

---

## 1. Ringkasan

| Layanan | Status | Bukti |
| --- | --- | --- |
| **Postgres** | Tersambung penuh | Data bertahan setelah server restart |
| **Object Storage** | Tersambung penuh | Unggah → unduh → hapus lewat aplikasi |
| **Neon Auth** | Verifikasi token | 7 test: sah diterima, palsu ditolak |
| Build | Lulus | `✓ Compiled successfully` |
| Test | 401 lulus | 20 berkas |

---

## 2. Yang dijalankan

```
neon init -y --org-id org-winter-sun-93675351 \
  --project-id holy-poetry-58948881 --branch production \
  --services postgres --services auth --services object-storage
neon deploy
```

**Catatan:** `--services postgres,auth,object-storage` (dipisah koma) **gagal** —
CLI membacanya sebagai satu nama layanan. Harus diulang per flag.

### Yang dibuat

| Berkas | Isi |
| --- | --- |
| `neon.ts` | Deklarasi layanan (dibuat `neon init`) |
| `.neon` | org, project, branch — gitignored |
| `.env.local` | 9 variabel Neon — gitignored |

### Variabel yang masuk `.env.local`

```
Postgres        DATABASE_URL, DATABASE_URL_UNPOOLED
Branch          NEON_BRANCH
Neon Auth       NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL
Object Storage  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                AWS_ENDPOINT_URL_S3, AWS_REGION
```

---

## 3. Postgres: bagaimana disambungkan

### Masalahnya

`src/lib/db/schema.ts` berisi 22 tabel domain, tetapi modelnya memakai
`household_id` bertipe uuid, sementara aplikasi memakai `workspaceId` bertipe
teks dengan ruang pribadi per profil. Memetakan keduanya berarti menulis ulang
seluruh lapisan query **dan** `actions.ts` (1.700 baris) sekaligus.

### Yang dipilih

Dua tabel baru di `src/lib/db/records.ts`:

| Tabel | Isi |
| --- | --- |
| `workspace_records` | Satu baris per entitas, `workspace_id` sebagai kolom nyata |
| `app_state` | Keadaan tunggal: profil, workspace, anggota, rumah tangga |

**Kenapa per-baris, bukan satu dokumen besar:** menyimpan seluruh store sebagai
satu dokumen berarti setiap perubahan menulis ulang semuanya, dan dua permintaan
bersamaan saling menimpa. Dengan satu baris per entitas, dua pengguna yang
menyunting entitas berbeda tidak bertabrakan.

**Kenapa bukan tabel domain:** ini langkah transisi yang disengaja. Isi kolom
`data` bisa dipecah ke tabel domain nanti tanpa mengubah API aplikasi.

### Alur

```
instrumentation.ts  → hydrateStore()  → muat semua dari Postgres ke memori
saveStore()         → antrean serial  → tulis HANYA baris yang berubah
```

`getStore()` tetap **sinkron** — dipanggil di ratusan tempat. Memuatnya sekali
di awal membuat seluruh aplikasi memakai data database tanpa mengubah satu pun
pemanggil.

Perubahan dideteksi lewat hash per baris (FNV-1a), jadi menambah satu transaksi
hanya menulis satu baris, bukan 21.

### Bukti

Transaksi `NEON-PERSIST-1792613521576` dicatat lewat UI, lalu:

1. Server dimatikan
2. `.data/store.json` dihapus
3. Server dijalankan ulang
4. Transaksi **masih ada** di aplikasi

Isi database setelahnya:

```
accounts 8 · transactions 21 · categories 15 · budgets 7 · documents 6 …
NEON-PERSIST-1792613521576 = 135000
app_state: household, licenses, messages, orders, profiles, users,
           workspaceMembers, workspaces
```

---

## 4. Object Storage

### Yang dibuat

| Berkas | Isi |
| --- | --- |
| `src/lib/storage/neon-storage.ts` | Klien S3, presigned URL, batas jenis berkas |
| `src/app/api/dokumen/route.ts` | `POST` izin unggah, `GET` tautan unduh |

**Kenapa presigned URL:** berkas dokumen bisa beberapa MB. Meneruskannya lewat
server Next.js memakai memori dan waktu fungsi untuk menyalin byte yang tidak
pernah dibaca aplikasi. Browser mengunggah langsung; server hanya menandatangani.

### Keamanan

- Sesi wajib aktif
- Dokumen harus milik ruang yang sedang aktif
- Kunci objek selalu diawali `workspaceId/`
- `keyBelongsToWorkspace()` menolak kunci ruang lain dan `..`
- Jenis berkas dibatasi: PDF, JPG, PNG, WEBP
- Ukuran maksimal 10 MB

### Bukti

```
1. Login                              : ok
2. Dokumen uji                        : doc-1
3. Izin unggah diterima               : ws-family/doc-1.pdf
4. Unggah langsung ke bucket          : ok (200)
5. Tautan unduh diterima              : ok
6. Unduh dari bucket                  : isi sama
7. Kunci ruang lain ditolak           : ya
8. Objek uji dibersihkan              : ok
```

---

## 5. Neon Auth: apa yang dikerjakan dan apa yang tidak

### Yang **tidak** dilakukan: mengganti auth aplikasi

Aplikasi sudah punya auth sendiri: scrypt untuk kata sandi dan PIN, cookie HMAC
bertanda tangan, dua tahap sesi (`profile` → `active`), pemisahan ruang per
profil, dan rate limit. Semua berfungsi dan dijaga test.

Menggantinya berarti membongkar alur login, sesi, dan seluruh test yang
menjaganya — pekerjaan besar tanpa manfaat yang jelas untuk aplikasi
satu-keluarga.

### Yang dilakukan: jalur verifikasi token

`src/lib/auth/neon-auth.ts` memverifikasi token Neon Auth terhadap JWKS branch.
Berguna untuk aplikasi mobile atau integrasi masa depan tanpa mengubah alur yang
sudah ada.

| Berkas | Isi |
| --- | --- |
| `src/lib/auth/neon-auth.ts` | `verifyNeonAuthToken`, `bearerToken` |
| `src/app/api/auth/neon/route.ts` | Endpoint verifikasi |
| `tests/neon-auth.test.ts` | 7 test |

### Bukti

```
✓ menerima token yang sah
✓ menolak token kedaluwarsa
✓ menolak token dari penerbit lain
✓ menolak token yang tanda tangannya dirusak
✓ menolak token tanpa subjek
✓ menolak masukan yang bukan JWT
✓ menolak token yang ditandatangani kunci lain
```

Ditambah: JWKS Neon yang **sebenarnya** hidup — `/api/health` melaporkan
`neonAuth: "ok"` dengan kunci EdDSA asli dari branch.

---

## 6. Health check

Sekarang **menguji**, bukan hanya membaca variabel environment:

```json
{
  "status": "ok",
  "checks": {
    "app": "ok",
    "database": "ok",
    "fileStorage": "writable",
    "objectStorage": "configured",
    "neonAuth": "ok"
  }
}
```

- `database` — menjalankan query nyata ke dua tabel
- `neonAuth` — mengambil JWKS dan memeriksa statusnya
- `fileStorage` — menulis berkas uji

---

## 7. Keamanan test

`.env.local` kini berisi kredensial produksi. `vitest.config.ts` **mengosongkan**
seluruh variabel Neon saat test berjalan:

```ts
DATABASE_URL: "",
DATABASE_URL_UNPOOLED: "",
NEON_AUTH_BASE_URL: "",
NEON_AUTH_JWKS_URL: "",
AWS_ACCESS_KEY_ID: "",
AWS_SECRET_ACCESS_KEY: "",
AWS_ENDPOINT_URL_S3: "",
```

Tanpa ini, satu test yang lupa memakai store tiruan bisa menghapus data
sungguhan.

---

## 8. Skill dan MCP

### Skill Neon — terpasang

| Skill | Lokasi |
| --- | --- |
| `neon` | `~/.agents/skills/neon` |
| `neon-postgres` | `~/.agents/skills/neon-postgres` |
| `neon-auth` | `~/.agents/skills/neon-auth` |
| `neon-object-storage` | `~/.agents/skills/neon-object-storage` |

Dipasang lewat `neon skills --agent codex` (agent yang memetakan ke
`~/.agents/skills`, lokasi yang dibaca harness ini). Juga dipasang untuk
`claude-code`.

**Kendala yang ditemukan:** `neon skills` awalnya gagal karena lingkungan ini
menyetel `GIT_CONFIG_COUNT=2` dengan `GIT_CONFIG_KEY_0` kosong, membuat git
melempar `fatal: unable to parse command-line config`. Variabel itu dilepas
sementara khusus untuk perintah tersebut; konfigurasi Anda tidak diubah
permanen.

### MCP server — tidak dipasang, dengan alasan

DeepSeek Harness **tidak punya mekanisme konfigurasi MCP berbasis berkas**.
Diperiksa:

- `~/.dsh/` hanya berisi `.credentials.yaml`, `storages/`, `profiles/`
- Profil DSH memakai `cordis.yml` + `cordis.patch.yml` (sistem plugin, bukan MCP)
- Tidak ada `mcpServers` di konfigurasi mana pun yang bisa diedit
- Bundle DSH memuat referensi MCP hanya di level protokol SDK, bukan konfigurasi

`neon mcp --agent …` hanya mendukung 15 agent tertentu (cursor, claude-code,
codex, vscode, …), tidak termasuk harness ini. Memaksakannya akan menulis
konfigurasi ke tempat yang tidak dibaca — perubahan tanpa efek.

**Yang dipertahankan:** `~/.claude.json` Anda **tidak disentuh**. Isinya tetap
`mcpServers: { exa }` seperti sebelumnya.

**Yang bisa Anda lakukan bila ingin MCP:** pasang Neon MCP di agent lain yang
Anda pakai (Cursor/VS Code/Claude Code) dengan
`neon mcp --agent <nama> -y`. CLI `neon` di mesin ini sudah terautentikasi,
jadi MCP hanya menambah antarmuka, bukan kemampuan baru.

---

## 9. Yang belum dikerjakan

| Hal | Catatan |
| --- | --- |
| Tabel domain `finance.*` / `family.*` belum dipakai | Perlu migrasi data dari `workspace_records` |
| UI unggah dokumen | Endpoint siap; tombol di halaman Dokumen belum ada |
| Login lewat Neon Auth | Sengaja tidak diganti; lihat bagian 5 |
| Rate limit terdistribusi | Masih di memori proses |
| Uji beban | Belum ada |

---

## 10. Cara memverifikasi ulang

```bash
node scripts/check-db.cjs         # koneksi Postgres
node scripts/check-storage.cjs    # object storage langsung
node scripts/inspect-neon.cjs     # isi database
node scripts/prove-storage.cjs    # object storage lewat aplikasi (butuh server)
pnpm test                         # 401 test
pnpm build
curl http://localhost:3100/api/health
```
