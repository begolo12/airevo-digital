"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CONTACT_RULE,
  LOGIN_RULE,
  PIN_RULE,
  checkRateLimit,
  humanizeRetry,
  recordFailure,
  resetRateLimit,
} from "@/lib/auth/rate-limit";
import { addMonths, safeDueDate, todayISO } from "@/lib/format";
import { hashPin } from "@/lib/auth/password";
import { applyDueRules } from "./recurring";
import { splitBill } from "./bill-split";
import { safeNextPath as safeNextPathShared } from "@/lib/safe-path";
import { getStore, saveStore } from "./store";
import {
  MAX_SHARED_WORKSPACES,
  type ActionResult,
  type BillFrequency,
  type GoalType,
  type Visibility,
  type Workspace,
} from "./types";
import { randomCode } from "./orders";
import {
  authenticate,
  canOpenWorkspace,
  createSession,
  defaultWorkspaceFor,
  destroySession,
  getAccountSession,
  getSession,
  getViewer,
  requireAccountSession,
  requireActiveSession,
  requireViewer,
  unlockProfile,
} from "@/lib/session";
import {
  canCreateSharedWorkspace,
  findWorkspaceByInviteCode,
  isWorkspaceMember,
  personalWorkspaceOf,
  profilesForAccount,
  sharedWorkspacesOf,
  workspaceById,
} from "./workspace";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function fail(message: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, message, fieldErrors };
}

/**
 * Ruang aktif tempat sebuah aksi boleh menulis.
 *
 * Semua aksi yang membuat data **wajib** memakai ini. Tanpa `workspaceId`,
 * entitas baru tidak akan muncul di query mana pun karena seluruh query
 * memfilter berdasarkan ruang aktif.
 *
 * `profileId` dipakai untuk atribusi ("dicatat oleh …") sekaligus menegakkan
 * visibilitas `private`.
 */
async function currentScope(): Promise<{ workspaceId: string; profileId: string } | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  return { workspaceId: viewer.workspaceId, profileId: viewer.profileId };
}

/**
 * Memeriksa bahwa sebuah tanggal benar-benar ada di kalender.
 *
 * Regex `^\d{4}-\d{2}-\d{2}$` hanya memeriksa bentuk, sehingga "2026-13-45"
 * lolos. `new Date("2026-13-45")` juga tidak menolaknya — ia "memperbaiki"
 * tanggal itu menjadi tanggal lain. Karena itu komponennya dibandingkan balik.
 */
function isRealDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

/**
 * Memeriksa bahwa sebuah bulan (`YYYY-MM`) benar-benar ada.
 *
 * Sama seperti `isRealDate`: `/^\d{4}-\d{2}$/` menerima `2026-13` dan
 * `2026-00`. Bulan seperti itu lolos ke data lalu membuat filter dan
 * pengelompokan menghasilkan bulan yang tidak pernah ada.
 */
function isRealMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;

  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

/**
 * Skema zod untuk tanggal yang benar-benar ada.
 *
 * Dibuat sebagai skema, bukan pemeriksaan tambahan, supaya tidak bisa
 * terlewat: setiap field yang memakai `zRealDate` otomatis memvalidasi
 * bentuk **dan** keberadaan tanggalnya. Sebelumnya `isRealDate()` hanya
 * dipakai di 2 dari 7 tempat, sehingga "2026-02-30" lolos di lima tempat
 * lain.
 */
const zRealDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")
  .refine(isRealDate, "Tanggal itu tidak ada di kalender.");


/** Pesan seragam saat sesi berakhir di tengah aksi. */
const NO_SCOPE = "Sesi berakhir. Silakan masuk lagi.";

/**
 * Membaca angka dari FormData dengan aman.
 *
 * `Number("abc")` menghasilkan `NaN`, dan **semua perbandingan dengan `NaN`
 * bernilai false** — termasuk `NaN <= 0` dan `NaN < 0`. Akibatnya penjagaan
 * seperti `if (amount <= 0) return fail(...)` meloloskan `NaN`, lalu nilai itu
 * tersimpan dan merusak data secara permanen (`savedAmount` menjadi `NaN`,
 * lalu seluruh perhitungan kekayaan bersih ikut rusak).
 *
 * Mengembalikan `null` bila isian bukan angka berhingga, sehingga pemanggil
 * wajib menanganinya.
 */
function parseAmount(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const raw = String(value).trim();
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Varian yang langsung memberi hasil siap pakai beserta pesan kesalahannya. */function requireAmount(
  formData: FormData,
  field: string,
  label: string,
  { min = 0, allowZero = true }: { min?: number; allowZero?: boolean } = {},
): { value: number } | { error: string } {
  const parsed = parseAmount(formData.get(field));

  if (parsed === null) {
    return { error: `${label} harus berupa angka.` };
  }
  if (!allowZero && parsed === 0) {
    return { error: `${label} harus lebih dari nol.` };
  }
  if (parsed < min) {
    return { error: `${label} tidak boleh kurang dari ${min}.` };
  }

  return { value: parsed };
}

/**
 * Memvalidasi tujuan pengalihan setelah masuk.
 *
 * Implementasinya ada di `@/lib/safe-path` supaya halaman juga bisa memakainya
 * — `pilih-profil` melakukan redirect berdasarkan parameter yang sama, dan
 * sebelumnya memakai pemeriksaan yang lebih lemah (open redirect).
 */
function safeNextPath(next: string | undefined): string {
  return safeNextPathShared(next);
}

/**
 * Mencari entitas **di dalam ruang aktif saja**.
 *
 * Aksi ubah/hapus wajib memakai ini. Tanpa filter ruang, siapa pun yang tahu
 * sebuah id bisa mengubah data milik ruang lain — termasuk ruang pribadi orang
 * lain di akun yang sama.
 */
function findScoped<T extends { id: string; workspaceId?: string }>(
  rows: T[],
  id: string,
  workspaceId: string,
): T | undefined {
  return rows.find((row) => row.id === id && row.workspaceId === workspaceId);
}

/**
 * Memeriksa bahwa id yang dirujuk memang ada **di ruang yang sama**.
 *
 * Tanpa ini, sebuah transaksi bisa merujuk akun atau kategori milik ruang lain
 * hanya dengan mengirim id-nya lewat form. Datanya tetap tersimpan, lalu
 * muncul sebagai baris tanpa nama di ruang pemiliknya — dan lebih buruk, saldo
 * ruang lain ikut terpakai.
 *
 * Mengembalikan pesan kesalahan, atau `null` bila semua rujukan sah.
 */
function invalidReference(
  store: ReturnType<typeof getStore>,
  workspaceId: string,
  refs: {
    accountId?: string;
    toAccountId?: string;
    categoryId?: string;
    memberId?: string;
    goalId?: string;
    billId?: string;
  },
): string | null {
  const check = (
    id: string | undefined,
    rows: Array<{ id: string; workspaceId?: string }>,
    label: string,
  ) => {
    if (!id) return null;
    return findScoped(rows, id, workspaceId) ? null : `${label} tidak ditemukan di ruang ini.`;
  };

  /*
   * Anggota keluarga bersifat household-wide, bukan per ruang: `store.members`
   * tidak punya `workspaceId`. Memeriksanya lewat `findScoped` akan SELALU
   * gagal, sehingga fitur "tujuan untuk anak" dan "tugas untuk anggota" tidak
   * bisa dipakai sama sekali. Untuk anggota, cukup diperiksa keberadaannya.
   */
  const memberError =
    refs.memberId && !store.members.some((member) => member.id === refs.memberId)
      ? "Anggota tidak ditemukan."
      : null;

  return (
    memberError ??
    check(refs.accountId, store.accounts, "Akun") ??
    check(refs.toAccountId, store.accounts, "Akun tujuan") ??
    check(refs.categoryId, store.categories, "Kategori") ??
    check(refs.goalId, store.goals, "Tujuan") ??
    check(refs.billId, store.bills, "Tagihan")
  );
}

function revalidateApp() {
  // Simpan ke berkas dulu, baru segarkan cache halaman.
  saveStore();
  revalidatePath("/keluarga");
  revalidatePath("/keluarga/keuangan");
  revalidatePath("/keluarga/keuangan/transaksi");
  revalidatePath("/keluarga/keuangan/akun");
  revalidatePath("/keluarga/keuangan/kategori");
  revalidatePath("/keluarga/keuangan/anggaran");
  revalidatePath("/keluarga/keuangan/tagihan");
  revalidatePath("/keluarga/keuangan/utang");
  revalidatePath("/keluarga/keuangan/aset");
  revalidatePath("/keluarga/rencana");
  revalidatePath("/keluarga/kalender");
  revalidatePath("/keluarga/tugas");
  revalidatePath("/keluarga/belanja");
  revalidatePath("/keluarga/anggota");
  revalidatePath("/keluarga/dokumen");
  revalidatePath("/keluarga/kesehatan");
  revalidatePath("/keluarga/pendidikan");
  revalidatePath("/keluarga/laporan");
  revalidatePath("/keluarga/pengaturan");
}

/* ---------------------------------- auth ---------------------------------- */

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/keluarga");

  if (!email || !password) {
    return fail("Email dan kata sandi wajib diisi.");
  }

  /*
   * Dikunci per email, bukan per IP: penyerang bisa berpindah IP dengan mudah,
   * sedangkan akun yang diserang tetap sama. Email dinormalkan agar
   * "Irvan@..." dan "irvan@..." tidak membuka kuota baru.
   */
  const identity = email.toLowerCase();
  const limit = checkRateLimit(LOGIN_RULE, identity);
  if (!limit.allowed) {
    return fail(
      `Terlalu banyak percobaan masuk. Coba lagi dalam ${humanizeRetry(limit.retryAfterMs)}.`,
    );
  }

  const session = authenticate(email, password);
  if (!session) {
    const after = recordFailure(LOGIN_RULE, identity);
    if (!after.allowed) {
      return fail(
        `Terlalu banyak percobaan masuk. Akun dikunci sementara, coba lagi dalam ${humanizeRetry(after.retryAfterMs)}.`,
      );
    }
    return fail(
      `Email atau kata sandi belum tepat. Sisa ${after.remaining} percobaan sebelum dikunci sementara.`,
    );
  }

  // Berhasil: kuota dibersihkan agar percobaan sah berikutnya tidak terhukum.
  resetRateLimit(LOGIN_RULE, identity);

  // Tahap 1 selesai. Profil dipilih di layar berikutnya.
  await createSession(session);
  redirect(`/pilih-profil?next=${encodeURIComponent(safeNextPath(next))}`);
}

