import {
  addDays,
  addMonths,
  currentMonth,
  safeDueDate,
  todayISO,
} from "@/lib/format";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { hashPassword, hashPin } from "@/lib/auth/password";
import { clearPersisted, readPersisted, writePersisted } from "./persist";
import {
  forgetKnownState,
  isDatabaseEnabled,
  loadStore,
  markStoreAsPersisted,
  persistStore,
} from "@/lib/db/pg-store";
import type { Profile, Store, Workspace, WorkspaceMember } from "./types";

const today = todayISO();
const month = currentMonth();
const prevMonth = addMonths(month, -1);
const prev2Month = addMonths(month, -2);
const nextMonth = addMonths(month, 1);

const d = (monthStr: string, day: number) =>
  safeDueDate(monthStr, day);

/* ------------------------------ workspace -------------------------------- */

export const WS = {
  irvan: "ws-irvan",
  sari: "ws-sari",
  bima: "ws-bima",
  nara: "ws-nara",
  family: "ws-family",
} as const;

/** PIN bawaan untuk data contoh. */
const DEMO_PIN = "1234";

/**
 * Kata sandi akun bawaan.
 *
 * Di produksi, kata sandi contoh yang tertulis di dokumentasi berarti siapa pun
 * yang membacanya bisa masuk sebagai pemilik. `AIREVO_OWNER_PASSWORD` dipakai
 * bila diisi; tanpa itu, produksi memakai kata sandi acak yang dicatat sekali di
 * log server — tidak bisa ditebak, dan pemilik tetap bisa mengambilnya.
 */
function seedPassword(): string {
  const fromEnv = process.env.AIREVO_OWNER_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    const generated = randomBytes(18).toString("base64url");
    console.warn(
      `[seed] AIREVO_OWNER_PASSWORD belum diisi. Kata sandi awal akun pemilik: ${generated} — segera ganti setelah masuk.`,
    );
    return generated;
  }

  return "airevo123";
}

function seedProfiles(): Profile[] {
  const now = new Date().toISOString();
  const base = {
    accountId: "u-irvan",
    pinHash: hashPin(DEMO_PIN),
    createdAt: now,
  };

  return [
    {
      ...base,
      id: "p-irvan",
      name: "Irvan",
      initial: "I",
      role: "owner",
      color: "butter",
      birthDate: "1990-04-12",
      isAccountOwner: true,
    },
    {
      ...base,
      id: "p-sari",
      name: "Sari",
      initial: "S",
      role: "adult",
      color: "plum",
      birthDate: "1992-08-03",
      isAccountOwner: false,
    },
    {
      ...base,
      id: "p-bima",
      name: "Bima",
      initial: "B",
      role: "child",
      color: "sky",
      birthDate: "2016-02-10",
      isAccountOwner: false,
    },
    {
      ...base,
      id: "p-nara",
      name: "Nara",
      initial: "N",
      role: "teen",
      color: "mint",
      birthDate: "2011-11-21",
      isAccountOwner: false,
    },
  ];
}

function seedWorkspaces(): Workspace[] {
  const now = new Date().toISOString();
  return [
    {
      id: WS.irvan,
      name: "Ruang Irvan",
      type: "personal",
      ownerProfileId: "p-irvan",
      color: "butter",
      createdAt: now,
    },
    {
      id: WS.sari,
      name: "Ruang Sari",
      type: "personal",
      ownerProfileId: "p-sari",
      color: "plum",
      createdAt: now,
    },
    {
      id: WS.bima,
      name: "Ruang Bima",
      type: "personal",
      ownerProfileId: "p-bima",
      color: "sky",
      createdAt: now,
    },
    {
      id: WS.nara,
      name: "Ruang Nara",
      type: "personal",
      ownerProfileId: "p-nara",
      color: "mint",
      createdAt: now,
    },
    {
      id: WS.family,
      name: "Keluarga Irvan",
      type: "shared",
      ownerProfileId: "p-irvan",
      inviteCode: "KLRG-IRVN",
      color: "tomato",
      createdAt: now,
    },
  ];
}

function seedWorkspaceMembers(): WorkspaceMember[] {
  const now = new Date().toISOString();
  return [
    // Ruang pribadi: hanya pemiliknya.
    { workspaceId: WS.irvan, profileId: "p-irvan", role: "owner", joinedAt: now },
    { workspaceId: WS.sari, profileId: "p-sari", role: "owner", joinedAt: now },
    { workspaceId: WS.bima, profileId: "p-bima", role: "owner", joinedAt: now },
    { workspaceId: WS.nara, profileId: "p-nara", role: "owner", joinedAt: now },
    // Workspace bersama: Irvan sebagai pemilik, Sari sebagai editor.
    { workspaceId: WS.family, profileId: "p-irvan", role: "owner", joinedAt: now },
    { workspaceId: WS.family, profileId: "p-sari", role: "editor", joinedAt: now },
  ];
}

