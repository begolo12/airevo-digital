import "server-only";

import { site } from "@/config/site";

export type ContactPayload = {
  name: string;
  email: string;
  need: string;
  budget?: string;
  message: string;
};

/**
 * Mengirim email kontak lewat Resend REST API bila `RESEND_API_KEY` tersedia.
 *
 * Tanpa API key (mis. saat pengembangan lokal), fungsi mengembalikan `false`
 * dan pesan tetap disimpan di store sehingga bisa dilihat di halaman pengaturan.
 * Tidak ada dependency tambahan: cukup `fetch`.
 */
export async function sendContactEmail(payload: ContactPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO ?? site.email;

  if (!apiKey) {
    console.info(
      "[contact] RESEND_API_KEY belum diisi — pesan disimpan di outbox lokal.",
    );
    return false;
  }

  const body = {
    from: process.env.CONTACT_EMAIL_FROM ?? `Airevo Digital <onboarding@resend.dev>`,
    to: [to],
    reply_to: payload.email,
    subject: `Pesan baru: ${payload.need} — ${payload.name}`,
    text: [
      `Nama: ${payload.name}`,
      `Email: ${payload.email}`,
      `Kebutuhan: ${payload.need}`,
      payload.budget ? `Budget: ${payload.budget}` : null,
      "",
      payload.message,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("[contact] Resend menolak permintaan:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[contact] gagal menghubungi Resend:", error);
    return false;
  }
}