/**
 * Memilih profil lalu membuka workspace awal.
 *
 * PIN diverifikasi di server terhadap profil milik akun yang sedang masuk,
 * sehingga profil orang lain tidak bisa dibuka hanya dengan menebak id.
 */
export async function selectProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await getAccountSession();
  if (!session) return fail("Sesi berakhir. Silakan masuk lagi.");

  const profileId = String(formData.get("profileId") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  const next = String(formData.get("next") ?? "");

  /*
   * Pemilik profil diperiksa LEBIH DULU, sebelum kuota PIN disentuh.
   *
   * Kalau urutannya dibalik, siapa pun yang punya akun bisa mengunci PIN profil
   * milik akun lain hanya dengan mengirim `profileId` orang itu dan PIN salah
   * berulang kali — penghuni sahnya lalu terkunci 10 menit. Itu DoS lintas akun.
   */
  const owned = profilesForAccount(session.userId).find(
    (item) => item.id === profileId,
  );
  if (!owned) {
    return fail("Profil tidak ditemukan pada akun ini.");
  }

  /*
   * Dikunci per profil. PIN hanya 4–6 angka, jadi tanpa batas percobaan ia bisa
   * ditebak dalam hitungan menit — jauh lebih cepat daripada kata sandi.
   */
  const limit = checkRateLimit(PIN_RULE, profileId);
  if (!limit.allowed) {
    return fail(
      `Terlalu banyak percobaan PIN. Coba lagi dalam ${humanizeRetry(limit.retryAfterMs)}.`,
    );
  }

  const profile = unlockProfile(session.userId, profileId, pin);
  if (!profile) {
    const after = recordFailure(PIN_RULE, profileId);
    if (!after.allowed) {
      return fail(
        `Terlalu banyak percobaan PIN. Profil dikunci sementara, coba lagi dalam ${humanizeRetry(after.retryAfterMs)}.`,
      );
    }
    return fail(
      `PIN belum tepat. Sisa ${after.remaining} percobaan sebelum dikunci sementara.`,
    );
  }

  resetRateLimit(PIN_RULE, profileId);

  const workspaceId = defaultWorkspaceFor(profile.id);
  if (!workspaceId) {
    return fail("Profil ini belum punya ruang data.");
  }

  await createSession({
    userId: session.userId,
    email: session.email,
    name: profile.name,
    role: profile.role,
    stage: "active",
    profileId: profile.id,
    workspaceId,
  });

  redirect(safeNextPath(next));
}

/** Berpindah profil tanpa keluar dari akun. */
/**
 * Menetapkan PIN baru setelah pengguna lupa PIN-nya.
 *
 * ## Kenapa perlu kata sandi akun
 *
 * PIN melindungi privasi antar anggota keluarga — bukan rahasia dari pemilik
 * akun. Pemilik akun yang lupa PIN harus bisa memulihkan akses ke datanya
 * sendiri; tanpa jalur ini, data terkunci selamanya dan aplikasi jadi tidak
 * bisa dipakai.
 *
 * Tetapi jalur ini **tidak** boleh menjadi cara melewati PIN. Karena itu:
 *
 * - wajib sudah masuk sebagai pemilik akun (`requireAccountSession`),
 * - wajib memasukkan kata sandi akun — bukan hanya klik,
 * - profil harus milik akun ini,
 * - percobaan dibatasi per akun, supaya kata sandi tidak bisa ditebak lewat
 *   jalur ini.
 *
 * ## Kenapa PIN lama tidak diminta
 *
 * Justru karena pengguna lupa PIN-nya. Meminta PIN lama akan membuat fitur ini
 * tidak berguna.
 */
export async function resetProfilePin(formData: FormData): Promise<ActionResult> {
  const session = await requireAccountSession();

  const profileId = String(formData.get("profileId") ?? "");
  const password = String(formData.get("password") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirmPin") ?? "");

  /*
   * Profil diperiksa lebih dulu, sebelum kuota disentuh.
   *
   * Urutan ini penting: kalau dibalik, siapa pun yang punya akun bisa
   * mengunci jalur pemulihan milik akun lain dengan mengirim `profileId` orang
   * itu berulang kali.
   */
  const owned = profilesForAccount(session.userId).find(
    (item) => item.id === profileId,
  );
  if (!owned) return fail("Profil tidak ditemukan pada akun ini.");

  if (!/^\d{4,6}$/.test(pin)) {
    return fail("PIN harus 4–6 angka.", { pin: "4–6 angka." });
  }

  if (pin !== confirm) {
    return fail("Konfirmasi PIN tidak sama.", { confirmPin: "Tidak sama." });
  }

  /*
   * Kata sandi diperiksa dengan pembatas yang sama seperti login.
   *
   * Tanpa ini, jalur pemulihan menjadi cara menebak kata sandi tanpa terkena
   * batas login — pintu belakang yang tidak diinginkan.
   */
  const limit = checkRateLimit(LOGIN_RULE, session.email);
  if (!limit.allowed) {
    return fail(
      `Terlalu banyak percobaan. Coba lagi dalam ${humanizeRetry(limit.retryAfterMs)}.`,
    );
  }

  /*
   * Memakai `authenticate` yang sama dengan halaman login, bukan pemeriksaan
   * terpisah — supaya aturan verifikasi kata sandi hanya ada di satu tempat.
   */
  const verified = authenticate(session.email, password);
  if (!verified) {
    const after = recordFailure(LOGIN_RULE, session.email);
    return fail(
      after.allowed
        ? `Kata sandi belum tepat. Sisa ${after.remaining} percobaan.`
        : `Terlalu banyak percobaan. Coba lagi dalam ${humanizeRetry(after.retryAfterMs)}.`,
    );
  }

  resetRateLimit(LOGIN_RULE, session.email);

  const profile = getStore().profiles.find((item) => item.id === profileId);
  if (!profile) return fail("Profil tidak ditemukan.");

  profile.pinHash = hashPin(pin);

  /*
   * Hitungan percobaan PIN profil ini direset.
   *
   * Kalau tidak, pengguna yang baru saja memulihkan akses bisa langsung
   * terkunci lagi oleh sisa hitungan sebelum reset — membingungkan dan
   * membuat fitur ini tampak tidak bekerja.
   */
  resetRateLimit(PIN_RULE, profileId);

  revalidateApp();
  return { ok: true, message: `PIN ${profile.name} berhasil diperbarui.` };
}
export async function switchProfileAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await createSession({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    stage: "profile",
  });
  redirect("/pilih-profil");
}

/** Berpindah workspace aktif. */
export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const session = await requireActiveSession();
  const workspaceId = String(formData.get("workspaceId") ?? "");

  if (!session.profileId || !canOpenWorkspace(session.profileId, workspaceId)) {
    redirect("/keluarga");
  }

  await createSession({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    stage: "active",
    profileId: session.profileId,
    workspaceId,
  });
  revalidatePath("/keluarga");
  redirect("/keluarga");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

/* --------------------------- workspace bersama ----------------------------- */

/**
 * Membuat workspace bersama.
 *
 * Workspace bersama memungkinkan dua profil (mis. suami dan istri) bekerja di
 * satu ruang data, dengan setiap transaksi tetap tercatat siapa yang
 * mencatatnya.
 *
 * Batas `MAX_SHARED_WORKSPACES` ditegakkan di sini, bukan hanya di UI — janji
 * lisensi "maksimal 2 workspace bersama" harus berlaku juga bagi permintaan
 * yang dibuat tangan.
 */
export async function createSharedWorkspace(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireActiveSession();
  const profileId = session.profileId;
  if (!profileId) return fail("Pilih profil dulu.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Nama ruang wajib diisi.", { name: "Nama wajib diisi." });
  if (name.length > 60) {
    return fail("Nama ruang maksimal 60 karakter.", { name: "Terlalu panjang." });
  }

  const store = getStore();

  /*
   * Nama ganda diperiksa LEBIH DULU daripada batas jumlah.
   *
   * Urutan ini penting untuk pesan yang berguna: pengguna yang memakai nama
   * sama perlu tahu "nama itu sudah dipakai", bukan "kuota habis" — kuota
   * bukan masalahnya. Nama ganda juga membingungkan saat berpindah ruang.
   */
  const duplicate = sharedWorkspacesOf(profileId).some(
    (workspace) => workspace.name.toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) {
    return fail("Nama ruang itu sudah dipakai.", { name: "Nama sudah dipakai." });
  }

  if (!canCreateSharedWorkspace(profileId)) {
    return fail(
      `Maksimal ${MAX_SHARED_WORKSPACES} ruang bersama per profil. Keluar dari salah satu dulu.`,
    );
  }

  const workspace: Workspace = {
    id: newId("ws"),
    name,
    type: "shared",
    ownerProfileId: profileId,
    inviteCode: randomCode(6),
    color: "sky",
    createdAt: todayISO(),
  };

  store.workspaces.push(workspace);
  store.workspaceMembers.push({
    workspaceId: workspace.id,
    profileId,
    role: "owner",
    joinedAt: new Date().toISOString(),
  });

  revalidateApp();
  return {
    ok: true,
    message: `Ruang "${name}" dibuat. Kode undangan: ${workspace.inviteCode}`,
  };
}

/**
 * Bergabung ke workspace bersama lewat kode undangan.
 *
 * Aturan yang dijaga:
 * - kode harus cocok dengan workspace bersama yang ada
 * - tidak bisa bergabung ke workspace yang sudah diikuti
 * - tidak bisa bergabung ke workspace sendiri
 * - batas `MAX_SHARED_WORKSPACES` berlaku juga untuk yang bergabung
 */