function seedBase(): Store {
  const password = seedPassword();

  return {
    household: {
      name: "Keluarga Irvan",
      currency: "IDR",
      timezone: "Asia/Jakarta",
    },
    users: [
      {
        id: "u-irvan",
        email: "irvan@airevo-digital.my.id",
        name: "Irvan",
        passwordHash: hashPassword(password),
        memberId: "m-irvan",
        role: "owner",
        createdAt: new Date().toISOString(),
      },
      {
        id: "u-sari",
        email: "sari@airevo-digital.my.id",
        name: "Sari",
        passwordHash: hashPassword(password),
        memberId: "m-sari",
        role: "adult",
        createdAt: new Date().toISOString(),
      },
    ],
    members: [
      {
        id: "m-irvan",
        name: "Irvan",
        relationship: "self",
        role: "owner",
        birthDate: "1992-04-18",
        color: "sky",
        active: true,
      },
      {
        id: "m-sari",
        name: "Sari",
        relationship: "spouse",
        role: "adult",
        birthDate: "1994-09-02",
        color: "plum",
        active: true,
      },
      {
        id: "m-nara",
        name: "Nara",
        relationship: "child",
        role: "teen",
        birthDate: "2011-01-27",
        color: "mint",
        active: true,
      },
      {
        id: "m-bima",
        name: "Bima",
        relationship: "child",
        role: "child",
        birthDate: "2016-06-14",
        color: "butter",
        active: true,
      },
    ],
    accounts: [
      {
        id: "a-bca",
        name: "BCA Utama",
        type: "bank",
        openingBalance: 12_400_000,
        ownerMemberId: "m-irvan",
        color: "sky",
        isShared: true,
        archived: false,
      },
      {
        id: "a-mandiri",
        name: "Mandiri Tabungan",
        type: "savings",
        openingBalance: 28_000_000,
        color: "mint",
        isShared: true,
        archived: false,
      },
      {
        id: "a-gopay",
        name: "GoPay",
        type: "ewallet",
        openingBalance: 850_000,
        ownerMemberId: "m-sari",
        color: "plum",
        isShared: true,
        archived: false,
      },
      {
        id: "a-cash",
        name: "Tunai Rumah",
        type: "cash",
        openingBalance: 1_200_000,
        color: "butter",
        isShared: true,
        archived: false,
      },
    ],
    categories: [
      { id: "c-gaji", name: "Gaji", kind: "income", color: "mint", archived: false },
      { id: "c-freelance", name: "Freelance", kind: "income", color: "sky", archived: false },
      { id: "c-bonus", name: "Bonus", kind: "income", color: "butter", archived: false },
      { id: "c-belanja", name: "Belanja Dapur", kind: "expense", color: "butter", archived: false },
      { id: "c-makan", name: "Makan di Luar", kind: "expense", color: "tomato", archived: false },
      { id: "c-transport", name: "Transportasi", kind: "expense", color: "sky", archived: false },
      { id: "c-listrik", name: "Listrik & Air", kind: "expense", color: "plum", archived: false },
      { id: "c-sekolah", name: "Sekolah", kind: "expense", color: "mint", archived: false },
      { id: "c-kesehatan", name: "Kesehatan", kind: "expense", color: "tomato", archived: false },
      { id: "c-hiburan", name: "Hiburan", kind: "expense", color: "plum", archived: false },
      { id: "c-jajan", name: "Uang Jajan", kind: "expense", color: "butter", archived: false },
    ],
    transactions: [
      {
        id: "t-1",
        type: "income",
        amount: 14_500_000,        occurredAt: d(month, 2),
        description: "Gaji bulanan",
        accountId: "a-bca",
        categoryId: "c-gaji",
        memberId: "m-irvan",
        visibility: "household",
      },
      {
        id: "t-2",
        type: "income",
        amount: 3_200_000,
        occurredAt: d(month, 8),
        description: "Proyek freelance",
        accountId: "a-bca",
        categoryId: "c-freelance",
        memberId: "m-irvan",
        visibility: "household",
      },
      {
        id: "t-3",
        type: "expense",
        amount: 1_850_000,
        occurredAt: d(month, 3),
        description: "Belanja bulanan",
        accountId: "a-bca",
        categoryId: "c-belanja",
        memberId: "m-sari",
        visibility: "household",
      },
      {
        id: "t-4",
        type: "expense",
        amount: 420_000,
        occurredAt: d(month, 4),
        description: "Listrik PLN",
        accountId: "a-bca",
        categoryId: "c-listrik",
        visibility: "household",
      },
      {
        id: "t-5",
        type: "expense",
        amount: 285_000,
        occurredAt: d(month, 5),
        description: "Air PDAM",
        accountId: "a-bca",
        categoryId: "c-listrik",
        visibility: "household",
      },
      {
        id: "t-6",
        type: "expense",
        amount: 640_000,
        occurredAt: d(month, 6),
        description: "SPP sekolah Nara",
        accountId: "a-bca",
        categoryId: "c-sekolah",
        memberId: "m-nara",
        visibility: "household",
      },
      {
        id: "t-7",
        type: "expense",
        amount: 320_000,
        occurredAt: d(month, 7),
        description: "Bensin dan parkir",
        accountId: "a-gopay",
        categoryId: "c-transport",
        memberId: "m-irvan",
        visibility: "household",
      },
      {
        id: "t-8",
        type: "expense",
        amount: 175_000,
        occurredAt: d(month, 9),
        description: "Makan keluarga akhir pekan",
        accountId: "a-cash",
        categoryId: "c-makan",
        visibility: "household",
      },
      {
        id: "t-9",
        type: "expense",
        amount: 90_000,
        occurredAt: d(month, 10),
        description: "Jajan Bima",
        accountId: "a-cash",
        categoryId: "c-jajan",
        memberId: "m-bima",
        visibility: "shared",
      },
      {
        id: "t-10",
        type: "transfer",
        amount: 2_000_000,
        occurredAt: d(month, 11),
        description: "Sisihkan ke tabungan",
        accountId: "a-bca",
        toAccountId: "a-mandiri",
        visibility: "household",
      },
      {
        id: "t-11",
        type: "expense",
        amount: 1_650_000,
        occurredAt: d(prevMonth, 3),
        description: "Belanja bulanan",
        accountId: "a-bca",
        categoryId: "c-belanja",
        visibility: "household",
      },
      {
        id: "t-12",
        type: "income",
        amount: 14_500_000,
        occurredAt: d(prevMonth, 2),
        description: "Gaji bulanan",
        accountId: "a-bca",
        categoryId: "c-gaji",
        visibility: "household",
      },
      {
        id: "t-13",
        type: "expense",
        amount: 1_320_000,
        occurredAt: d(prevMonth, 12),
        description: "Servis motor",
        accountId: "a-bca",
        categoryId: "c-transport",
        visibility: "household",
      },
      {
        id: "t-14",
        type: "expense",
        amount: 980_000,
        occurredAt: d(prev2Month, 3),
        description: "Belanja bulanan",
        accountId: "a-bca",
        categoryId: "c-belanja",
        visibility: "household",
      },
      {
        id: "t-15",
        type: "income",
        amount: 14_500_000,
        occurredAt: d(prev2Month, 2),
        description: "Gaji bulanan",
        accountId: "a-bca",
        categoryId: "c-gaji",
        visibility: "household",
      },
    ],
    /*
     * Contoh aturan berulang: gaji bulanan.
     *
     * Transaksi "Gaji bulanan" di atas sudah tercatat untuk bulan ini, jadi
     * `nextAt` diarahkan ke bulan depan agar tidak ada duplikat saat data
     * contoh dimuat.
     */
    recurringRules: [
      {
        id: "rr-gaji",
        type: "income",
        amount: 14_500_000,
        description: "Gaji bulanan",
        accountId: "a-bca",
        categoryId: "c-gaji",
        visibility: "household",
        frequency: "monthly",
        startAt: d(prev2Month, 2),
        nextAt: d(nextMonth, 2),
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    budgets: [
      { id: "b-1", categoryId: "c-belanja", month, amount: 2_500_000 },
      { id: "b-2", categoryId: "c-makan", month, amount: 1_200_000 },
      { id: "b-3", categoryId: "c-transport", month, amount: 800_000 },
      { id: "b-4", categoryId: "c-listrik", month, amount: 900_000 },
      { id: "b-5", categoryId: "c-sekolah", month, amount: 700_000 },
      { id: "b-6", categoryId: "c-hiburan", month, amount: 500_000 },
      { id: "b-7", categoryId: "c-jajan", month, amount: 400_000 },
    ],
    bills: [
      {
        id: "bill-listrik",
        name: "Listrik PLN",
        amount: 450_000,
        categoryId: "c-listrik",
        accountId: "a-bca",
        frequency: "monthly",
        dueDay: 15,
        nextDueDate: safeDueDate(month, 15),
        reminderDaysBefore: 3,
        status: "active",
      },
      {
        id: "bill-air",
        name: "Air PDAM",
        amount: 285_000,
        categoryId: "c-listrik",
        accountId: "a-bca",
        frequency: "monthly",
        dueDay: 20,
        nextDueDate: safeDueDate(month, 20),
        reminderDaysBefore: 3,
        status: "active",
      },
      {
        id: "bill-internet",
        name: "Internet Rumah",
        amount: 395_000,
        categoryId: "c-listrik",
        accountId: "a-bca",
        frequency: "monthly",
        dueDay: 5,
        nextDueDate: safeDueDate(nextMonth, 5),
        reminderDaysBefore: 5,
        status: "active",
      },
      {
        id: "bill-sekolah",
        name: "SPP Sekolah",
        amount: 640_000,
        categoryId: "c-sekolah",
        accountId: "a-bca",
        frequency: "monthly",
        dueDay: 10,
        nextDueDate: safeDueDate(nextMonth, 10),
        reminderDaysBefore: 7,
        status: "active",
      },
    ],
    billPayments: [
      {
        id: "bp-1",
        billId: "bill-internet",
        dueDate: safeDueDate(month, 5),
        paidAt: `${d(month, 5)}T08:12:00.000Z`,
        amount: 395_000,
        status: "paid",
      },
    ],
    goals: [
      {
        id: "g-darurat",
        name: "Dana darurat 6 bulan",
        type: "emergency_fund",
        targetAmount: 60_000_000,
        targetDate: `${addMonths(month, 14)}-01`,
        savedAmount: 28_000_000,
        accountId: "a-mandiri",
        visibility: "household",
        status: "active",
      },
      {
        id: "g-nara",
        name: "Kuliah Nara",
        type: "education",
        targetAmount: 180_000_000,
        targetDate: "2030-07-01",
        savedAmount: 24_500_000,
        accountId: "a-mandiri",
        memberId: "m-nara",
        visibility: "shared",
        status: "active",
      },
      {
        id: "g-liburan",
        name: "Liburan akhir tahun",
        type: "vacation",
        targetAmount: 15_000_000,
        targetDate: `${addMonths(month, 3)}-20`,
        savedAmount: 4_200_000,
        visibility: "shared",
        status: "active",
      },
    ],
    contributions: [
      {
        id: "gc-1",
        goalId: "g-darurat",
        amount: 2_000_000,
        contributedAt: d(prevMonth, 25),
        note: "Sisihan gaji",
      },
      {
        id: "gc-2",
        goalId: "g-nara",
        amount: 1_500_000,
        contributedAt: d(prevMonth, 25),
      },
      {
        id: "gc-3",
        goalId: "g-liburan",
        amount: 1_200_000,
        contributedAt: d(month, 6),
      },
    ],
    events: [
      {
        id: "e-1",
        title: "Ulang tahun Nara",
        type: "birthday",
        date: "2011-01-27",
        allDay: true,
        memberId: "m-nara",
        recurrence: "yearly",
      },
      {
        id: "e-2",
        title: "Kontrol dokter gigi Bima",
        type: "medical",
        date: addDays(today, 4),
        time: "10:00",
        allDay: false,
        location: "Klinik Sehat",
        memberId: "m-bima",
        recurrence: "none",
      },
      {
        id: "e-3",
        title: "Parent meeting sekolah",
        type: "school",
        date: addDays(today, 9),
        time: "09:00",
        allDay: false,
        location: "SD Harapan",
        recurrence: "none",
      },
      {
        id: "e-4",
        title: "Makan malam keluarga",
        type: "family",
        date: addDays(today, 2),
        time: "18:30",
        allDay: false,
        recurrence: "weekly",
      },
      {
        id: "e-5",
        title: "Anniversary",
        type: "anniversary",
        date: "2018-11-11",
        allDay: true,
        recurrence: "yearly",
      },
    ],
    chores: [
      {
        id: "ch-1",
        title: "Buang sampah",
        assigneeMemberId: "m-bima",
        frequency: "daily",
        dueDate: today,
        status: "todo",
        points: 2,
      },
      {
        id: "ch-2",
        title: "Cuci piring malam",
        assigneeMemberId: "m-nara",
        frequency: "daily",
        dueDate: today,
        status: "doing",
        points: 3,
      },
      {
        id: "ch-3",
        title: "Belanja mingguan",
        assigneeMemberId: "m-sari",
        frequency: "weekly",
        dueDate: addDays(today, 3),
        status: "todo",
        points: 5,
      },
      {
        id: "ch-4",
        title: "Bersihkan kamar mandi",
        assigneeMemberId: "m-irvan",
        frequency: "weekly",
        dueDate: addDays(today, 5),
        status: "todo",
        points: 4,
      },
      {
        id: "ch-5",
        title: "Rapikan mainan",
        assigneeMemberId: "m-bima",
        frequency: "daily",
        dueDate: addDays(today, -1),
        status: "done",
        points: 1,
      },
    ],
    shopping: [
      {
        id: "s-1",
        name: "Beras 5 kg",
        qty: 2,
        unit: "karung",
        estimatedPrice: 75_000,
        checked: false,
        categoryId: "c-belanja",
      },
      {
        id: "s-2",
        name: "Telur",
        qty: 2,
        unit: "kg",
        estimatedPrice: 32_000,
        checked: true,
        actualPrice: 30_000,
        categoryId: "c-belanja",
      },
      {
        id: "s-3",
        name: "Minyak goreng",
        qty: 2,
        unit: "liter",
        estimatedPrice: 20_000,
        checked: false,
        categoryId: "c-belanja",
      },
      {
        id: "s-4",
        name: "Sabun dan sampo",
        qty: 1,
        unit: "paket",
        estimatedPrice: 85_000,
        checked: false,
        categoryId: "c-belanja",
      },
      {
        id: "s-5",
        name: "Buah mingguan",
        qty: 1,
        unit: "paket",
        estimatedPrice: 60_000,
        checked: false,
        categoryId: "c-belanja",
      },
    ],
    debts: [
      {
        id: "d-1",
        type: "payable",
        counterparty: "KPR BCA",
        principal: 420_000_000,
        remaining: 268_500_000,
        interestRate: 7.5,
        installmentAmount: 3_850_000,
        dueDate: safeDueDate(month, 25),
        status: "active",
        notes: "Cicilan ke-64 dari 180",
      },
      {
        id: "d-2",
        type: "payable",
        counterparty: "Kredit motor",
        principal: 28_000_000,
        remaining: 9_400_000,
        installmentAmount: 1_250_000,
        dueDate: safeDueDate(nextMonth, 8),
        status: "active",
      },
      {
        id: "d-3",
        type: "receivable",
        counterparty: "Dimas (adik)",
        principal: 5_000_000,
        remaining: 3_000_000,
        dueDate: `${addMonths(month, 4)}-15`,
        status: "active",
        notes: "Dipinjam untuk modal usaha",
      },
    ],
    assets: [
      {
        id: "as-1",
        name: "Rumah KPR",
        type: "property",
        acquisitionValue: 650_000_000,
        currentValue: 780_000_000,
        acquiredAt: "2021-03-12",
      },
      {
        id: "as-2",
        name: "Motor Vario",
        type: "vehicle",
        acquisitionValue: 28_000_000,
        currentValue: 18_500_000,
        acquiredAt: "2023-08-01",
      },
      {
        id: "as-3",
        name: "Emas 10 gram",
        type: "gold",
        acquisitionValue: 9_500_000,
        currentValue: 14_200_000,
        acquiredAt: "2020-06-20",
      },
      {
        id: "as-4",
        name: "Reksa dana pasar uang",
        type: "investment",
        acquisitionValue: 15_000_000,
        currentValue: 16_850_000,
        acquiredAt: "2024-02-14",
      },
    ],
    insurances: [
      {
        id: "ins-1",
        type: "health",
        provider: "Prudential",
        memberId: "m-irvan",
        policyNumber: "PRU-889231",
        premium: 1_450_000,
        period: "quarterly",
        nextDueDate: safeDueDate(nextMonth, 12),
        coverage: "Rawat inap Rp500 juta/tahun",
        status: "active",
      },
      {
        id: "ins-2",
        type: "life",
        provider: "Prudential",
        memberId: "m-sari",
        policyNumber: "PRU-889232",
        premium: 980_000,
        period: "quarterly",
        nextDueDate: safeDueDate(nextMonth, 12),
        coverage: "Uang pertanggungan Rp300 juta",
        status: "active",
      },
      {
        id: "ins-3",
        type: "vehicle",
        provider: "Adira",
        memberId: "m-irvan",
        premium: 1_200_000,
        period: "yearly",
        nextDueDate: `${addMonths(month, 7)}-20`,
        coverage: "All risk motor",
        status: "active",
      },
    ],
    documents: [
      {
        id: "doc-1",
        title: "Kartu Keluarga",
        category: "identity",
        documentNumber: "3171xxxxxxxxxxxx",
        issuer: "Dukcapil Jakarta",
        issuedAt: "2019-05-02",
        visibility: "household",
        notes: "Salinan digital, asli di lemari berkas",
      },
      {
        id: "doc-2",
        title: "Akta Kelahiran Nara",
        category: "identity",
        memberId: "m-nara",
        documentNumber: "AK-2011-0027",
        issuer: "Dukcapil Jakarta",
        issuedAt: "2011-02-10",
        visibility: "household",
      },
      {
        id: "doc-3",
        title: "Ijazah SD Bima",
        category: "education",
        memberId: "m-bima",
        issuer: "SD Harapan",
        issuedAt: "2028-06-20",
        visibility: "household",
      },
      {
        id: "doc-4",
        title: "Polis Asuransi Kesehatan",
        category: "insurance",
        memberId: "m-irvan",
        documentNumber: "PRU-889231",
        issuer: "Prudential",
        issuedAt: "2024-01-15",
        expiresAt: `${addMonths(month, 12)}-15`,
        visibility: "household",
      },
      {
        id: "doc-5",
        title: "Sertifikat Rumah",
        category: "property",
        documentNumber: "SHM-4471",
        issuer: "BPN",
        issuedAt: "2021-04-01",
        visibility: "private",
        notes: "Hanya untuk dewasa",
      },
      {
        id: "doc-6",
        title: "Buku Imunisasi Bima",
        category: "health",
        memberId: "m-bima",
        issuer: "Puskesmas",
        issuedAt: "2016-06-14",
        visibility: "household",
      },
    ],
    healthRecords: [
      {
        id: "h-1",
        memberId: "m-bima",
        type: "allergy",
        title: "Alergi udang",
        recordedAt: "2019-03-11",
        notes: "Reaksi gatal ringan, hindari makanan laut",
        visibility: "household",
      },
      {
        id: "h-2",
        memberId: "m-sari",
        type: "condition",
        title: "Asam lambung",
        recordedAt: "2023-07-19",
        notes: "Kontrol rutin tiap 6 bulan",
        visibility: "private",
      },
      {
        id: "h-3",
        memberId: "m-bima",
        type: "immunization",
        title: "Imunisasi campak lanjutan",
        recordedAt: "2017-08-02",
        visibility: "household",
      },
      {
        id: "h-4",
        memberId: "m-irvan",
        type: "checkup",
        title: "Medical check-up tahunan",
        recordedAt: "2026-02-18",
        nextAt: `${addMonths(month, 4)}-18`,
        notes: "Kolesterol sedikit tinggi, kurangi gorengan",
        visibility: "household",
      },
      {
        id: "h-5",
        memberId: "m-nara",
        type: "medication",
        title: "Vitamin D",
        recordedAt: "2026-09-01",
        visibility: "private",
      },
    ],
    educationRecords: [
      {
        id: "ed-1",
        memberId: "m-nara",
        school: "SMP Harapan",
        level: "smp",
        academicYear: "2026/2027",
        annualCost: 9_600_000,
        goalId: "g-nara",
        notes: "Kelas 9, fokus ujian akhir",
      },
      {
        id: "ed-2",
        memberId: "m-bima",
        school: "SD Harapan",
        level: "sd",
        academicYear: "2026/2027",
        annualCost: 7_200_000,
        notes: "Kelas 5",
      },
    ],
    messages: [],
    profiles: seedProfiles(),
    workspaces: seedWorkspaces(),
    workspaceMembers: seedWorkspaceMembers(),
    orders: [
      {
        id: "ord-demo-1",
        code: "ARV-DEMO1",
        productId: "keluarga",
        productName: "Keluarga",
        buyerName: "Irvan",
        email: "irvan@airevo-digital.my.id",
        amount: 49_000,
        status: "paid",
        provider: "manual",
        method: "bank_transfer",
        createdAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
        expiresAt: new Date(Date.now() - 86_400_000 * 29).toISOString(),
        paidAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
        note: "Pembelian awal sebelum aplikasi dipakai.",
      },
    ],
    licenses: [
      {
        id: "lic-demo-1",
        orderId: "ord-demo-1",
        productId: "keluarga",
        key: "KLRG-DEMO-IRVAN-2026",
        email: "irvan@airevo-digital.my.id",
        status: "active",
        issuedAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
      },
      {
        id: "lic-demo-2",
        orderId: "ord-demo-1",
        productId: "keluarga",
        key: "KLRG-DEMO-SARI-2026",
        email: "sari@airevo-digital.my.id",
        status: "active",
        issuedAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
      },
    ],
  };
}

/* --------------------------- penandaan workspace -------------------------- */

/** Koleksi yang terikat ke satu workspace. */
const SCOPED_KEYS = [
  "accounts",
  "categories",
  "transactions",
  "recurringRules",
  "budgets",
  "bills",
  "billPayments",
  "goals",
  "contributions",
  "events",
  "chores",
  "shopping",
  "debts",
  "assets",
  "insurances",
  "documents",
  "healthRecords",
  "educationRecords",
] as const;

/**
 * Menandai setiap entitas dengan `workspaceId` dan `recordedByProfileId`.
 *
 * Data contoh yang ada adalah data keluarga, jadi semuanya masuk ke workspace
 * bersama `Keluarga Irvan`. Ruang pribadi tiap profil diisi contoh kecil agar
 * pemisahan datanya terlihat saat mencoba aplikasi.
 */
function stampWorkspaces(base: Store): Store {
  const store = base as unknown as Record<string, Array<Record<string, unknown>>>;

  for (const key of SCOPED_KEYS) {
    for (const item of store[key] ?? []) {
      item.workspaceId = WS.family;
    }
  }

  // Transaksi keluarga dicatat oleh Irvan atau Sari, bergantian.
  base.transactions.forEach((tx, index) => {
    tx.recordedByProfileId = index % 3 === 0 ? "p-sari" : "p-irvan";
  });

  const memberToProfile: Record<string, string> = {
    "m-irvan": "p-irvan",
    "m-sari": "p-sari",
    "m-bima": "p-bima",
    "m-nara": "p-nara",
  };
  for (const record of base.healthRecords) {
    record.recordedByProfileId = memberToProfile[record.memberId] ?? "p-irvan";
  }
  for (const record of base.educationRecords) {
    record.recordedByProfileId = "p-irvan";
  }
  for (const doc of base.documents) {
    // Dokumen tanpa anggota terkait dianggap dicatat pemilik akun.
    doc.recordedByProfileId = doc.memberId
      ? (memberToProfile[doc.memberId] ?? "p-irvan")
      : "p-irvan";
  }
  base.contributions.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });
  base.goals.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });
  base.assets.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });
  base.debts.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });
  base.insurances.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });
  base.chores.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });
  base.events.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });
  base.bills.forEach((item) => {
    item.recordedByProfileId = "p-irvan";
  });

  return {
    ...base,
    accounts: [...base.accounts, ...personalAccounts()],
    categories: [...base.categories, ...personalCategories()],
    transactions: [...base.transactions, ...personalTransactions()],
  };
}

