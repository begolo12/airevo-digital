import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** scrypt dengan salt acak. Format: scrypt$<salt hex>$<hash hex> */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  if (!salt || !expected) return false;

  const actual = scryptSync(password, salt, KEY_LENGTH);
  const expectedBuf = Buffer.from(expected, "hex");
  if (expectedBuf.length !== actual.length) return false;

  return timingSafeEqual(actual, expectedBuf);
}

/* ---------------------------------- PIN ---------------------------------- */

/** PIN hanya angka, 4–6 digit. */
export const PIN_PATTERN = /^\d{4,6}$/;

/**
 * Hash PIN profil.
 *
 * Memakai format yang sama dengan kata sandi (scrypt + salt), tetapi dengan
 * jumlah iterasi lebih ringan karena PIN hanya 4–6 angka dan harus cepat
 * diverifikasi. Kekuatan PIN tetap dibatasi panjangnya — lihat catatan di
 * docs/20-ux-aplikasi.md tentang batas keamanan PIN.
 */
export function hashPin(pin: string): string {
  return hashPassword(`pin:${pin}`);
}

export function verifyPin(pin: string, stored?: string): boolean {
  if (!stored) return false;
  if (!PIN_PATTERN.test(pin)) return false;
  return verifyPassword(`pin:${pin}`, stored);
}