export async function joinSharedWorkspace(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireActiveSession();
  const profileId = session.profileId;
  if (!profileId) return fail("Pilih profil dulu.");

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return fail("Kode undangan wajib diisi.", { code: "Kode wajib diisi." });

  const workspace = findWorkspaceByInviteCode(code);
  if (!workspace) {
    return fail("Kode undangan tidak dikenal.", { code: "Kode tidak ditemukan." });
  }

  /*
   * Kepemilikan diperiksa SEBELUM keanggotaan.
   *
   * Pemilik selalu menjadi anggota ruangnya, jadi pemeriksaan keanggotaan akan
   * selalu menangkap kasus ini lebih dulu dan memberi pesan "sudah tergabung" —
   * padahal yang sebenarnya terjadi adalah "ini ruang Anda sendiri". Pesan
   * pertama menyesatkan.
   */
  if (workspace.ownerProfileId === profileId) {
    return fail("Ini ruang milik Anda sendiri.");
  }

  if (isWorkspaceMember(workspace.id, profileId)) {
    return fail("Anda sudah tergabung di ruang ini.");
  }

  if (!canCreateSharedWorkspace(profileId)) {
    return fail(
      `Maksimal ${MAX_SHARED_WORKSPACES} ruang bersama per profil. Keluar dari salah satu dulu.`,
    );
  }

  getStore().workspaceMembers.push({
    workspaceId: workspace.id,
    profileId,
    role: "editor",
    joinedAt: new Date().toISOString(),
  });

  revalidateApp();
  return { ok: true, message: `Bergabung ke ruang "${workspace.name}".` };
}

/**
 * Keluar dari workspace bersama.
 *
 * Pemilik tidak bisa keluar — ia harus menghapus ruangnya. Tanpa aturan ini,
 * ruang bisa kehilangan pemilik dan tidak ada yang bisa mengelolanya lagi.
 */
export async function leaveSharedWorkspace(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireActiveSession();
  const profileId = session.profileId;
  if (!profileId) return fail("Pilih profil dulu.");

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const store = getStore();
  const workspace = workspaceById(workspaceId);

  if (!workspace || workspace.type !== "shared") {
    return fail("Ruang bersama tidak ditemukan.");
  }
  if (!isWorkspaceMember(workspaceId, profileId)) {
    return fail("Anda bukan anggota ruang ini.");
  }
  if (workspace.ownerProfileId === profileId) {
    return fail("Pemilik tidak bisa keluar dari ruangnya sendiri.");
  }

  store.workspaceMembers = store.workspaceMembers.filter(
    (member) =>
      !(member.workspaceId === workspaceId && member.profileId === profileId),
  );

  /*
   * Bila profil yang keluar sedang memakai ruang ini, kembalikan ke ruang
   * pribadinya. Tanpa ini, sesi menunjuk ruang yang bukan miliknya lagi dan
   * setiap halaman menampilkan data kosong.
   */
  if (session.workspaceId === workspaceId) {
    const personal = personalWorkspaceOf(profileId);
    if (personal) {
      await createSession({
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        stage: "active",
        profileId,
        workspaceId: personal.id,
      });
    }
  }

  revalidateApp();
  return { ok: true, message: `Keluar dari ruang "${workspace.name}".` };
}

/* ------------------------------- transactions ------------------------------ */

const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.number().int().positive("Jumlah harus lebih dari nol."),
    occurredAt: zRealDate,
    description: z.string().trim().min(1, "Deskripsi wajib diisi.").max(200),
    accountId: z.string().min(1, "Pilih akun."),
    toAccountId: z.string().optional(),
    categoryId: z.string().optional(),
    memberId: z.string().optional(),
    visibility: z.enum(["household", "shared", "private"]),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Pilih akun tujuan.",
        });
      } else if (data.toAccountId === data.accountId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Akun tujuan harus berbeda.",
        });
      }
    } else if (!data.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Pilih kategori.",
      });
    }
  });

/* --------------------------- transaksi berulang ---------------------------- */

const recurringSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().int().positive("Jumlah harus lebih dari nol."),
  description: z.string().trim().min(1, "Deskripsi wajib diisi.").max(200),
  accountId: z.string().min(1, "Pilih akun."),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  visibility: z.enum(["household", "shared", "private"]),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  startAt: zRealDate,
  endAt: zRealDate.optional(),
});

/**
 * Membuat aturan transaksi berulang.
 *
 * Aturan **tidak** langsung membuat transaksi. Transaksi sungguhan dibuat saat
 * jadwalnya tiba (lihat `runDueRecurring`), supaya saldo hari ini tidak
 * terlihat minus karena transaksi yang belum terjadi.
 */
export async function createRecurringRule(
  formData: FormData,
): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const parsed = recurringSchema.safeParse({
    type: String(formData.get("type") ?? "expense"),
    amount: Number(formData.get("amount") ?? 0),
    description: String(formData.get("description") ?? ""),
    accountId: String(formData.get("accountId") ?? ""),
    toAccountId: String(formData.get("toAccountId") ?? "") || undefined,
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    memberId: String(formData.get("memberId") ?? "") || undefined,
    visibility: String(formData.get("visibility") ?? "household"),
    frequency: String(formData.get("frequency") ?? "monthly"),
    startAt: String(formData.get("startAt") ?? ""),
    endAt: String(formData.get("endAt") ?? "") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("Periksa kembali isian aturan berulang.", fieldErrors);
  }

  const data = parsed.data;
  const store = getStore();

  const referenceError = invalidReference(store, scope.workspaceId, {
    accountId: data.accountId,
    toAccountId: data.type === "transfer" ? data.toAccountId : undefined,
    categoryId: data.type === "transfer" ? undefined : data.categoryId,
    memberId: data.memberId,
  });
  if (referenceError) return fail(referenceError);

  if (data.type === "transfer" && !data.toAccountId) {
    return fail("Pilih akun tujuan.", { toAccountId: "Wajib dipilih." });
  }
  if (data.type !== "transfer" && !data.categoryId) {
    return fail("Pilih kategori.", { categoryId: "Wajib dipilih." });
  }

  if (data.endAt && data.endAt < data.startAt) {
    return fail("Tanggal berakhir tidak boleh sebelum tanggal mulai.", {
      endAt: "Harus setelah tanggal mulai.",
    });
  }

  store.recurringRules.push({
    id: newId("rr"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    type: data.type,
    amount: data.amount,
    description: data.description,
    accountId: data.accountId,
    toAccountId: data.type === "transfer" ? data.toAccountId : undefined,
    categoryId: data.type === "transfer" ? undefined : data.categoryId,
    memberId: data.memberId,
    visibility: data.visibility as Visibility,
    frequency: data.frequency,
    startAt: data.startAt,
    nextAt: data.startAt,
    endAt: data.endAt,
    active: true,
    createdAt: new Date().toISOString(),
  });

  revalidateApp();
  return { ok: true, message: "Aturan berulang dibuat." };
}

/** Mematikan atau mengaktifkan aturan tanpa menghapusnya. */
export async function toggleRecurringRule(
  formData: FormData,
): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const id = String(formData.get("id") ?? "");
  const rule = findScoped(getStore().recurringRules, id, scope.workspaceId);
  if (!rule) return fail("Aturan tidak ditemukan.");

  rule.active = !rule.active;
  revalidateApp();

  return {
    ok: true,
    message: rule.active ? "Aturan diaktifkan." : "Aturan dimatikan.",
  };
}

/** Menghapus aturan. Transaksi yang sudah dibuat tidak ikut terhapus. */
export async function deleteRecurringRule(
  formData: FormData,
): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.recurringRules, id, scope.workspaceId)) {
    return fail("Aturan tidak ditemukan.");
  }

  store.recurringRules = store.recurringRules.filter(
    (rule) => !(rule.id === id && rule.workspaceId === scope.workspaceId),
  );

  revalidateApp();
  return { ok: true, message: "Aturan dihapus." };
}

/**
 * Membuat transaksi untuk semua aturan yang sudah jatuh tempo.
 *
 * Aman dipanggil berkali-kali: `nextAt` dimajukan setiap kali transaksi dibuat,
 * jadi panggilan kedua pada hari yang sama tidak menghasilkan duplikat.
 *
 * Dipanggil dari dashboard setiap kali halaman dibuka — cara paling sederhana
 * yang tidak memerlukan penjadwal eksternal. Untuk aplikasi keluarga dengan
 * satu instance, ini cukup.
 */
export async function runDueRecurring(): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const store = getStore();
  const created = applyDueRules(
    {
      recurringRules: store.recurringRules,
      transactions: store.transactions as unknown as Array<Record<string, unknown>>,
      accounts: store.accounts,
      categories: store.categories,
    },
    scope.workspaceId,
    todayISO(),
    newId,
  );

  if (created === 0) {
    return { ok: true, message: "Tidak ada transaksi berulang yang jatuh tempo." };
  }

  revalidateApp();
  return { ok: true, message: `${created} transaksi berulang dibuat.` };
}
export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const raw = {
    type: String(formData.get("type") ?? "expense"),
    amount: Number(formData.get("amount") ?? 0),
    occurredAt: String(formData.get("occurredAt") ?? todayISO()),
    description: String(formData.get("description") ?? ""),
    accountId: String(formData.get("accountId") ?? ""),
    toAccountId: String(formData.get("toAccountId") ?? "") || undefined,
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    memberId: String(formData.get("memberId") ?? "") || undefined,
    visibility: String(formData.get("visibility") ?? "household"),
  };

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("Periksa kembali isian transaksi.", fieldErrors);
  }

  const data = parsed.data;
  const store = getStore();

  // Semua rujukan harus berada di ruang yang sama.
  const referenceError = invalidReference(store, scope.workspaceId, {
    accountId: data.accountId,
    toAccountId: data.type === "transfer" ? data.toAccountId : undefined,
    categoryId: data.type === "transfer" ? undefined : data.categoryId,
    memberId: data.memberId,
  });
  if (referenceError) return fail(referenceError);

  // Kategori harus sejenis dengan transaksinya. Tanpa ini, pengeluaran bisa
  // tercatat memakai kategori pemasukan dan laporan jadi menyesatkan.
  if (data.type !== "transfer" && data.categoryId) {
    const category = findScoped(store.categories, data.categoryId, scope.workspaceId);
    if (category?.archived) {
      return fail("Kategori itu sudah diarsipkan. Pilih kategori aktif.", {
        categoryId: "Kategori sudah diarsipkan.",
      });
    }
    if (category && category.kind !== data.type) {
      return fail(
        `Kategori "${category.name}" untuk ${
          category.kind === "income" ? "pemasukan" : "pengeluaran"
        }, bukan ${data.type === "income" ? "pemasukan" : "pengeluaran"}.`,
        { categoryId: "Kategori tidak sesuai jenis transaksi." },
      );
    }
  }

  store.transactions.push({
    id: newId("t"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    type: data.type,
    amount: data.amount,
    occurredAt: data.occurredAt,
    description: data.description,
    accountId: data.accountId,
    toAccountId: data.type === "transfer" ? data.toAccountId : undefined,
    categoryId: data.type === "transfer" ? undefined : data.categoryId,
    memberId: data.memberId,
    visibility: data.visibility as Visibility,
  });

  revalidateApp();
  return { ok: true, message: "Transaksi tersimpan." };
}