/* ------------------------- data ruang pribadi ---------------------------- */

function personalAccounts() {
  return [
    {
      id: "acc-irvan-pribadi",
      workspaceId: WS.irvan,
      name: "Dompet Irvan",
      type: "cash" as const,
      openingBalance: 850_000,
      ownerMemberId: "m-irvan",
      color: "butter",
      isShared: false,
      archived: false,
      recordedByProfileId: "p-irvan",
    },
    {
      id: "acc-sari-pribadi",
      workspaceId: WS.sari,
      name: "Dompet Sari",
      type: "cash" as const,
      openingBalance: 620_000,
      ownerMemberId: "m-sari",
      color: "plum",
      isShared: false,
      archived: false,
      recordedByProfileId: "p-sari",
    },
    {
      id: "acc-bima-tabungan",
      workspaceId: WS.bima,
      name: "Celengan Bima",
      type: "savings" as const,
      openingBalance: 275_000,
      ownerMemberId: "m-bima",
      color: "sky",
      isShared: false,
      archived: false,
      recordedByProfileId: "p-bima",
    },
    {
      id: "acc-nara-tabungan",
      workspaceId: WS.nara,
      name: "Tabungan Nara",
      type: "savings" as const,
      openingBalance: 1_450_000,
      ownerMemberId: "m-nara",
      color: "mint",
      isShared: false,
      archived: false,
      recordedByProfileId: "p-nara",
    },
  ];
}

