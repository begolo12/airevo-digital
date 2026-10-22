"use client";

import type { ReactNode } from "react";
import { CommandPalette } from "./command-palette";

/**
 * Tambahan khusus aplikasi Keluarga.
 *
 * Toast dan Confirm dipasang di root layout karena juga dipakai halaman publik
 * (mis. form kontak). Di sini hanya command palette yang butuh data peran.
 */
export function AppProviders({
  role,
  children,
}: {
  role: string;
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <CommandPalette role={role} />
    </>
  );
}
