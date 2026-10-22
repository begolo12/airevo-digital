export type Role = "owner" | "adult" | "teen" | "child" | "viewer";
export type Visibility = "household" | "shared" | "private";

/* ------------------------------- profil ---------------------------------- */

/**
 * Profil = orang yang memakai aplikasi, seperti profil di layanan streaming.
 *
 * Satu akun pembeli (email + kata sandi) bisa punya beberapa profil. Setiap
 * profil punya PIN sendiri dan ruang datanya sendiri, sehingga anggota keluarga
 * bisa berbagi satu pembelian tanpa saling melihat catatan pribadi.
 */
export type Profile = {
  id: string;
  /** Akun pembeli pemilik profil ini. */
  accountId: string;
  name: string;
  /** Inisial untuk avatar. */
  initial: string;
  role: Role;
  /** PIN 4–6 angka, disimpan sebagai hash. Kosong = tanpa PIN. */
  pinHash?: string;
  color: string;
  birthDate?: string;
  /** Profil pemilik akun; boleh mengelola profil lain. */
  isAccountOwner: boolean;
  createdAt: string;
};

/* ------------------------------ workspace -------------------------------- */

/**
 * Ruang data.
 *
 * - `personal` — satu per profil, hanya pemiliknya.
 * - `shared`   — dibuat satu profil lalu diundang ke profil lain. Maksimal
 *                `MAX_SHARED_WORKSPACES` per profil.
 */
export type WorkspaceType = "personal" | "shared";

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  /** Profil yang membuat. Untuk `personal`, sama dengan pemilik. */
  ownerProfileId: string;
  /** Kode undangan singkat, hanya untuk workspace `shared`. */
  inviteCode?: string;
  color: string;
  createdAt: string;
};

export type WorkspaceMember = {
  workspaceId: string;
  profileId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
};

/** Batas workspace bersama per profil, sesuai janji lisensi. */
export const MAX_SHARED_WORKSPACES = 2;

export type Member = {
  id: string;
  name: string;
  relationship: "self" | "spouse" | "child" | "parent" | "sibling" | "other";
  role: Role;
  birthDate?: string;
  color: string;
  active: boolean;
};

export type AccountType = "cash" | "bank" | "ewallet" | "savings";
export type Account = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  ownerMemberId?: string;
  color: string;
  isShared: boolean;
  archived: boolean;
};

export type CategoryKind = "income" | "expense";
export type Category = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  name: string;
  kind: CategoryKind;
  color: string;
  archived: boolean;
};

export type TxType = "income" | "expense" | "transfer";
export type Transaction = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  type: TxType;
  amount: number;
  occurredAt: string;
  description: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  memberId?: string;
  /** Profil yang mencatat. Ditampilkan sebagai "dicatat oleh …". */
  recordedByProfileId?: string;
  visibility: Visibility;
  voidedAt?: string;
  /**
   * Aturan berulang yang membuat transaksi ini, bila ada.
   *
   * Dipakai untuk menautkan transaksi hasil pembuatan otomatis ke aturannya,
   * sehingga pengguna bisa melihat asalnya dan mencegah duplikat.
   */
  recurringRuleId?: string;
  /** Kunci objek lampiran (foto struk) di Object Storage, bila ada. */
  attachmentKey?: string;
  /** Nama berkas asli, untuk ditampilkan. */
  attachmentName?: string;
};

/** Frekuensi pengulangan transaksi. */
export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

/**
 * Aturan transaksi berulang.
 *
 * Menyimpan **cetakan** transaksi (jenis, jumlah, akun, kategori) beserta
 * jadwalnya. Transaksi sungguhan dibuat saat jadwalnya tiba, bukan di muka —
 * supaya saldo tidak berubah untuk transaksi yang belum terjadi.
 *
 * `nextAt` adalah satu-satunya penanda kemajuan. Setiap kali transaksi dibuat,
 * `nextAt` dimajukan satu periode. Karena itu pembuatan bersifat **idempoten**:
 * memanggilnya dua kali pada hari yang sama tidak menghasilkan dua transaksi.
 */