function personalCategories() {
  return [
    {
      id: "cat-irvan-jajan",
      workspaceId: WS.irvan,
      name: "Jajan",
      kind: "expense" as const,
      color: "butter",
      archived: false,
      recordedByProfileId: "p-irvan",
    },
    {
      id: "cat-sari-hobi",
      workspaceId: WS.sari,
      name: "Hobi",
      kind: "expense" as const,
      color: "plum",
      archived: false,
      recordedByProfileId: "p-sari",
    },
    {
      id: "cat-bima-jajan",
      workspaceId: WS.bima,
      name: "Jajan",
      kind: "expense" as const,
      color: "sky",
      archived: false,
      recordedByProfileId: "p-bima",
    },
    {
      id: "cat-nara-jajan",
      workspaceId: WS.nara,
      name: "Jajan",
      kind: "expense" as const,
      color: "mint",
      archived: false,
      recordedByProfileId: "p-nara",
    },
  ];
}

function personalTransactions() {
  return [
    {
      id: "tx-irvan-1",
      workspaceId: WS.irvan,
      type: "expense" as const,
      amount: 45_000,
      occurredAt: d(month, 6),
      description: "Kopi dan roti",
      accountId: "acc-irvan-pribadi",
      categoryId: "cat-irvan-jajan",
      memberId: "m-irvan",
      recordedByProfileId: "p-irvan",
      visibility: "private" as const,
    },
    {
      id: "tx-irvan-2",
      workspaceId: WS.irvan,
      type: "expense" as const,
      amount: 120_000,
      occurredAt: d(month, 9),
      description: "Bensin motor",
      accountId: "acc-irvan-pribadi",
      memberId: "m-irvan",
      recordedByProfileId: "p-irvan",
      visibility: "private" as const,
    },
    {
      id: "tx-sari-1",
      workspaceId: WS.sari,
      type: "expense" as const,
      amount: 85_000,
      occurredAt: d(month, 7),
      description: "Buku bacaan",
      accountId: "acc-sari-pribadi",
      categoryId: "cat-sari-hobi",
      memberId: "m-sari",
      recordedByProfileId: "p-sari",
      visibility: "private" as const,
    },
    {
      id: "tx-bima-1",
      workspaceId: WS.bima,
      type: "expense" as const,
      amount: 15_000,
      occurredAt: d(month, 8),
      description: "Jajan kantin",
      accountId: "acc-bima-tabungan",
      categoryId: "cat-bima-jajan",
      memberId: "m-bima",
      recordedByProfileId: "p-bima",
      visibility: "private" as const,
    },
    {
      id: "tx-nara-1",
      workspaceId: WS.nara,
      type: "expense" as const,
      amount: 30_000,
      occurredAt: d(month, 10),
      description: "Alat tulis",
      accountId: "acc-nara-tabungan",
      categoryId: "cat-nara-jajan",
      memberId: "m-nara",
      recordedByProfileId: "p-nara",
      visibility: "private" as const,
    },
  ];
}

