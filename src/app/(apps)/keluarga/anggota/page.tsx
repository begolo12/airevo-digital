import { redirect } from "next/navigation";

/**
 * Kelola anggota kini terpusat di Pengaturan.
 *
 * Halaman ini dulu berisi form tambah anggota sendiri. Setelah Pengaturan
 * punya pengelola anggota lengkap (tambah, ubah, nonaktifkan, hapus), dua
 * tempat untuk hal yang sama justru membingungkan. Rute lama tetap hidup agar
 * tautan dan markah buku tidak rusak.
 */
export default function AnggotaPage() {
  redirect("/keluarga/pengaturan");
}
