import type { ReactNode } from "react";

/**
 * Ikon garis 20×20 untuk navigasi dan tombol.
 *
 * Semua ikon digambar dengan `currentColor` agar otomatis mengikuti warna teks.
 * Sengaja tidak memakai library ikon: bundel tetap kecil dan gayanya konsisten
 * dengan arah desain "Meja Dapur".
 */
export type IconName =
  | "home"
  | "wallet"
  | "receipt"
  | "bank"
  | "tag"
  | "target"
  | "chart"
  | "calendar"
  | "check"
  | "check2"
  | "cart"
  | "file"
  | "heart"
  | "book"
  | "users"
  | "settings"
  | "handshake"
  | "building"
  | "package"
  | "search"
  | "plus"
  | "chevron-down"
  | "chevron-right"
  | "menu"
  | "close"
  | "logout"
  | "grid"
  | "command"
  | "sparkle"
  | "arrow-left"
  | "arrow-right"
  | "external"
  | "copy"
  | "trash"
  | "pencil"
  | "download"
  | "upload"
  | "paperclip"
  | "filter"
  | "info"
  | "alert"
  | "star"
  | "clock"
  | "lock"
  | "user"
  | "mail"
  | "phone"
  | "shield"
  | "trend-up"
  | "trend-down"
  | "minus"
  | "repeat"
  | "list"
  | "moon"
  | "sun"
  | "density";

const paths: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" />,
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M16 14.5h2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
    </>
  ),
  tag: (
    <>
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.6" />
    </>
  ),
  chart: <path d="M4 20V4M4 20h16M8 16V9M12.5 16v-4M17 16V6" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  check: (
    <>
      <path d="M4 12.5 9 17.5 20 6.5" />
    </>
  ),
  cart: (
    <>
      <circle cx="9.5" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
      <path d="M3 4h2.2l2.3 10.5h10.2L20 8H6" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M14 3v5h5" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z" />,
  book: (
    <>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h13v17H6a2 2 0 0 0-2 2z" />
      <path d="M4 18.5h15" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 20a5.4 5.4 0 0 0-2-4.2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  handshake: <path d="M3 12l4-4 3 3 2-2 4 4-3 3-2-2-3 3zM15 9l3 3M6 15l-3-3" />,
  building: (
    <>
      <path d="M5 21V4h9v17M14 9h5v12M3 21h18" />
      <path d="M8 8h3M8 12h3M8 16h3" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  "chevron-down": <path d="M6 9.5l6 6 6-6" />,
  "chevron-right": <path d="M9.5 6l6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  logout: (
    <>
      <path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
      <path d="M17 8.5 20.5 12 17 15.5M20.5 12H10" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </>
  ),
  command: <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />,
  sparkle: (
    <>
      <path d="M12 3.5l1.8 4.9 4.9 1.8-4.9 1.8L12 16.9l-1.8-4.9L5.3 10.2l4.9-1.8z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),

  /* Navigasi */
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,

  /* Aksi */
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a1 1 0 0 1 1-1h9" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M10 11v5M14 11v5" />,
  pencil: <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5zM13.5 6.5l4 4" />,
  download: <path d="M12 4v11M7.5 11L12 15.5 16.5 11M4 19h16" />,
  upload: <path d="M12 20V9M7.5 13L12 8.5 16.5 13M4 5h16" />,
  paperclip: <path d="M20 11.5l-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.9 7.9a1.5 1.5 0 0 1-2.2-2.2l7.1-7.1" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  minus: <path d="M5 12h14" />,
  repeat: <path d="M4 10a6 6 0 0 1 6-6h8M18 14a6 6 0 0 1-6 6H4M15 1l3 3-3 3M9 17l-3 3 3 3" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,

  /* Status */
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.5l8.5 15H3.5z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  check2: <path d="M4.5 12.5l5 5 10-11" />,
  star: <path d="M12 4l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  shield: <path d="M12 3.5l7 3v5.5c0 4.4-3 7.6-7 8.5-4-.9-7-4.1-7-8.5V6.5z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  "trend-up": <path d="M4 16.5l5.5-5.5 3.5 3.5L20 7M20 7h-5M20 7v5" />,
  "trend-down": <path d="M4 7.5L9.5 13l3.5-3.5L20 16.5M20 16.5h-5M20 16.5v-5" />,

  /* Orang & kontak */
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  phone: <path d="M7 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 5 5.5a2 2 0 0 1 2-2z" />,

  /* Tampilan */
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </>
  ),
  density: <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
};

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