function seed(): Store {
  return stampWorkspaces(seedBase());
}

const globalStore = globalThis as unknown as { __airevoStore?: Store };

/**
 * Menambal data lama dengan koleksi baru.
 *
 * Berkas `.data/store.json` bisa dibuat oleh versi aplikasi sebelumnya yang
 * belum punya `orders`/`licenses`. Tanpa ini, halaman yang membaca koleksi
 * tersebut akan gagal. Koleksi yang hilang diisi dari data contoh, sedangkan
 * data yang sudah ada tidak diubah.
 */
function migrate(persisted: Partial<Store>): Store {
  const defaults = seed();
  const merged = { ...defaults, ...persisted } as Store;

  // Koleksi berbentuk array: pastikan selalu ada.
  const arrayKeys = Object.keys(defaults).filter(
    (key) => Array.isArray(defaults[key as keyof Store]),
  ) as Array<keyof Store>;

  for (const key of arrayKeys) {
    if (!Array.isArray(merged[key])) {
      (merged as Record<string, unknown>)[key as string] = defaults[key];
    }
  }

  /**
   * Data dari versi sebelum multi-ruang belum punya `workspaceId`.
   * Tanpa penambalan ini, semua query per-workspace akan mengembalikan kosong
   * dan dashboard tampak Rp0 padahal datanya ada.
   *
   * Data lama dianggap milik workspace bersama, karena begitulah dulu semua
   * data diperlakukan (satu household).
   */
  const scoped = merged as unknown as Record<string, Array<Record<string, unknown>>>;
  const sharedWorkspace =
    merged.workspaces?.find((workspace) => workspace.type === "shared")?.id ??
    WS.family;

  for (const key of SCOPED_KEYS) {
    for (const item of scoped[key] ?? []) {
      if (!item.workspaceId) item.workspaceId = sharedWorkspace;
    }
  }

  // Profil dan workspace wajib ada; kalau berkas lama belum punya, pakai contoh.
  if (!Array.isArray(merged.profiles) || merged.profiles.length === 0) {
    merged.profiles = defaults.profiles;
  }
  if (!Array.isArray(merged.workspaces) || merged.workspaces.length === 0) {
    merged.workspaces = defaults.workspaces;
  }
  if (!Array.isArray(merged.workspaceMembers) || merged.workspaceMembers.length === 0) {
    merged.workspaceMembers = defaults.workspaceMembers;
  }

  return merged;
}