/**
 * Menyunting transaksi yang sudah ada.
 *
 * Sebelumnya satu-satunya cara memperbaiki salah catat adalah membatalkan lalu
 * mencatat ulang — meninggalkan dua baris di riwayat untuk satu kejadian.
 *
 * Aturan:
 * - transaksi yang sudah dibatalkan tidak bisa disunting (jejak audit dijaga)
 * - validasi sama ketatnya dengan `createTransaction`
 * - pencatat asli (`recordedByProfileId`) **tidak** diubah, meskipun yang
 *   menyunting orang lain — supaya tetap jelas siapa yang pertama mencatat
 */
export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const existing = findScoped(store.transactions, id, scope.workspaceId);
  if (!existing) return fail("Transaksi tidak ditemukan.");
  if (existing.voidedAt) {
    return fail("Transaksi yang sudah dibatalkan tidak bisa disunting.");
  }

  const raw = {
    type: String(formData.get("type") ?? "expense"),
    amount: Number(formData.get("amount") ?? 0),
    occurredAt: String(formData.get("occurredAt") ?? todayISO()),
    description: String(formData.get("description") ?? ""),
    accountId: String(formData.get("accountId") ?? ""),
    toAccountId: String(formData.get("toAccountId") ?? "") || undefined,
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    memberId: String(formData.get("memberId") ?? "") || undefined,
    visibility: String(formData.get("visibility") ?? "household"),
  };

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("Periksa kembali isian transaksi.", fieldErrors);
  }

  const data = parsed.data;

  const referenceError = invalidReference(store, scope.workspaceId, {
    accountId: data.accountId,
    toAccountId: data.type === "transfer" ? data.toAccountId : undefined,
    categoryId: data.type === "transfer" ? undefined : data.categoryId,
    memberId: data.memberId,
  });
  if (referenceError) return fail(referenceError);

  if (data.type !== "transfer" && data.categoryId) {
    const category = findScoped(store.categories, data.categoryId, scope.workspaceId);
    if (category?.archived) {
      return fail("Kategori itu sudah diarsipkan. Pilih kategori aktif.", {
        categoryId: "Kategori sudah diarsipkan.",
      });
    }
    if (category && category.kind !== data.type) {
      return fail(
        `Kategori "${category.name}" untuk ${
          category.kind === "income" ? "pemasukan" : "pengeluaran"
        }, bukan ${data.type === "income" ? "pemasukan" : "pengeluaran"}.`,
        { categoryId: "Kategori tidak sesuai jenis transaksi." },
      );
    }
  }

  existing.type = data.type;
  existing.amount = data.amount;
  existing.occurredAt = data.occurredAt;
  existing.description = data.description;
  existing.accountId = data.accountId;
  existing.toAccountId = data.type === "transfer" ? data.toAccountId : undefined;
  existing.categoryId = data.type === "transfer" ? undefined : data.categoryId;
  existing.memberId = data.memberId;
  existing.visibility = data.visibility as Visibility;

  revalidateApp();
  return { ok: true, message: "Perubahan transaksi tersimpan." };
}

/**
 * Melampirkan foto struk ke transaksi.
 *
 * Berkas diunggah browser langsung ke Object Storage (lihat
 * `/api/dokumen`); aksi ini hanya mencatat kuncinya. Kunci wajib diawali
 * `workspaceId/` supaya ruang lain tidak bisa menautkan berkasnya.
 */
export async function attachTransactionPhoto(
  formData: FormData,
): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const id = String(formData.get("id") ?? "");
  const key = String(formData.get("key") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();

  const tx = findScoped(getStore().transactions, id, scope.workspaceId);
  if (!tx) return fail("Transaksi tidak ditemukan.");

  if (!key.startsWith(`${scope.workspaceId}/`) || key.includes("..")) {
    return fail("Berkas tidak sah.");
  }

  // Berkas lama dihapus agar tidak ada objek yatim saat diganti.
  if (tx.attachmentKey && tx.attachmentKey !== key) {
    const { deleteObject } = await import("@/lib/storage/neon-storage");
    await deleteObject(tx.attachmentKey);
  }

  tx.attachmentKey = key;
  tx.attachmentName = fileName || undefined;

  revalidateApp();
  return { ok: true, message: "Foto terlampir." };
}

/** Melepas lampiran tanpa menghapus transaksinya. */
export async function detachTransactionPhoto(
  formData: FormData,
): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const id = String(formData.get("id") ?? "");
  const tx = findScoped(getStore().transactions, id, scope.workspaceId);
  if (!tx) return fail("Transaksi tidak ditemukan.");
  if (!tx.attachmentKey) return fail("Transaksi ini belum punya lampiran.");

  const { deleteObject } = await import("@/lib/storage/neon-storage");
  await deleteObject(tx.attachmentKey);

  tx.attachmentKey = undefined;
  tx.attachmentName = undefined;

  revalidateApp();
  return { ok: true, message: "Lampiran dilepas." };
}
export async function voidTransaction(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const tx = findScoped(store.transactions, id, scope.workspaceId);
  if (!tx) return fail("Transaksi tidak ditemukan.");
  // Jangan timpa: waktu pembatalan pertama adalah bagian dari jejak audit.
  if (tx.voidedAt) return fail("Transaksi ini sudah dibatalkan.");
  tx.voidedAt = new Date().toISOString();
  revalidateApp();
  return { ok: true, message: "Transaksi dibatalkan." };
}

/**
 * Mengembalikan transaksi yang sudah dibatalkan.
 *
 * Membatalkan salah pencatatan seharusnya tidak permanen — pengguna sering
 * menekan "Batalkan" pada baris yang salah. Tanpa jalur kembali, satu salah
 * klik memaksa mencatat ulang dan meninggalkan jejak yang membingungkan.
 *
 * Jejak audit tetap dijaga: `voidedAt` hanya dihapus, bukan ditimpa, dan
 * pemulihan tidak mengubah `recordedByProfileId`.
 */
export async function restoreTransaction(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const tx = findScoped(store.transactions, id, scope.workspaceId);
  if (!tx) return fail("Transaksi tidak ditemukan.");
  if (!tx.voidedAt) return fail("Transaksi ini tidak sedang dibatalkan.");

  tx.voidedAt = undefined;
  revalidateApp();
  return { ok: true, message: "Transaksi dikembalikan." };
}

/* --------------------------------- accounts -------------------------------- */

