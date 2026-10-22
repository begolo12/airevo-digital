# 30 — Dua Jalur Autentikasi

> Ditulis: 2026-10-22
> Alasan: rencana rilis menandai "auth aplikasi vs Neon Auth — dua jalur,
> sengaja; perlu didokumentasikan."

Dokumen ini menjelaskan **kenapa ada dua sistem auth**, kapan masing-masing
dipakai, dan apa yang **tidak** boleh dilakukan ke depannya.

---

## 1. Ringkasan

| Jalur | Dipakai untuk | Status |
| --- | --- | --- |
| **Auth aplikasi** | Login pengguna sungguhan | Aktif, wajib |
| **Neon Auth** | Verifikasi token dari luar | Aktif, opsional |

Keduanya **tidak** saling menggantikan. Auth aplikasi adalah pintu masuk;
Neon Auth adalah jalur verifikasi untuk integrasi masa depan.

---

## 2. Auth aplikasi

### Berkas

| Berkas | Isi |
| --- | --- |
| `src/lib/auth/session.ts` | Cookie HMAC bertanda tangan, dua tahap sesi |
| `src/lib/auth/rate-limit.ts` | Pembatas percobaan masuk |
| `src/lib/data/actions.ts` | `loginAction`, `unlockProfile`, `logoutAction` |
| `src/lib/session.ts` | `getViewer`, `requireViewer`, `requireActiveSession` |

### Alur

```
1. Email + kata sandi  →  scrypt verify  →  cookie sesi tahap "profile"
2. Pilih profil        →  PIN (scrypt)   →  cookie sesi tahap "active"
3. requireViewer()     →  { userId, profileId, workspaceId, role }
```

### Kenapa dua tahap

Satu akun bisa berisi beberapa profil (Irvan, Sari, Bima, Nara) — model
Netflix. Tahap pertama membuktikan **siapa pemilik akun**; tahap kedua
membuktikan **profil mana yang sedang dipakai**. Tanpa pemisahan ini, PIN
profil tidak ada artinya.

### Keamanan

| Aspek | Cara |
| --- | --- |
| Kata sandi | scrypt + salt per pengguna |
| Cookie | HMAC-SHA256, `httpOnly`, `sameSite=lax` |
| Pembatas laju | 5 percobaan / 15 menit per email |
| PIN | 5 percobaan / 10 menit per profil |
| Secret | `SESSION_SECRET` (44 karakter acak) |

---

## 3. Neon Auth

### Berkas

| Berkas | Isi |
| --- | --- |
| `src/lib/auth/neon-auth.ts` | `verifyNeonAuthToken`, `bearerToken` |
| `src/app/api/auth/neon/route.ts` | Endpoint verifikasi |

### Cara kerja

Token diperiksa tanda tangannya terhadap JWKS milik branch Neon, lalu klaim
penerbit dan masa berlakunya. Kunci diambil sekali lalu di-cache oleh
`createRemoteJWKSet`.

Endpoint `/api/auth/neon` **tidak membuat sesi**. Ia hanya menjawab: "token ini
sah, dan ini identitasnya".

### Kenapa tidak menggantikan auth aplikasi

Aplikasi sudah punya auth yang berfungsi: scrypt, cookie HMAC, dua tahap sesi,
pemisahan ruang per profil, dan pembatas laju. Semua diuji.

Menggantinya berarti membongkar alur login, sesi, dan **seluruh test yang
menjaganya** — pekerjaan besar tanpa manfaat yang jelas untuk aplikasi
satu-keluarga yang penggunanya masuk dari satu perangkat.

Neon Auth berguna bila nanti ada aplikasi mobile atau integrasi pihak ketiga
yang butuh memverifikasi identitas tanpa membagikan kata sandi.

---

## 4. Aturan yang harus dijaga

### 1. Jangan buat sesi dari token Neon Auth tanpa keputusan sadar

`verifyNeonAuthToken()` mengembalikan identitas, bukan sesi. Membuat sesi
langsung dari token berarti melewati pemeriksaan profil dan PIN — dua lapis
yang justru menjadi inti model multi-profil.

### 2. Jangan hapus auth aplikasi selama Neon Auth belum menggantikan semuanya

Dua jalur boleh ada bersamaan. Yang berbahaya adalah menghapus satu sebelum
yang lain siap — pengguna bisa kehilangan akses.

### 3. Setiap server action wajib memeriksa sesi

Diperiksa otomatis oleh `scripts/check-authorization.cjs`. Enam celah pernah
lolos karena tidak ada pemeriksaan sistematis seperti ini — lihat
[28-hasil-pengerjaan.md](28-hasil-pengerjaan.md) bagian 3.3.

### 4. `requireViewer()` harus melempar, bukan mengembalikan `null`

Tiruan di test yang mengembalikan `null` membuat aksi tetap berjalan tanpa
sesi, sehingga test otorisasi lulus palsu.

---

## 5. Kapan Neon Auth layak dipertimbangkan

| Skenario | Layak? |
| --- | --- |
| Aplikasi mobile resmi | Ya — token bisa dipakai lintas platform |
| Login sosial (Google, Apple) | Ya — Neon Auth menangani OAuth |
| Passkey / MFA | Ya — sudah tersedia di Neon Auth |
| Ganti total auth sekarang | **Tidak** — tidak ada manfaat, ada risiko |
| Aplikasi web satu keluarga | Tidak perlu |

---

## 6. Yang belum dikerjakan

| Hal | Catatan |
| --- | --- |
| Login lewat Neon Auth | Sengaja tidak dibuat |
| Migrasi pengguna ke Neon Auth | Belum relevan |
| Uji token Neon Auth di produksi | Butuh token sungguhan dari branch |

---

## 7. Cara memverifikasi

```bash
# Token sah diterima, token palsu ditolak
pnpm exec vitest run tests/neon-auth.test.ts

# JWKS Neon hidup
curl http://localhost:3100/api/health
# → "neonAuth":"ok"

# Endpoint menolak tanpa token
curl -i http://localhost:3100/api/auth/neon
# → 401
```