/**
 * Data aplikasi.
 *
 * Urutan pemuatan:
 *
 * 1. **Postgres** (bila `DATABASE_URL` terisi) — diisi lebih dulu oleh
 *    `hydrateStore()` saat server mulai.
 * 2. **Berkas lokal** `.data/store.json` — untuk pengembangan tanpa database.
 * 3. **Data contoh** — bila keduanya kosong.
 *
 * Setiap mutasi memanggil `saveStore()`.
 */
export function getStore(): Store {
  if (!globalStore.__airevoStore) {
    const persisted = readPersisted<Partial<Store>>();
    globalStore.__airevoStore = persisted ? migrate(persisted) : seed();
  }
  return globalStore.__airevoStore;
}

/**
 * Memuat data dari Postgres ke memori.
 *
 * Dipanggil sekali dari `instrumentation.ts` sebelum server melayani permintaan,
 * sehingga `getStore()` tetap sinkron di seluruh aplikasi.
 *
 * Mengembalikan `true` bila data dari database dipakai. Bila database kosong,
 * data contoh ditanam ke database agar instalasi baru langsung punya isi.
 */
export async function hydrateStore(): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;

  try {
    const loaded = await loadStore();

    if (!loaded) {
      // Instalasi baru: tanam data contoh supaya aplikasi tidak kosong.
      globalStore.__airevoStore = seed();
      await persistStore(globalStore.__airevoStore);
      return true;
    }

    globalStore.__airevoStore = migrate(loaded);
    /*
     * migrate() menambal field yang belum ada di database (mis. `workspaceId`),
     * sehingga sidik jari di memori tidak lagi sama dengan baris tersimpan.
     * Tanpa penandaan ulang, penyimpanan berikutnya menulis ulang seluruh
     * koleksi — belasan detik karena satu round trip per baris ke Neon.
     */
    markStoreAsPersisted(globalStore.__airevoStore);
    return true;
  } catch (error) {
    console.error(
      "[store] gagal memuat dari Postgres; memakai penyimpanan lokal.",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Menyimpan perubahan.
 *
 * Saat Postgres aktif, hanya database yang ditulis. Menulis keduanya membuat
 * dua sumber kebenaran yang bisa berbeda diam-diam — mis. database sudah punya
 * data terbaru sementara berkas tertinggal. Berkas lokal tetap dipakai sebagai
 * penyimpanan utama hanya saat tidak ada database.
 */
export function saveStore(): void {
  const store = getStore();

  if (!isDatabaseEnabled()) {
    writePersisted(store);
  }

  enqueuePersist(store);
}

/**
 * Antrean penulisan database.
 *
 * `saveStore()` dipanggil dari kode sinkron, sementara tulis ke Postgres
 * asinkron. Antrean ini memastikan penulisan berjalan berurutan, bukan
 * bersamaan — dua penulisan bersamaan pada entitas yang sama bisa saling
 * menimpa.
 */
let persistQueue: Promise<void> = Promise.resolve();

function enqueuePersist(store: Store): void {
  if (!isDatabaseEnabled()) return;

  persistQueue = persistQueue
    .then(() => persistStore(store))
    .catch((error: unknown) => {
      console.error(
        "[store] gagal menyimpan ke Postgres:",
        error instanceof Error ? error.message : error,
      );
    });

  /*
   * Di Vercel, fungsi boleh dihentikan begitu respons terkirim. Tanpa penjaga
   * ini, penulisan yang masih berjalan terputus di tengah query dan mutasi
   * pengguna hilang tanpa jejak — pesanan, transaksi, dan pesan kontak.
   * `after()` meminta platform menahan fungsi sampai penulisan selesai.
   *
   * Di luar siklus permintaan (test, skrip) `after()` melempar; abaikan saja,
   * pemanggil tetap bisa menunggu lewat `flushStore()`.
   */
  try {
    after(() => persistQueue);
  } catch {
    /* bukan bagian dari permintaan */
  }
}

/** Menunggu seluruh penulisan database selesai. Dipakai saat mematikan server dan di test. */
export async function flushStore(): Promise<void> {
  await persistQueue;
}

/** Kembalikan ke data contoh dan hapus simpanan lokal. */
export function resetStore(): void {
  globalStore.__airevoStore = seed();
  writePersisted(globalStore.__airevoStore);
  forgetKnownState();
  enqueuePersist(globalStore.__airevoStore);
}

/** Hapus simpanan lokal tanpa mengubah data di memori. */
export function resetPersisted(): void {
  clearPersisted();
  globalStore.__airevoStore = seed();
  writePersisted(globalStore.__airevoStore);
  forgetKnownState();
  enqueuePersist(globalStore.__airevoStore);
}