export type RecurringRule = {
  id: string;
  workspaceId?: string;
  recordedByProfileId?: string;
  type: TxType;
  amount: number;
  description: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  memberId?: string;
  visibility: Visibility;
  frequency: RecurrenceFrequency;
  /** Tanggal pembuatan pertama (ISO). */
  startAt: string;
  /** Tanggal pembuatan berikutnya (ISO). Selalu ≥ startAt. */
  nextAt: string;
  /** Bila diisi, tidak ada transaksi baru setelah tanggal ini. */
  endAt?: string;
  /** Aturan yang dimatikan tidak membuat transaksi lagi. */
  active: boolean;
  createdAt: string;
};

export type Budget = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  categoryId: string;
  month: string;
  amount: number;
};

export type BillFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly"
  | "once";

export type Bill = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  name: string;
  amount: number;
  categoryId?: string;
  accountId?: string;
  frequency: BillFrequency;
  dueDay: number;
  nextDueDate: string;
  reminderDaysBefore: number;
  status: "active" | "paused" | "ended";
  /**
   * Pembagian beban antar anggota.
   *
   * Kosong berarti tagihan tidak dibagi — seluruhnya ditanggung pembayar.
   * Bila diisi, `shares` menjelaskan siapa menanggung berapa.
   */
  split?: {
    mode: "equal" | "weighted" | "custom";
    shares: Array<{ memberId: string; amount: number }>;
  };
};

export type BillPayment = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  billId: string;
  dueDate: string;
  paidAt: string;
  amount: number;
  transactionId?: string;
  status: "paid" | "skipped";
};

export type GoalType =
  | "emergency_fund"
  | "education"
  | "home"
  | "vehicle"
  | "retirement"
  | "hajj"
  | "wedding"
  | "vacation"
  | "custom";

export type Goal = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  targetDate?: string;
  savedAmount: number;
  accountId?: string;
  memberId?: string;
  visibility: Visibility;
  status: "active" | "achieved" | "paused";
};

export type GoalContribution = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  goalId: string;
  amount: number;
  contributedAt: string;
  note?: string;
};

export type EventType =
  | "birthday"
  | "anniversary"
  | "school"
  | "medical"
  | "family"
  | "other";

export type FamilyEvent = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  title: string;
  type: EventType;
  date: string;
  time?: string;
  allDay: boolean;
  location?: string;
  memberId?: string;
  recurrence: "none" | "yearly" | "monthly" | "weekly";
  notes?: string;
};

export type Chore = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  title: string;
  assigneeMemberId?: string;
  frequency: "once" | "daily" | "weekly" | "monthly";
  dueDate?: string;
  status: "todo" | "doing" | "done";
  points: number;
};

export type ShoppingItem = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  name: string;
  qty: number;
  unit: string;
  estimatedPrice: number;
  actualPrice?: number;
  checked: boolean;
  categoryId?: string;
};

export type Household = {
  name: string;
  currency: "IDR";
  timezone: string;
};

/* ------------------------------- fase C ---------------------------------- */

export type DebtType = "payable" | "receivable";
export type Debt = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  type: DebtType;
  counterparty: string;
  principal: number;
  remaining: number;
  interestRate?: number;
  installmentAmount?: number;
  dueDate?: string;
  status: "active" | "paid" | "written_off";
  notes?: string;
};

export type AssetType =
  | "cash"
  | "property"
  | "vehicle"
  | "gold"
  | "investment"
  | "other";

export type Asset = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  name: string;
  type: AssetType;
  acquisitionValue?: number;
  currentValue: number;
  acquiredAt?: string;
  notes?: string;
};

export type InsuranceType = "health" | "life" | "vehicle" | "property" | "other";
export type Insurance = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  type: InsuranceType;
  provider: string;
  memberId?: string;
  policyNumber?: string;
  premium: number;
  period: "monthly" | "quarterly" | "yearly";
  nextDueDate?: string;
  coverage?: string;
  status: "active" | "lapsed" | "cancelled";
};

export type DocumentCategory =
  | "identity"
  | "education"
  | "insurance"
  | "property"
  | "health"
  | "other";