const accountSchema = z.object({
  name: z.string().trim().min(1, "Nama akun wajib diisi.").max(100),
  type: z.enum(["cash", "bank", "ewallet", "savings"]),
  openingBalance: z.number().int().min(0, "Saldo awal tidak boleh negatif."),
  ownerMemberId: z.string().optional(),
  color: z.string().default("butter"),
});

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = accountSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "bank"),
    openingBalance: Number(formData.get("openingBalance") ?? 0),
    ownerMemberId: String(formData.get("ownerMemberId") ?? "") || undefined,
    color: String(formData.get("color") ?? "butter"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  {
    const store = getStore();
    const referenceError = invalidReference(store, scope.workspaceId, {
      memberId: parsed.data.ownerMemberId,
    });
    if (referenceError) return fail(referenceError);
  }

  getStore().accounts.push({
    id: newId("a"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    ...parsed.data,
    isShared: true,
    archived: false,
  });
  revalidateApp();
  return { ok: true, message: "Akun ditambahkan." };
}

export async function archiveAccount(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const account = findScoped(store.accounts, id, scope.workspaceId);
  if (!account) return fail("Akun tidak ditemukan.");

  const used = store.transactions.some(
    (t) => t.accountId === id || t.toAccountId === id,
  );
  if (used) {
    return fail("Akun sudah punya transaksi. Arsipkan lewat pengaturan, bukan hapus.");
  }

  /*
   * Aturan berulang juga merujuk akun.
   *
   * Tanpa pemeriksaan ini, akun bisa diarsipkan padahal aturan masih
   * memakainya. Aturan itu lalu membuat transaksi yang merujuk akun terarsip —
   * transaksi tersebut tidak masuk hitungan saldo mana pun dan muncul tanpa
   * nama akun di daftar.
   */
  const usedByRule = store.recurringRules.some(
    (rule) =>
      rule.workspaceId === scope.workspaceId &&
      rule.active &&
      (rule.accountId === id || rule.toAccountId === id),
  );
  if (usedByRule) {
    return fail(
      "Akun ini masih dipakai aturan berulang. Matikan atau ubah aturannya dulu.",
    );
  }

  account.archived = true;
  revalidateApp();
  return { ok: true, message: "Akun diarsipkan." };
}

/* -------------------------------- categories ------------------------------- */

const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi.").max(80),
  kind: z.enum(["income", "expense"]),
  color: z.string().default("butter"),
});

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = categorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? "expense"),
    color: String(formData.get("color") ?? "butter"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  const store = getStore();
  // Duplikat diperiksa per ruang, bukan seluruh store: ruang pribadi orang lain
  // tidak boleh menghalangi nama kategori di ruang ini.
  const duplicate = store.categories.some(
    (c) =>
      c.workspaceId === scope.workspaceId &&
      !c.archived &&
      c.kind === parsed.data.kind &&
      c.name.toLowerCase() === parsed.data.name.toLowerCase(),
  );
  if (duplicate) return fail("Kategori dengan nama itu sudah ada.");
  store.categories.push({
    id: newId("c"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    ...parsed.data,
    archived: false,
  });
  revalidateApp();
  return { ok: true, message: "Kategori ditambahkan." };
}

export async function archiveCategory(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const category = findScoped(store.categories, id, scope.workspaceId);
  if (!category) return fail("Kategori tidak ditemukan.");

  /*
   * Sama seperti akun: aturan berulang juga merujuk kategori. Mengarsipkan
   * kategori yang masih dipakai aturan akan menghasilkan transaksi tanpa
   * kategori — laporan per kategori jadi tidak lengkap.
   */
  const usedByRule = store.recurringRules.some(
    (rule) =>
      rule.workspaceId === scope.workspaceId &&
      rule.active &&
      rule.categoryId === id,
  );
  if (usedByRule) {
    return fail(
      "Kategori ini masih dipakai aturan berulang. Matikan atau ubah aturannya dulu.",
    );
  }

  category.archived = true;
  revalidateApp();
  return { ok: true, message: "Kategori diarsipkan." };
}

/* --------------------------------- budgets -------------------------------- */

export async function setBudget(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const categoryId = String(formData.get("categoryId") ?? "");
  const month = String(formData.get("month") ?? "");
  const amount = Number(formData.get("amount") ?? 0);

  if (!categoryId) return fail("Pilih kategori.");

  /*
   * `isRealMonth`, bukan hanya regex.
   *
   * `/^\d{4}-\d{2}$/` menerima "2026-13" dan "2026-00" — bulan yang tidak
   * pernah ada. Anggaran seperti itu tidak akan pernah muncul di halaman
   * bulan mana pun, jadi pengguna menyimpan sesuatu yang tidak terlihat.
   */
  if (!isRealMonth(month)) return fail("Bulan tidak valid.");

  /*
   * `Number.isFinite`, bukan `amount < 0`.
   *
   * `Number("banyak")` menghasilkan `NaN`, dan `NaN < 0` bernilai **false**
   * sehingga lolos pemeriksaan. Nilai `NaN` lalu tersimpan sebagai anggaran
   * dan membuat total anggaran menjadi `NaN` di seluruh halaman.
   */
  if (!Number.isFinite(amount)) return fail("Jumlah anggaran harus berupa angka.");
  if (amount < 0) return fail("Anggaran tidak boleh negatif.");

  const store = getStore();
  // Kategori harus ada di ruang ini. Tanpa pemeriksaan, anggaran bisa merujuk
  // kategori ruang lain atau id hantu, lalu muncul sebagai baris tanpa nama.
  const categoryError = invalidReference(store, scope.workspaceId, { categoryId });
  if (categoryError) return fail(categoryError);

  const existing = store.budgets.find(
    (b) =>
      b.workspaceId === scope.workspaceId &&
      b.categoryId === categoryId &&
      b.month === month,
  );
  if (existing) {
    existing.amount = amount;
  } else {
    store.budgets.push({ id: newId("b"), workspaceId: scope.workspaceId, recordedByProfileId: scope.profileId, categoryId, month, amount });
  }
  revalidateApp();
  return { ok: true, message: "Anggaran disimpan." };
}

export async function removeBudget(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const budget = findScoped(store.budgets, id, scope.workspaceId);
  if (!budget) return fail("Anggaran tidak ditemukan.");
  store.budgets = store.budgets.filter(
    (b) => !(b.id === id && b.workspaceId === scope.workspaceId),
  );
  revalidateApp();
  return { ok: true, message: "Anggaran dihapus." };
}

/* ---------------------------------- bills --------------------------------- */

const billSchema = z.object({
  name: z.string().trim().min(1, "Nama tagihan wajib diisi.").max(120),
  amount: z.number().int().positive("Jumlah harus lebih dari nol."),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "semiannual", "yearly", "once"]),
  dueDay: z.number().int().min(1, "Tanggal jatuh tempo tidak valid.").max(31, "Tanggal jatuh tempo maksimal 31."),
  nextDueDate: zRealDate,
  reminderDaysBefore: z.number().int().min(0, "Pengingat tidak boleh negatif.").max(30).default(3),
});

