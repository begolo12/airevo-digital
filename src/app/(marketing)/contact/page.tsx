import type { Metadata } from "next";
import { Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm } from "@/components/ui/action-form";
import { submitContact } from "@/lib/data/actions";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Kontak",
  description:
    "Ceritakan pekerjaan yang ingin dirapikan. Balasan dalam 1–2 hari kerja.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="label-eyebrow">Kontak</p>
          <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02]">
            Ceritakan pekerjaan yang ingin dirapikan.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Isi form di samping, atau email langsung. Saya biasanya membalas dalam{" "}
            {site.responseTime}.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-[14px] border border-line-strong bg-card p-5">
              <p className="label-eyebrow">Email</p>
              <a
                href={`mailto:${site.email}`}
                className="mt-1 block text-base font-semibold text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-tomato"
              >
                {site.email}
              </a>
            </div>
            <div className="rounded-[14px] border border-line bg-card/60 p-5">
              <p className="label-eyebrow">Yang membantu saya membalas cepat</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                <li>Proses yang sekarang masih manual</li>
                <li>Siapa yang akan memakai aplikasinya</li>
                <li>Target waktu, kalau ada</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="note p-6 sm:p-8">
          <h2 className="text-lg">Form kontak</h2>
          <p className="mt-1 text-sm text-muted">
            Saya membalas langsung ke email Anda, biasanya dalam {site.responseTime}.
          </p>

          <div className="mt-6">
            <ActionForm action={submitContact} submitLabel="Kirim pesan" className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama">
                  <input name="name" required maxLength={100} className={inputClass} placeholder="Nama Anda" />
                </Field>
                <Field label="Email">
                  <input name="email" type="email" required maxLength={160} className={inputClass} placeholder="nama@email.com" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jenis kebutuhan">
                  <select name="need" className={selectClass} defaultValue="Web app">
                    <option value="Web app">Web app</option>
                    <option value="Internal tools">Internal tools</option>
                    <option value="Sistem keuangan">Sistem keuangan</option>
                    <option value="Integrasi">Integrasi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </Field>
                <Field label="Budget (opsional)">
                  <select name="budget" className={selectClass} defaultValue="">
                    <option value="">— belum ditentukan —</option>
                    <option value="< 10 juta">&lt; 10 juta</option>
                    <option value="10–25 juta">10–25 juta</option>
                    <option value="25–50 juta">25–50 juta</option>
                    <option value="> 50 juta">&gt; 50 juta</option>
                  </select>
                </Field>
              </div>
              <Field label="Pesan" hint="Minimal 10 karakter. Semakin spesifik, semakin cepat saya bisa menilai.">
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={6}
                  className={`${inputClass} h-auto py-2.5`}
                  placeholder="Saat ini kami mencatat pesanan lewat WhatsApp dan spreadsheet…"
                />
              </Field>
            </ActionForm>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted">
            Dengan mengirim pesan, Anda setuju data yang dikirim dipakai hanya untuk
            membalas percakapan ini.
          </p>
        </div>
      </div>
    </div>
  );
}