export type FamilyDocument = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  title: string;
  category: DocumentCategory;
  memberId?: string;
  documentNumber?: string;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  fileName?: string;
  /**
   * Kunci objek di Object Storage, mis. `ws-family/doc-1.pdf`.
   *
   * Kosong berarti dokumen hanya dicatat, belum ada berkasnya. Kunci selalu
   * diawali `workspaceId/` supaya berkas satu ruang tidak bisa diakses ruang
   * lain — lihat `keyBelongsToWorkspace()`.
   */
  fileKey?: string;
  /** Ukuran berkas dalam byte, untuk ditampilkan tanpa membuka berkasnya. */
  fileSize?: number;
  visibility: Visibility;
  notes?: string;
};

export type HealthRecordType =
  | "allergy"
  | "condition"
  | "medication"
  | "immunization"
  | "checkup"
  | "other";

export type HealthRecord = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  memberId: string;
  type: HealthRecordType;
  title: string;
  recordedAt: string;
  nextAt?: string;
  notes?: string;
  visibility: "private" | "household";
};

export type EducationLevel = "paud" | "sd" | "smp" | "sma" | "kuliah" | "lainnya";

export type EducationRecord = {
  id: string;
  /** Ruang data pemilik entri. Kosong = data lama sebelum multi-ruang. */
  workspaceId?: string;
  /** Profil yang membuat catatan ini. */
  recordedByProfileId?: string;
  memberId: string;
  school: string;
  level: EducationLevel;
  academicYear: string;
  annualCost?: number;
  goalId?: string;
  notes?: string;
};

/* --------------------------------- users --------------------------------- */

export type UserRole = "owner" | "adult" | "teen" | "child" | "viewer";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  memberId: string;
  role: UserRole;
  createdAt: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  need: string;
  budget?: string;
  message: string;
  createdAt: string;
  delivered: boolean;
  provider: "resend" | "outbox";
};

/* ------------------------------- penjualan -------------------------------- */

/** Status pesanan. `pending` = menunggu pembayaran. */
export type OrderStatus = "pending" | "paid" | "cancelled" | "expired";

/** Penyedia pembayaran. `manual` dipakai selama gateway belum aktif. */
export type PaymentProviderId = "manual" | "xendit" | "midtrans";

/** Cara pembeli menyelesaikan pembayaran. */
export type PaymentMethod = "bank_transfer" | "qris" | "redirect";

export type Order = {
  id: string;
  /** Kode pendek untuk dibaca manusia, mis. ARV-2K7Q. */
  code: string;
  productId: string;
  productName: string;
  buyerName: string;
  email: string;
  whatsapp?: string;
  amount: number;
  status: OrderStatus;
  provider: PaymentProviderId;
  method: PaymentMethod;
  /** Nomor referensi dari gateway. Kosong untuk provider manual. */
  providerRef?: string;
  /** Instruksi pembayaran yang ditampilkan ke pembeli. */
  instructions?: string[];
  /** Rekening tujuan untuk transfer manual. */
  bankAccount?: { bank: string; number: string; holder: string };
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  note?: string;
};

/**
 * Lisensi = hak pakai produk setelah pesanan lunas.
 *
 * Model "sekali beli, akses seumur hidup": tidak ada `expiresAt`.
 * Lisensi hanya bisa dicabut manual (`revokedAt`), misalnya saat refund.
 */
export type ProductLicense = {
  id: string;
  orderId: string;
  productId: string;
  /** Kunci lisensi yang diberikan ke pembeli. */
  key: string;
  /** Email pemilik lisensi, sekaligus kunci pencocokan saat login. */
  email: string;
  status: "active" | "revoked";
  issuedAt: string;
  revokedAt?: string;
  note?: string;
};

export type Store = {
  household: Household;
  /** Akun pembeli. Satu akun = satu lisensi, bisa punya banyak profil. */
  users: User[];
  profiles: Profile[];
  workspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  members: Member[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  budgets: Budget[];
  bills: Bill[];
  billPayments: BillPayment[];
  goals: Goal[];
  contributions: GoalContribution[];
  events: FamilyEvent[];
  chores: Chore[];
  shopping: ShoppingItem[];
  debts: Debt[];
  assets: Asset[];
  insurances: Insurance[];
  documents: FamilyDocument[];
  healthRecords: HealthRecord[];
  educationRecords: EducationRecord[];
  messages: ContactMessage[];
  orders: Order[];
  licenses: ProductLicense[];
};

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};