export async function createBill(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = billSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    accountId: String(formData.get("accountId") ?? "") || undefined,
    frequency: String(formData.get("frequency") ?? "monthly"),
    dueDay: Number(formData.get("dueDay") ?? 1),
    nextDueDate: String(formData.get("nextDueDate") ?? ""),
    reminderDaysBefore: Number(formData.get("reminderDaysBefore") ?? 3),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  {
    const store = getStore();
    const referenceError = invalidReference(store, scope.workspaceId, {
      categoryId: parsed.data.categoryId,
      accountId: parsed.data.accountId,
    });
    if (referenceError) return fail(referenceError);

    // Tagihan selalu dibukukan sebagai pengeluaran saat dibayar, jadi kategori
    // pemasukan tidak masuk akal di sini.
    if (parsed.data.categoryId) {
      const category = findScoped(store.categories, parsed.data.categoryId, scope.workspaceId);
      if (category && category.kind !== "expense") {
        return fail("Tagihan harus memakai kategori pengeluaran.");
      }
    }
  }

  /*
   * Pembagian beban antar anggota (opsional).
   *
   * Dikirim sebagai daftar id anggota yang ikut menanggung, dipisah koma.
   * Mode `equal` dipakai karena itulah yang paling sering benar untuk tagihan
   * rumah. Total bagian dihitung di sini, bukan di klien, supaya angkanya
   * tidak bisa dimanipulasi.
   */
  /*
   * `getAll`, bukan `get`: kotak centang bernama sama mengirim banyak nilai,
   * dan `get` hanya mengembalikan yang pertama — pembagian jadi diam-diam
   * hanya untuk satu anggota.
   */
  const splitMembers = formData
    .getAll("splitMembers")
    .map((value) => String(value).trim())
    .filter(Boolean);

  let split: { mode: "equal" | "weighted" | "custom"; shares: Array<{ memberId: string; amount: number }> } | undefined;

  if (splitMembers.length > 0) {
    const store = getStore();
    const members = store.members.filter((member) => splitMembers.includes(member.id));

    if (members.length !== splitMembers.length) {
      return fail("Ada anggota pembagian yang tidak dikenal.");
    }

    const result = splitBill({
      total: parsed.data.amount,
      mode: "equal",
      members,
    });

    if (!result.ok) return fail(result.message);

    split = {
      mode: "equal",
      shares: result.shares.map((share) => ({
        memberId: share.memberId,
        amount: share.amount,
      })),
    };
  }

  getStore().bills.push({
    id: newId("bill"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    ...parsed.data,
    status: "active",
    split,
  });
  revalidateApp();
  return { ok: true, message: "Tagihan ditambahkan." };
}

function nextDueDateFor(frequency: BillFrequency, from: string, dueDay: number): string {
  const month = from.slice(0, 7);
  switch (frequency) {
    case "weekly": {
      const [y, m, d] = from.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      date.setUTCDate(date.getUTCDate() + 7);
      return date.toISOString().slice(0, 10);
    }
    case "monthly":
      return safeDueDate(addMonths(month, 1), dueDay);
    case "quarterly":
      return safeDueDate(addMonths(month, 3), dueDay);
    case "semiannual":
      return safeDueDate(addMonths(month, 6), dueDay);
    case "yearly":
      return safeDueDate(addMonths(month, 12), dueDay);
    default:
      return from;
  }
}

export async function payBill(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const billId = String(formData.get("billId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const paidAtRaw = String(formData.get("paidAt") ?? todayISO());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAtRaw)) {
    return fail("Tanggal pembayaran tidak valid.");
  }
  const paidAt = paidAtRaw;

  const store = getStore();
  const bill = findScoped(store.bills, billId, scope.workspaceId);
  if (!bill) return fail("Tagihan tidak ditemukan.");
  if (!accountId) return fail("Pilih akun pembayaran.");

  // Akun pembayaran harus milik ruang yang sama; kalau tidak, saldo ruang lain
  // yang akan terpotong.
  const referenceError = invalidReference(store, scope.workspaceId, { accountId });
  if (referenceError) return fail(referenceError);

  const already = store.billPayments.some(
    (p) => p.billId === billId && p.dueDate === bill.nextDueDate,
  );
  if (already) return fail("Tagihan periode ini sudah dibayar.");

  const txId = newId("t");
  store.transactions.push({
    id: txId,
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    type: "expense",
    amount: bill.amount,
    occurredAt: paidAt,
    description: `Bayar ${bill.name}`,
    accountId,
    categoryId: bill.categoryId,
    visibility: "household",
  });

  store.billPayments.push({
    id: newId("bp"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    billId,
    dueDate: bill.nextDueDate,
    paidAt: new Date().toISOString(),
    amount: bill.amount,
    transactionId: txId,
    status: "paid",
  });

  bill.nextDueDate = nextDueDateFor(bill.frequency, bill.nextDueDate, bill.dueDay);

  revalidateApp();
  return { ok: true, message: `${bill.name} ditandai dibayar.` };
}

export async function skipBill(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const billId = String(formData.get("billId") ?? "");
  const store = getStore();
  const bill = findScoped(store.bills, billId, scope.workspaceId);
  if (!bill) return fail("Tagihan tidak ditemukan.");

  store.billPayments.push({
    id: newId("bp"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    billId,
    dueDate: bill.nextDueDate,
    paidAt: new Date().toISOString(),
    amount: bill.amount,
    status: "skipped",
  });
  bill.nextDueDate = nextDueDateFor(bill.frequency, bill.nextDueDate, bill.dueDay);
  revalidateApp();
  return { ok: true, message: "Tagihan dilewati untuk periode ini." };
}

/* ---------------------------------- goals --------------------------------- */

const goalSchema = z.object({
  name: z.string().trim().min(1, "Nama tujuan wajib diisi.").max(120),
  type: z.enum([
    "emergency_fund",
    "education",
    "home",
    "vehicle",
    "retirement",
    "hajj",
    "wedding",
    "vacation",
    "custom",
  ]),
  targetAmount: z.number().int().positive("Target harus lebih dari nol."),
  targetDate: z.string().optional(),
  accountId: z.string().optional(),
  memberId: z.string().optional(),
  visibility: z.enum(["household", "shared", "private"]),
});

export async function createGoal(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = goalSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "custom"),
    targetAmount: Number(formData.get("targetAmount") ?? 0),
    targetDate: String(formData.get("targetDate") ?? "") || undefined,
    accountId: String(formData.get("accountId") ?? "") || undefined,
    memberId: String(formData.get("memberId") ?? "") || undefined,
    visibility: String(formData.get("visibility") ?? "household"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }

  const store = getStore();
  const referenceError = invalidReference(store, scope.workspaceId, {
    accountId: parsed.data.accountId,
    memberId: parsed.data.memberId,
  });
  if (referenceError) return fail(referenceError);

  store.goals.push({
    id: newId("g"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    ...parsed.data,
    type: parsed.data.type as GoalType,
    savedAmount: 0,
    status: "active",
  });
  revalidateApp();
  return { ok: true, message: "Tujuan dibuat." };
}

export async function addContribution(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const goalId = String(formData.get("goalId") ?? "");
  const contributedAt = String(formData.get("contributedAt") ?? todayISO());
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const amountInput = requireAmount(formData, "amount", "Jumlah kontribusi", {
    allowZero: false,
  });
  if ("error" in amountInput) return fail(amountInput.error);
  const amount = amountInput.value;

  const store = getStore();
  const goal = findScoped(store.goals, goalId, scope.workspaceId);
  if (!goal) return fail("Tujuan tidak ditemukan.");

  store.contributions.push({
    id: newId("gc"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    goalId,
    amount,
    contributedAt,
    note,
  });
  goal.savedAmount += amount;
  if (goal.savedAmount >= goal.targetAmount) goal.status = "achieved";

  revalidateApp();
  return { ok: true, message: "Kontribusi tercatat." };
}

export async function updateGoalStatus(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const goalId = String(formData.get("goalId") ?? "");
  const status = String(formData.get("status") ?? "active");
  const store = getStore();
  const goal = findScoped(store.goals, goalId, scope.workspaceId);
  if (!goal) return fail("Tujuan tidak ditemukan.");
  // Tanpa validasi, status sembarang ("selesai-sekali") tersimpan apa adanya
  // dan merusak tampilan serta filter.
  const allowed = ["active", "achieved", "paused"] as const;
  if (!allowed.includes(status as (typeof allowed)[number])) {
    return fail("Status tujuan tidak dikenal.");
  }
  goal.status = status as (typeof allowed)[number];
  revalidateApp();
  return { ok: true, message: "Status tujuan diperbarui." };
}

/* ---------------------------------- events -------------------------------- */

const eventSchema = z.object({
  title: z.string().trim().min(1, "Judul acara wajib diisi.").max(160),
  type: z.enum(["birthday", "anniversary", "school", "medical", "family", "other"]),
  date: zRealDate,
  time: z.string().optional(),
  location: z.string().optional(),
  memberId: z.string().optional(),
  recurrence: z.enum(["none", "yearly", "monthly", "weekly"]),
  notes: z.string().optional(),
});

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = eventSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? "family"),
    date: String(formData.get("date") ?? ""),
    time: String(formData.get("time") ?? "") || undefined,
    location: String(formData.get("location") ?? "") || undefined,
    memberId: String(formData.get("memberId") ?? "") || undefined,
    recurrence: String(formData.get("recurrence") ?? "none"),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  getStore().events.push({
    id: newId("e"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    ...parsed.data,
    allDay: !parsed.data.time,
  });
  revalidateApp();
  return { ok: true, message: "Acara ditambahkan." };
}

export async function deleteEvent(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.events, id, scope.workspaceId)) return fail("Acara tidak ditemukan.");
  store.events = store.events.filter((e) => !(e.id === id && e.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Acara dihapus." };
}

/* ---------------------------------- chores -------------------------------- */

/** Skema tugas. Lihat catatan di `createChore` untuk alasannya. */
const choreSchema = z.object({
  title: z.string().trim().min(1, "Nama tugas wajib diisi.").max(120),
  assigneeMemberId: z.string().optional(),
  frequency: z.enum(["once", "daily", "weekly", "monthly"]),
  dueDate: zRealDate.optional(),
  points: z.number().int().min(0, "Poin tidak boleh negatif.").max(10_000),
});

export async function createChore(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  /*
   * Sebelumnya aksi ini membaca isian tanpa skema, lalu melakukan cast buta
   * (`frequency as ...`). Akibatnya:
   *
   * - `points` bisa menjadi `NaN` dan merusak total papan poin;
   * - `frequency` bisa berisi string apa pun, yang tidak dikenali perhitungan
   *   pengulangan;
   * - `dueDate` menerima tanggal yang tidak ada di kalender.
   *
   * Skema di bawah menutup ketiganya sekaligus.
   */
  const parsed = choreSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    assigneeMemberId: String(formData.get("assigneeMemberId") ?? "") || undefined,
    frequency: String(formData.get("frequency") ?? "once"),
    dueDate: String(formData.get("dueDate") ?? "") || undefined,
    points: Number(formData.get("points") ?? 0),
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tugas tidak valid.");
  }

  const data = parsed.data;

  {
    const store = getStore();
    const referenceError = invalidReference(store, scope.workspaceId, {
      memberId: data.assigneeMemberId,
    });
    if (referenceError) return fail(referenceError);
  }

  getStore().chores.push({
    id: newId("ch"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    title: data.title,
    assigneeMemberId: data.assigneeMemberId,
    frequency: data.frequency,
    dueDate: data.dueDate,
    status: "todo",
    points: data.points,
  });
  revalidateApp();
  return { ok: true, message: "Tugas ditambahkan." };
}

export async function setChoreStatus(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "todo");
  const store = getStore();
  const chore = findScoped(store.chores, id, scope.workspaceId);
  if (!chore) return fail("Tugas tidak ditemukan.");
  chore.status = status as "todo" | "doing" | "done";
  revalidateApp();
  return { ok: true, message: "Status tugas diperbarui." };
}

export async function deleteChore(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.chores, id, scope.workspaceId)) return fail("Tugas tidak ditemukan.");
  store.chores = store.chores.filter((c) => !(c.id === id && c.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Tugas dihapus." };
}

/* --------------------------------- shopping ------------------------------- */

export async function addShoppingItem(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "pcs").trim() || "pcs";

  if (!name) return fail("Nama barang wajib diisi.");

  const qtyInput = requireAmount(formData, "qty", "Jumlah", { allowZero: false });
  if ("error" in qtyInput) return fail(qtyInput.error);

  const priceInput = requireAmount(formData, "estimatedPrice", "Perkiraan harga");
  if ("error" in priceInput) return fail(priceInput.error);

  const qty = qtyInput.value;
  const estimatedPrice = priceInput.value;

  getStore().shopping.push({
    id: newId("s"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    name,
    qty,
    unit,
    estimatedPrice,
    checked: false,
  });
  revalidateApp();
  return { ok: true, message: "Barang ditambahkan." };
}

export async function toggleShoppingItem(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const item = findScoped(store.shopping, id, scope.workspaceId);
  if (!item) return fail("Barang tidak ditemukan.");
  item.checked = !item.checked;
  if (item.checked && item.actualPrice === undefined) {
    item.actualPrice = item.estimatedPrice;
  }
  revalidateApp();
  return { ok: true };
}

export async function clearCheckedShopping(): Promise<ActionResult> {
  /*
   * Sebelumnya aksi ini tidak memakai `currentScope()` sama sekali: satu klik
   * di satu ruang bisa mengosongkan daftar belanja ruang lain, dan tetap
   * berjalan meski sesi sudah berakhir.
   */
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const store = getStore();
  store.shopping = store.shopping.filter(
    (item) => !(item.checked && item.workspaceId === scope.workspaceId),
  );
  revalidateApp();
  return { ok: true, message: "Barang yang sudah dibeli dibersihkan." };
}

/* ---------------------------------- members ------------------------------- */

export async function createMember(formData: FormData): Promise<ActionResult> {
  /*
   * Anggota keluarga berlaku lintas ruang, jadi tidak bisa disaring lewat
   * workspaceId. Otorisasi harus lewat sesi — tanpa ini, server action bisa
   * dipanggil tanpa login dan siapa pun bisa menambah anggota.
   */
  await requireViewer();

  const name = String(formData.get("name") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "child");
  const role = String(formData.get("role") ?? "child");
  const birthDate = String(formData.get("birthDate") ?? "") || undefined;
  const color = String(formData.get("color") ?? "butter");

  if (!name) return fail("Nama anggota wajib diisi.");

  getStore().members.push({
    id: newId("m"),
    name,
    relationship: relationship as "self" | "spouse" | "child" | "parent" | "sibling" | "other",
    role: role as "owner" | "adult" | "teen" | "child" | "viewer",
    birthDate,
    color,
    active: true,
  });
  revalidateApp();
  return { ok: true, message: `${name} ditambahkan ke keluarga.` };
}

const memberRoleSchema = z.enum(["owner", "adult", "teen", "child", "viewer"]);
const relationshipSchema = z.enum([
  "self",
  "spouse",
  "child",
  "parent",
  "sibling",
  "other",
]);

/** Mengubah data satu anggota. */
export async function updateMember(formData: FormData): Promise<ActionResult> {
  // Lihat catatan di createMember: otorisasi lewat sesi, bukan ruang.
  await requireViewer();

  const id = String(formData.get("id") ?? "");
  const member = getStore().members.find((m) => m.id === id);
  if (!member) return fail("Anggota tidak ditemukan.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Nama anggota wajib diisi.");

  const role = memberRoleSchema.safeParse(String(formData.get("role") ?? member.role));
  const relationship = relationshipSchema.safeParse(
    String(formData.get("relationship") ?? member.relationship),
  );

  // Jangan sampai keluarga kehilangan pemiliknya.
  if (member.role === "owner" && role.success && role.data !== "owner") {
    const otherOwners = getStore().members.filter(
      (m) => m.role === "owner" && m.id !== member.id && m.active,
    );
    if (otherOwners.length === 0) {
      return fail("Harus ada minimal satu anggota dengan peran Pemilik.");
    }
  }

  member.name = name;
  if (role.success) member.role = role.data;
  if (relationship.success) member.relationship = relationship.data;
  member.birthDate = String(formData.get("birthDate") ?? "") || undefined;
  member.color = String(formData.get("color") ?? member.color);

  revalidateApp();
  return { ok: true, message: `Data ${name} diperbarui.` };
}

/** Menonaktifkan atau mengaktifkan anggota tanpa menghapus riwayatnya. */
export async function toggleMemberActive(formData: FormData): Promise<ActionResult> {
  // Lihat catatan di createMember: otorisasi lewat sesi, bukan ruang.
  await requireViewer();

  const id = String(formData.get("id") ?? "");
  const member = getStore().members.find((m) => m.id === id);
  if (!member) return fail("Anggota tidak ditemukan.");

  if (member.active && member.role === "owner") {
    const otherOwners = getStore().members.filter(
      (m) => m.role === "owner" && m.id !== member.id && m.active,
    );
    if (otherOwners.length === 0) {
      return fail("Pemilik terakhir tidak bisa dinonaktifkan.");
    }
  }

  member.active = !member.active;
  revalidateApp();
  return {
    ok: true,
    message: member.active
      ? `${member.name} diaktifkan kembali.`
      : `${member.name} dinonaktifkan. Riwayatnya tetap tersimpan.`,
  };
}

/**
 * Menghapus anggota secara permanen.
 *
 * Ditolak bila anggota masih dirujuk data lain (transaksi, tujuan, tugas, dsb),
 * karena menghapusnya akan memutus jejak "siapa melakukan apa". Untuk kasus itu
 * pengguna diarahkan menonaktifkan saja.
 */
export async function deleteMember(formData: FormData): Promise<ActionResult> {
  // Lihat catatan di createMember: otorisasi lewat sesi, bukan ruang.
  await requireViewer();

  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const member = store.members.find((m) => m.id === id);
  if (!member) return fail("Anggota tidak ditemukan.");

  if (member.role === "owner") {
    const otherOwners = store.members.filter(
      (m) => m.role === "owner" && m.id !== member.id && m.active,
    );
    if (otherOwners.length === 0) {
      return fail("Pemilik terakhir tidak bisa dihapus.");
    }
  }

  const references =
    store.transactions.filter((t) => t.memberId === id).length +
    store.goals.filter((g) => g.memberId === id).length +
    store.events.filter((e) => e.memberId === id).length +
    store.chores.filter((c) => c.assigneeMemberId === id).length +
    store.accounts.filter((a) => a.ownerMemberId === id).length +
    store.documents.filter((d) => d.memberId === id).length +
    store.healthRecords.filter((h) => h.memberId === id).length +
    store.educationRecords.filter((e) => e.memberId === id).length +
    store.insurances.filter((i) => i.memberId === id).length;

  if (references > 0) {
    return fail(
      `${member.name} masih terhubung ke ${references} catatan. Nonaktifkan saja agar riwayat tetap utuh.`,
    );
  }

  store.members = store.members.filter((m) => m.id !== id);
  revalidateApp();
  return { ok: true, message: `${member.name} dihapus dari keluarga.` };
}

/* -------------------------------- household ------------------------------- */

export async function updateHousehold(formData: FormData): Promise<ActionResult> {
  /*
   * Rumah tangga adalah data bersama seluruh akun, jadi tidak bisa disaring
   * lewat `workspaceId`. Otorisasi lewat sesi — tanpa ini, siapa pun bisa
   * mengganti nama keluarga tanpa masuk.
   */
  await requireViewer();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Nama keluarga wajib diisi.");
  getStore().household.name = name;
  revalidateApp();
  return { ok: true, message: "Pengaturan disimpan." };
}

/* --------------------------------- utang --------------------------------- */

const debtSchema = z.object({
  type: z.enum(["payable", "receivable"]),
  counterparty: z.string().trim().min(1, "Nama pihak wajib diisi.").max(120),
  principal: z.number().int().positive("Pokok pinjaman harus lebih dari nol."),
  remaining: z.number().int().min(0, "Sisa tidak boleh negatif."),
  interestRate: z.number().min(0, "Bunga tidak boleh negatif.").max(100, "Bunga maksimal 100%.").optional(),
  installmentAmount: z.number().int().min(0, "Cicilan tidak boleh negatif.").optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function createDebt(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const remainingRaw = String(formData.get("remaining") ?? "");
  const principal = Number(formData.get("principal") ?? 0);
  const parsed = debtSchema.safeParse({
    type: String(formData.get("type") ?? "payable"),
    counterparty: String(formData.get("counterparty") ?? ""),
    principal,
    remaining: remainingRaw ? Number(remainingRaw) : principal,
    interestRate: Number(formData.get("interestRate") ?? 0) || undefined,
    installmentAmount: Number(formData.get("installmentAmount") ?? 0) || undefined,
    dueDate: String(formData.get("dueDate") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  if (parsed.data.remaining > parsed.data.principal) {
    return fail("Sisa tidak boleh lebih besar dari pokok.");
  }
  getStore().debts.push({
    id: newId("d"),
    workspaceId: scope.workspaceId,
    recordedByProfileId: scope.profileId,
    ...parsed.data,
    status: "active",
  });
  revalidateApp();
  return { ok: true, message: "Utang/piutang dicatat." };
}

export async function payDebt(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const debt = findScoped(store.debts, id, scope.workspaceId);
  if (!debt) return fail("Catatan tidak ditemukan.");

  const amountInput = requireAmount(formData, "amount", "Jumlah pembayaran", {
    allowZero: false,
  });
  if ("error" in amountInput) return fail(amountInput.error);
  const amount = amountInput.value;

  debt.remaining = Math.max(debt.remaining - amount, 0);
  if (debt.remaining === 0) debt.status = "paid";

  revalidateApp();
  return { ok: true, message: "Pembayaran dicatat." };
}

export async function closeDebt(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const debt = findScoped(store.debts, id, scope.workspaceId);
  if (!debt) return fail("Catatan tidak ditemukan.");
  debt.status = "paid";
  debt.remaining = 0;
  revalidateApp();
  return { ok: true, message: "Ditandai lunas." };
}

export async function deleteDebt(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.debts, id, scope.workspaceId)) return fail("Catatan tidak ditemukan.");
  store.debts = store.debts.filter((d) => !(d.id === id && d.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Catatan dihapus." };
}

/* --------------------------------- aset ---------------------------------- */

const assetSchema = z.object({
  name: z.string().trim().min(1, "Nama aset wajib diisi.").max(120),
  type: z.enum(["cash", "property", "vehicle", "gold", "investment", "other"]),
  acquisitionValue: z.number().int().min(0, "Nilai perolehan tidak boleh negatif.").optional(),
  currentValue: z.number().int().min(0, "Nilai aset tidak boleh negatif."),
  acquiredAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function createAsset(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = assetSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "other"),
    acquisitionValue: Number(formData.get("acquisitionValue") ?? 0) || undefined,
    currentValue: Number(formData.get("currentValue") ?? 0),
    acquiredAt: String(formData.get("acquiredAt") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  getStore().assets.push({ id: newId("as"), workspaceId: scope.workspaceId, recordedByProfileId: scope.profileId, ...parsed.data });
  revalidateApp();
  return { ok: true, message: "Aset ditambahkan." };
}

export async function updateAssetValue(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const valueInput = requireAmount(formData, "currentValue", "Nilai aset");
  if ("error" in valueInput) return fail(valueInput.error);
  const currentValue = valueInput.value;
  const asset = findScoped(getStore().assets, id, scope.workspaceId);
  if (!asset) return fail("Aset tidak ditemukan.");
  asset.currentValue = currentValue;
  revalidateApp();
  return { ok: true, message: "Nilai aset diperbarui." };
}

export async function deleteAsset(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.assets, id, scope.workspaceId)) return fail("Aset tidak ditemukan.");
  store.assets = store.assets.filter((a) => !(a.id === id && a.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Aset dihapus." };
}

/* -------------------------------- asuransi -------------------------------- */

const insuranceSchema = z.object({
  type: z.enum(["health", "life", "vehicle", "property", "other"]),
  provider: z.string().trim().min(1, "Nama penyedia wajib diisi.").max(120),
  memberId: z.string().optional(),
  policyNumber: z.string().max(80).optional(),
  premium: z.number().int().min(0, "Premi tidak boleh negatif."),
  period: z.enum(["monthly", "quarterly", "yearly"]),
  nextDueDate: z.string().optional(),
  coverage: z.string().max(300).optional(),
});

export async function createInsurance(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = insuranceSchema.safeParse({
    type: String(formData.get("type") ?? "health"),
    provider: String(formData.get("provider") ?? ""),
    memberId: String(formData.get("memberId") ?? "") || undefined,
    policyNumber: String(formData.get("policyNumber") ?? "").trim() || undefined,
    premium: Number(formData.get("premium") ?? 0),
    period: String(formData.get("period") ?? "monthly"),
    nextDueDate: String(formData.get("nextDueDate") ?? "") || undefined,
    coverage: String(formData.get("coverage") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  getStore().insurances.push({ id: newId("ins"), workspaceId: scope.workspaceId, recordedByProfileId: scope.profileId, ...parsed.data, status: "active" });
  revalidateApp();
  return { ok: true, message: "Asuransi ditambahkan." };
}

export async function deleteInsurance(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.insurances, id, scope.workspaceId)) return fail("Asuransi tidak ditemukan.");
  store.insurances = store.insurances.filter((i) => !(i.id === id && i.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Asuransi dihapus." };
}

/* -------------------------------- dokumen -------------------------------- */

const documentSchema = z.object({
  title: z.string().trim().min(1, "Judul dokumen wajib diisi.").max(160),
  category: z.enum([
    "identity",
    "education",
    "insurance",
    "property",
    "health",
    "other",
  ]),
  memberId: z.string().optional(),
  documentNumber: z.string().max(80).optional(),
  issuer: z.string().max(120).optional(),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  fileName: z.string().max(160).optional(),
  visibility: z.enum(["household", "shared", "private"]),
  notes: z.string().max(500).optional(),
});

export async function createDocument(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = documentSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? "other"),
    memberId: String(formData.get("memberId") ?? "") || undefined,
    documentNumber: String(formData.get("documentNumber") ?? "").trim() || undefined,
    issuer: String(formData.get("issuer") ?? "").trim() || undefined,
    issuedAt: String(formData.get("issuedAt") ?? "") || undefined,
    expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
    fileName: String(formData.get("fileName") ?? "").trim() || undefined,
    visibility: String(formData.get("visibility") ?? "household"),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  getStore().documents.push({ id: newId("doc"), workspaceId: scope.workspaceId, recordedByProfileId: scope.profileId, ...parsed.data });
  revalidateApp();
  return { ok: true, message: "Dokumen dicatat." };
}

export async function deleteDocument(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const document = findScoped(store.documents, id, scope.workspaceId);
  if (!document) return fail("Dokumen tidak ditemukan.");

  /*
   * Hapus juga berkasnya di Object Storage.
   *
   * Tanpa ini, berkas menumpuk selamanya dan tetap bisa diunduh lewat kunci
   * lama — padahal catatannya sudah dihapus pengguna.
   */
  if (document.fileKey) {
    const { deleteObject } = await import("@/lib/storage/neon-storage");
    await deleteObject(document.fileKey);
  }

  store.documents = store.documents.filter((d) => !(d.id === id && d.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Dokumen dihapus." };
}

/**
 * Mencatat berkas yang sudah diunggah ke Object Storage.
 *
 * Dipisah dari `createDocument` karena unggahan berjalan di browser: berkas
 * dikirim langsung ke bucket lewat presigned URL, lalu hasilnya (kunci objek)
 * dicatat di sini. Memisahkan keduanya membuat unggahan besar tidak melewati
 * server Next.js.
 */
export async function attachDocumentFile(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const id = String(formData.get("id") ?? "");
  const key = String(formData.get("key") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = parseAmount(formData.get("fileSize"));

  const store = getStore();
  const document = findScoped(store.documents, id, scope.workspaceId);
  if (!document) return fail("Dokumen tidak ditemukan.");

  /*
   * Kunci objek wajib milik ruang ini.
   *
   * Tanpa pemeriksaan ini, permintaan yang dibuat tangan bisa menautkan
   * dokumen ke berkas milik ruang lain, lalu mengunduhnya lewat endpoint.
   */
  if (!key.startsWith(`${scope.workspaceId}/`) || key.includes("..")) {
    return fail("Berkas tidak sah.");
  }

  if (fileSize !== null && (fileSize <= 0 || fileSize > 10 * 1024 * 1024)) {
    return fail("Ukuran berkas harus antara 1 byte dan 10 MB.");
  }

  // Berkas lama dihapus agar tidak ada objek yatim saat diganti.
  if (document.fileKey && document.fileKey !== key) {
    const { deleteObject } = await import("@/lib/storage/neon-storage");
    await deleteObject(document.fileKey);
  }

  document.fileKey = key;
  document.fileName = fileName || document.fileName;
  document.fileSize = fileSize ?? undefined;

  revalidateApp();
  return { ok: true, message: "Berkas dilampirkan." };
}

/** Melepas lampiran tanpa menghapus catatan dokumennya. */
export async function detachDocumentFile(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);

  const id = String(formData.get("id") ?? "");
  const store = getStore();
  const document = findScoped(store.documents, id, scope.workspaceId);
  if (!document) return fail("Dokumen tidak ditemukan.");
  if (!document.fileKey) return fail("Dokumen ini belum punya berkas.");

  const { deleteObject } = await import("@/lib/storage/neon-storage");
  await deleteObject(document.fileKey);

  document.fileKey = undefined;
  document.fileSize = undefined;

  revalidateApp();
  return { ok: true, message: "Berkas dilepas." };
}

/* -------------------------------- kesehatan ------------------------------- */

const healthSchema = z.object({
  memberId: z.string().min(1, "Pilih anggota."),
  type: z.enum([
    "allergy",
    "condition",
    "medication",
    "immunization",
    "checkup",
    "other",
  ]),
  title: z.string().trim().min(1, "Judul wajib diisi.").max(160),
  recordedAt: zRealDate,
  nextAt: z.string().optional(),
  notes: z.string().max(500).optional(),
  visibility: z.enum(["private", "household"]),
});

export async function createHealthRecord(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = healthSchema.safeParse({
    memberId: String(formData.get("memberId") ?? ""),
    type: String(formData.get("type") ?? "checkup"),
    title: String(formData.get("title") ?? ""),
    recordedAt: String(formData.get("recordedAt") ?? todayISO()),
    nextAt: String(formData.get("nextAt") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    visibility: String(formData.get("visibility") ?? "private"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }

  {
    const store = getStore();
    const referenceError = invalidReference(store, scope.workspaceId, {
      memberId: parsed.data.memberId,
    });
    if (referenceError) return fail(referenceError);
  }

  // Regex hanya memeriksa bentuk, jadi "2026-13-45" lolos. Di sini tanggalnya
  // benar-benar diuji agar tidak ada tanggal mustahil di riwayat kesehatan.
  if (!isRealDate(parsed.data.recordedAt)) {
    return fail("Tanggal catatan tidak valid.");
  }
  if (parsed.data.nextAt && !isRealDate(parsed.data.nextAt)) {
    return fail("Tanggal kontrol berikutnya tidak valid.");
  }

  getStore().healthRecords.push({ id: newId("h"), workspaceId: scope.workspaceId, recordedByProfileId: scope.profileId, ...parsed.data });
  revalidateApp();
  return { ok: true, message: "Catatan kesehatan disimpan." };
}

export async function deleteHealthRecord(formData: FormData): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.healthRecords, id, scope.workspaceId)) return fail("Catatan tidak ditemukan.");
  store.healthRecords = store.healthRecords.filter((h) => !(h.id === id && h.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Catatan dihapus." };
}

/* ------------------------------- pendidikan ------------------------------- */

const educationSchema = z.object({
  memberId: z.string().min(1, "Pilih anggota."),
  school: z.string().trim().min(1, "Nama sekolah wajib diisi.").max(160),
  level: z.enum(["paud", "sd", "smp", "sma", "kuliah", "lainnya"]),
  academicYear: z.string().trim().min(4, "Tahun ajaran wajib diisi.").max(20),
  annualCost: z.number().int().min(0, "Biaya tidak boleh negatif.").optional(),
  goalId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function createEducationRecord(
  formData: FormData,
): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const parsed = educationSchema.safeParse({
    memberId: String(formData.get("memberId") ?? ""),
    school: String(formData.get("school") ?? ""),
    level: String(formData.get("level") ?? "sd"),
    academicYear: String(formData.get("academicYear") ?? ""),
    annualCost: Number(formData.get("annualCost") ?? 0) || undefined,
    goalId: String(formData.get("goalId") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Isian tidak valid.");
  }
  {
    const store = getStore();
    const referenceError = invalidReference(store, scope.workspaceId, {
      memberId: parsed.data.memberId,
      goalId: parsed.data.goalId,
    });
    if (referenceError) return fail(referenceError);
  }

  getStore().educationRecords.push({ id: newId("ed"), workspaceId: scope.workspaceId, recordedByProfileId: scope.profileId, ...parsed.data });
  revalidateApp();
  return { ok: true, message: "Data pendidikan disimpan." };
}

export async function deleteEducationRecord(
  formData: FormData,
): Promise<ActionResult> {
  const scope = await currentScope();
  if (!scope) return fail(NO_SCOPE);
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!findScoped(store.educationRecords, id, scope.workspaceId)) return fail("Data pendidikan tidak ditemukan.");
  store.educationRecords = store.educationRecords.filter((e) => !(e.id === id && e.workspaceId === scope.workspaceId));
  revalidateApp();
  return { ok: true, message: "Data pendidikan dihapus." };
}

/* --------------------------------- kontak -------------------------------- */

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi.").max(100),
  email: z.string().trim().email("Email belum valid.").max(160),
  need: z.string().trim().min(1, "Pilih jenis kebutuhan."),
  budget: z.string().max(60).optional(),
  message: z.string().trim().min(10, "Ceritakan sedikit lebih detail (min. 10 karakter).").max(2000),
});

export async function submitContact(formData: FormData): Promise<ActionResult> {
  /*
   * Satu kuota bersama, bukan per email: kalau dikunci per email, penyerang
   * cukup mengganti-ganti email untuk mengirim spam tanpa batas.
   */
  const limit = checkRateLimit(CONTACT_RULE, "global");
  if (!limit.allowed) {
    return fail(
      `Terlalu banyak pesan. Coba lagi dalam ${humanizeRetry(limit.retryAfterMs)}.`,
    );
  }
  recordFailure(CONTACT_RULE, "global");

  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    need: String(formData.get("need") ?? ""),
    budget: String(formData.get("budget") ?? "").trim() || undefined,
    message: String(formData.get("message") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("Periksa kembali isian Anda.", fieldErrors);
  }

  const { sendContactEmail } = await import("@/lib/email/send");
  const delivered = await sendContactEmail(parsed.data);

  getStore().messages.push({
    id: newId("msg"),
    ...parsed.data,
    createdAt: new Date().toISOString(),
    delivered,
    provider: delivered ? "resend" : "outbox",
  });

  saveStore();
  revalidatePath("/contact");
  revalidatePath("/keluarga/pengaturan");
  return {
    ok: true,
    message: delivered
      ? "Pesan terkirim. Saya akan membalas dalam 1–2 hari kerja."
      : "Pesan tersimpan. Email belum dikonfigurasi, jadi pesan masuk ke outbox lokal.",
  };
}

/* ------------------------------ reset data ------------------------------- */

export async function resetDemoData(): Promise<ActionResult> {
  /*
   * Reset menghapus SELURUH data aplikasi. Dua lapis pemeriksaan:
   *
   * 1. sesi aktif — tanpa ini, satu permintaan tanpa login cukup untuk
   *    menghabiskan data semua pengguna;
   * 2. peran pemilik akun — anggota biasa tidak boleh menghapus data keluarga.
   */
  const viewer = await requireViewer();
  const session = await requireActiveSession();
  if (session.role !== "owner") {
    return fail("Hanya pemilik akun yang bisa mengembalikan data ke contoh awal.");
  }
  void viewer;

  const { resetPersisted } = await import("./store");
  resetPersisted();
  revalidateApp();
  return { ok: true, message: "Data dikembalikan ke contoh awal." };
}