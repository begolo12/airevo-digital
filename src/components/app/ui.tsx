import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0">
        {eyebrow ? <p className="label-eyebrow mb-1.5">{eyebrow}</p> : null}
        <h1 className="text-[clamp(1.6rem,3.4vw,2.15rem)] leading-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * Kartu angka ringkas.
 *
 * Ukuran angka memakai `clamp()` berbasis lebar viewport, bukan nilai tetap.
 * Dengan 13 karakter ("Rp636.070.000"), ukuran tetap 1.65rem membutuhkan
 * ~199px sementara ruang kartu hanya ~184px — angkanya meluber ke tepi kanan.
 * `clamp()` mengecilkan angka saat kartu menyempit sehingga selalu ada udara
 * di kanan, dan tetap besar saat kartu lebar.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "paper",
  delta,
  size = "md",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "paper" | "butter" | "mint" | "sky" | "tomato" | "ink";
  delta?: { value: string; direction: "up" | "down" | "flat"; good?: boolean };
  size?: "sm" | "md" | "lg";
}) {
  const tones = {
    paper: "bg-card border-line",
    butter: "bg-butter/55 border-butter-deep",
    mint: "bg-mint/50 border-mint-deep",
    sky: "bg-sky/45 border-sky-deep",
    tomato: "bg-tomato/10 border-tomato/35",
    ink: "bg-emphasis text-on-emphasis border-emphasis",
  } as const;

  const isInk = tone === "ink";

  // `lg` dipakai saat kartu memang lebar (mis. satu baris penuh).
  const valueSize = {
    sm: "text-[clamp(1rem,1.05vw,1.15rem)]",
    md: "text-[clamp(1.2rem,1.5vw,1.5rem)]",
    lg: "text-[clamp(1.6rem,2.6vw,2.3rem)]",
  } as const;

  return (
    <div className={`min-w-0 rounded-[14px] border p-4 sm:p-5 ${tones[tone]}`}>
      <p
        className={`text-xs font-bold uppercase tracking-[0.13em] ${
          isInk ? "text-on-emphasis/70" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 leading-[1.05] font-black tracking-[-0.02em] tnum ${valueSize[size]} ${
          isInk ? "text-on-emphasis" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={`mt-1.5 text-xs leading-snug ${
            isInk ? "text-on-emphasis/70" : "text-muted"
          }`}
        >
          {hint}
        </p>
      ) : null}
      {delta ? (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${
            delta.direction === "flat"
              ? isInk
                ? "text-on-emphasis/70"
                : "text-muted"
              : delta.good
                ? "text-positive"
                : "text-danger"
          }`}
        >
          <span aria-hidden="true">
            {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "■"}
          </span>
          {delta.value}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Baris metrik ringkas dalam satu kartu.
 *
 * Menggantikan empat kartu terpisah untuk angka-angka yang saling menjelaskan
 * (aset, utang, piutang). Satu kartu lebar memberi setiap angka ruang lega,
 * menghapus tiga kotak yang isinya cuma satu baris, dan membuat hubungan
 * antar-angka terbaca sebagai satu kalimat, bukan empat kotak terpisah.
 */
export function MetricStrip({
  items,
  className,
}: {
  items: Array<{
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "positive" | "negative" | "muted";
  }>;
  className?: string;
}) {
  const tones = {
    default: "text-ink",
    positive: "text-positive",
    negative: "text-danger",
    muted: "text-muted",
  } as const;

  return (
    <div
      className={`grid divide-line rounded-[14px] border border-line bg-card sm:divide-x ${
        items.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
      } ${className ?? ""}`}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`min-w-0 px-4 py-3.5 ${
            index > 0 ? "border-t border-line sm:border-t-0" : ""
          }`}
        >
          <p className="text-2xs font-bold uppercase tracking-[0.13em] text-muted">
            {item.label}
          </p>
          <p
            className={`mt-1 text-[clamp(0.95rem,1.15vw,1.15rem)] font-black leading-tight tnum ${
              tones[item.tone ?? "default"]
            }`}
          >
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-0.5 text-xs leading-snug text-muted">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({
  ratio,
  tone = "mint",
  label,
}: {
  ratio: number;
  tone?: "mint" | "butter" | "tomato" | "sky" | "ink";
  label?: string;
}) {
  const tones = {
    mint: "bg-mint-deep",
    butter: "bg-butter-deep",
    tomato: "bg-tomato",
    sky: "bg-sky-deep",
    ink: "bg-emphasis text-on-emphasis",
  } as const;

  const clamped = Math.max(0, Math.min(ratio, 100));

  /*
   * Nama aksesibel wajib ada.
   *
   * `role="progressbar"` tanpa nama membuat pembaca layar mengumumkan
   * "progressbar" tanpa menjelaskan apa yang diukur — tidak berguna.
   * Pemanggil boleh memberi label yang spesifik ("Anggaran Belanja Dapur"),
   * tetapi label bisa kosong saat data tidak lengkap: pengeluaran tanpa
   * kategori menghasilkan `label={row.category?.name}` yang `undefined`.
   *
   * Karena itu ada nilai cadangan yang tetap informatif: persentasenya.
   */
  const accessibleName = label?.trim() || `Progres ${Math.round(ratio)}%`;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ratio)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={accessibleName}
      className="h-2 w-full overflow-hidden rounded-full bg-paper-deep"
    >
      <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Amount({
  value,
  tone = "default",
  size = "md",
}: {
  value: string;
  tone?: "default" | "positive" | "negative" | "muted";
  size?: "sm" | "md" | "lg";
}) {
  const tones = {
    default: "text-ink",
    positive: "text-positive",
    negative: "text-danger",
    muted: "text-muted",
  } as const;
  const sizes = { sm: "text-xs", md: "text-sm", lg: "text-base" } as const;
  return (
    <span className={`tnum font-semibold ${tones[tone]} ${sizes[size]}`}>{value}</span>
  );
}

/**
 * Kartu dasar.
 *
 * Padding memakai token `--card-padding` supaya mode kepadatan berlaku di
 * seluruh aplikasi tanpa menyentuh setiap pemakaian.
 */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    /*
     * `min-w-0` wajib ada.
     *
     * Sebagai anak flex atau grid, lebar minimum sebuah elemen secara default
     * adalah `min-content` — bukan nol. Untuk kartu yang berisi teks
     * `truncate` (yang memakai `white-space: nowrap`), `min-content` sama
     * dengan lebar teks tanpa dipotong. Akibatnya kartu menolak menyusut dan
     * mendorong halaman melebar di layar sempit.
     *
     * `min-w-0` mengizinkan kartu menyusut, sehingga `truncate` benar-benar
     * memotong teks dengan elipsis seperti maksudnya.
     */
    <div
      className={`min-w-0 rounded-[14px] border border-line bg-card ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  hint,
}: {
  title: string;
  action?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4" style={{ paddingBlock: "calc(var(--card-padding) * 0.8)" }}>
      <div className="min-w-0 flex-1">
        <h2 className="text-md font-bold">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Baris daftar di dalam kartu.
 *
 * Tingginya mengikuti `--row-height`, jadi mode kepadatan memadatkan seluruh
 * daftar sekaligus.
 */
export function ListRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 px-4 sm:px-5 ${className ?? ""}`}
      style={{ minHeight: "var(--row-height)" }}
    >
      {children}
    </li>
  );
}
